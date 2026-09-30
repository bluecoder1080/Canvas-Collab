/**
 * WebSocket protocol between `apps/web` and `apps/ws-backend`.
 *
 * Design notes (worth studying):
 * 1. Every message is JSON: `{ type, ...payload }`.
 * 2. Client-generated shape ids let us broadcast optimistically.
 * 3. `join` is always the first message a client sends.
 * 4. The server is dumb: it relays + keeps an in-memory copy for late joiners.
 *    Postgres is the source of truth (written on join-load + debounced save).
 */
import type { Shape } from "./shapes.js";

export type ClientMessage =
  | { type: "join"; roomId: string; username: string; color: string }
  | { type: "shape:add"; shape: Shape }
  | { type: "shape:update"; shape: Shape }
  | { type: "shape:delete"; shapeId: string }
  | { type: "shapes:clear" }
  | { type: "cursor:move"; x: number; y: number; username: string; color: string };

export type ServerMessage =
  | { type: "init"; shapes: Shape[] }
  | { type: "shape:add"; shape: Shape }
  | { type: "shape:update"; shape: Shape }
  | { type: "shape:delete"; shapeId: string }
  | { type: "shapes:clear" }
  | { type: "cursor:move"; clientId: string; x: number; y: number; username: string; color: string }
  | { type: "presence"; count: number; users: { username: string; color: string }[] }
  | { type: "error"; message: string };
