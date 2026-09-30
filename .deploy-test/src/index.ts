/**
 * Entry point. One WebSocketServer, no HTTP routes.
 *
 * Connection lifecycle:
 * 1. Client connects to ws://host:8080 (no room yet).
 * 2. Client MUST send `{ type: "join", roomId, username, color }` first.
 * 3. Server registers them in RoomManager, sends `{ type: "init", shapes }`.
 * 4. Every later message is relayed + persisted per its type.
 * 5. On close, client is removed and presence is re-broadcast.
 */
import { WebSocketServer, type WebSocket } from "ws";
import { shapeSchema, type ClientMessage } from "@repo/shared";
import { env } from "./config/env.js";
import {
  handleClear,
  handleCursor,
  handleJoin,
  handleLeave,
  handleShapeAdd,
  handleShapeDelete,
  handleShapeUpdate,
} from "./rooms/RoomManager.js";

const wss = new WebSocketServer({ port: env.port });
console.log(`[ws] listening on ws://localhost:${env.port}`);

wss.on("connection", (ws: WebSocket) => {
  let joined: { roomId: string; clientId: string } | null = null;

  ws.on("message", async (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    // --- gate: join must come first ---
    if (!joined) {
      if (msg.type !== "join" || !msg.roomId) {
        ws.send(JSON.stringify({ type: "error", message: "Send join first" }));
        return;
      }
      const clientId = await handleJoin(ws, msg.roomId, msg.username, msg.color);
      if (!clientId) {
        ws.send(JSON.stringify({ type: "error", message: "Join failed" }));
        return;
      }
      joined = { roomId: msg.roomId, clientId };
      return;
    }

    const { roomId, clientId } = joined;

    // --- relay table (validate shapes with zod before storing) ---
    switch (msg.type) {
      case "shape:add": {
        const parsed = shapeSchema.safeParse(msg.shape);
        if (!parsed.success) break;
        handleShapeAdd(roomId, clientId, parsed.data);
        break;
      }
      case "shape:update": {
        const parsed = shapeSchema.safeParse(msg.shape);
        if (!parsed.success) break;
        handleShapeUpdate(roomId, clientId, parsed.data);
        break;
      }
      case "shape:delete":
        if (typeof msg.shapeId === "string")
          handleShapeDelete(roomId, clientId, msg.shapeId);
        break;
      case "shapes:clear":
        handleClear(roomId, clientId);
        break;
      case "cursor:move":
        if (Number.isFinite(msg.x) && Number.isFinite(msg.y))
          handleCursor(roomId, clientId, msg.x, msg.y);
        break;
      case "join":
        // Re-join = ignore (already in a room on this socket).
        break;
    }
  });

  ws.on("close", () => handleLeave(ws));
  ws.on("error", () => handleLeave(ws));
});

// Graceful shutdown (Ctrl+C): close sockets, then exit.
process.on("SIGINT", () => {
  console.log("\n[ws] shutting down...");
  wss.close(() => process.exit(0));
});

// Graceful shutdown (Ctrl+C): close sockets, then exit.
