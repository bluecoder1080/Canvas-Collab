/**
 * RoomManager — the heart of realtime collaboration.
 *
 * Data model:
 *   rooms: Map<roomId, RoomState>
 *   RoomState { clients: Map<clientId, ClientInfo>, shapes: Map<shapeId, Shape> }
 *
 * Key ideas for learners:
 * 1. In-memory state is a CACHE. Postgres is the source of truth.
 *    On first join we lazy-load shapes from DB; every mutation is
 *    written through to DB (fire-and-forget with error logging).
 * 2. Broadcast = send to everyone in the room EXCEPT the sender.
 *    (Sender already applied the change optimistically.)
 * 3. Last-write-wins: no OT/CRDT here. For a study project, overwriting
 *    a shape by id is simple and predictable. Concurrent edits to the
 *    SAME shape resolve to whoever wrote last.
 */
import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import type { Shape, ServerMessage } from "@repo/shared";
import {
  clearRoomShapes,
  deleteShape,
  getRoom,
  getRoomShapes,
  upsertShape,
} from "@repo/db";

export interface ClientInfo {
  id: string;
  ws: WebSocket;
  username: string;
  color: string;
}

interface RoomState {
  clients: Map<string, ClientInfo>;
  shapes: Map<string, Shape>;
  loaded: boolean;
}

const rooms = new Map<string, RoomState>();

function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = { clients: new Map(), shapes: new Map(), loaded: false };
    rooms.set(roomId, room);
  }
  return room;
}

/** Load shapes from Postgres once per room lifetime (lazy). */
async function ensureLoaded(roomId: string, room: RoomState) {
  if (room.loaded) return;
  room.loaded = true; // mark first: concurrent joins share one load
  try {
    // Auto-create the room row if a guest invented an id client-side.
    // (Landing page normally creates via HTTP, but direct links still work.)
    const existing = await getRoom(roomId);
    if (!existing) {
      const { createRoom } = await import("@repo/db");
      await createRoom(roomId, "Untitled board", null);
    }
    const shapes = await getRoomShapes(roomId);
    for (const s of shapes) room.shapes.set(s.id, s);
    console.log(`[ws] room ${roomId}: loaded ${shapes.length} shapes from DB`);
  } catch (err) {
    room.loaded = false; // retry on next join
    console.error(`[ws] room ${roomId}: DB load failed`, err);
  }
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

/** Send current user list to everyone in the room. */
function broadcastPresence(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  const users = [...room.clients.values()].map((c) => ({
    username: c.username,
    color: c.color,
  }));
  const msg: ServerMessage = { type: "presence", count: users.length, users };
  for (const c of room.clients.values()) send(c.ws, msg);
}

/** Relay a message to everyone except the sender. */
function broadcastExcept(roomId: string, exceptId: string, msg: ServerMessage) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [id, c] of room.clients) {
    if (id !== exceptId) send(c.ws, msg);
  }
}

export async function handleJoin(
  ws: WebSocket,
  roomId: string,
  username: string,
  color: string,
): Promise<string | null> {
  const room = getOrCreateRoom(roomId);
  await ensureLoaded(roomId, room);

  const clientId = randomUUID();
  const client: ClientInfo = {
    id: clientId,
    ws,
    username: username.slice(0, 60) || "Guest",
    color,
  };
  room.clients.set(clientId, client);
  (ws as unknown as { __roomId?: string; __clientId?: string }).__roomId = roomId;
  (ws as unknown as { __clientId?: string }).__clientId = clientId;

  // 1. Send full snapshot to the newcomer (they render this immediately).
  send(ws, { type: "init", shapes: [...room.shapes.values()] });
  // 2. Tell everyone (including newcomer) who is online.
  broadcastPresence(roomId);
  console.log(`[ws] ${client.username} joined ${roomId} (${room.clients.size} online)`);
  return clientId;
}

export function handleLeave(ws: WebSocket) {
  const meta = ws as unknown as { __roomId?: string; __clientId?: string };
  if (!meta.__roomId || !meta.__clientId) return;
  const room = rooms.get(meta.__roomId);
  if (!room) return;
  room.clients.delete(meta.__clientId);
  console.log(`[ws] leave ${meta.__roomId} (${room.clients.size} left)`);
  if (room.clients.size === 0) {
    // Free memory; next join reloads from Postgres. No data loss:
    // every mutation was already written through.
    rooms.delete(meta.__roomId);
    return;
  }
  broadcastPresence(meta.__roomId);
}

export function handleShapeAdd(roomId: string, senderId: string, shape: Shape) {
  const room = getOrCreateRoom(roomId);
  if (room.shapes.size >= 5000) return;
  room.shapes.set(shape.id, shape);
  broadcastExcept(roomId, senderId, { type: "shape:add", shape });
  // Write-through to Postgres (don't block the broadcast loop).
  upsertShape(roomId, shape).catch((err) =>
    console.error("[ws] persist add failed", err),
  );
}

export function handleShapeUpdate(roomId: string, senderId: string, shape: Shape) {
  const room = getOrCreateRoom(roomId);
  room.shapes.set(shape.id, shape);
  broadcastExcept(roomId, senderId, { type: "shape:update", shape });
  upsertShape(roomId, shape).catch((err) =>
    console.error("[ws] persist update failed", err),
  );
}

export function handleShapeDelete(roomId: string, senderId: string, shapeId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.shapes.delete(shapeId);
  broadcastExcept(roomId, senderId, { type: "shape:delete", shapeId });
  deleteShape(shapeId).catch((err) => console.error("[ws] delete failed", err));
}

export function handleClear(roomId: string, senderId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.shapes.clear();
  broadcastExcept(roomId, senderId, { type: "shapes:clear" });
  clearRoomShapes(roomId).catch((err) => console.error("[ws] clear failed", err));
}

export function handleCursor(
  roomId: string,
  senderId: string,
  x: number,
  y: number,
) {
  const room = rooms.get(roomId);
  const sender = room?.clients.get(senderId);
  if (!room || !sender) return;
  // Cursors are ephemeral: relay only, never persisted.
  broadcastExcept(roomId, senderId, {
    type: "cursor:move",
    clientId: senderId,
    x,
    y,
    username: sender.username,
    color: sender.color,
  });
}

export function getClientRoom(ws: WebSocket): { roomId: string; clientId: string } | null {
  const meta = ws as unknown as { __roomId?: string; __clientId?: string };
  if (!meta.__roomId || !meta.__clientId) return null;
  return { roomId: meta.__roomId, clientId: meta.__clientId };
}
