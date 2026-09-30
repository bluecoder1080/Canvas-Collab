/**
 * useCollabRoom — the ONLY place that talks WebSocket.
 *
 * Responsibilities:
 * 1. Open ws://... , send `join`, receive `init` snapshot.
 * 2. Keep `shapes` state in sync (local edits + remote broadcasts).
 * 3. Track remote live cursors + online user list.
 * 4. Expose send* helpers that update LOCAL state first (optimistic UI)
 *    and then broadcast (so drawing feels instant, even with latency).
 *
 * Component code never touches `WebSocket` directly — it calls these helpers.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CURSOR_THROTTLE_MS,
  type ServerMessage,
  type Shape,
} from "@repo/shared";
import { config } from "../../lib/config";

export interface RemoteCursor {
  x: number;
  y: number;
  username: string;
  color: string;
}

export interface PresenceUser {
  username: string;
  color: string;
}

export function useCollabRoom(roomId: string, username: string, color: string) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const lastCursorSent = useRef(0);

  // Connect once per room. Username/color are fixed per mount
  // (changing display name = remount via `key` from the parent).
  useEffect(() => {
    const ws = new WebSocket(config.wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "join", roomId, username, color }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string) as ServerMessage;
      switch (msg.type) {
        case "init":
          setShapes(msg.shapes);
          break;
        case "shape:add":
          setShapes((prev) =>
            prev.some((s) => s.id === msg.shape.id) ? prev : [...prev, msg.shape],
          );
          break;
        case "shape:update":
          setShapes((prev) => prev.map((s) => (s.id === msg.shape.id ? msg.shape : s)));
          break;
        case "shape:delete":
          setShapes((prev) => prev.filter((s) => s.id !== msg.shapeId));
          break;
        case "shapes:clear":
          setShapes([]);
          break;
        case "cursor:move":
          setCursors((prev) => ({
            ...prev,
            [msg.clientId]: { x: msg.x, y: msg.y, username: msg.username, color: msg.color },
          }));
          break;
        case "presence":
          setUsers(msg.users);
          break;
        case "error":
          console.error("[ws]", msg.message);
          break;
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    // Expire stale cursors (a user who stopped moving shouldn't linger).
    const sweep = setInterval(() => setCursors({}), 5000);
    return () => {
      clearInterval(sweep);
      ws.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const send = useCallback((msg: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  // --- optimistic helpers: local state FIRST, broadcast SECOND ---
  const addShape = useCallback(
    (shape: Shape) => {
      setShapes((prev) => [...prev, shape]);
      send({ type: "shape:add", shape });
    },
    [send],
  );

  const updateShape = useCallback(
    (shape: Shape) => {
      setShapes((prev) => prev.map((s) => (s.id === shape.id ? shape : s)));
      send({ type: "shape:update", shape });
    },
    [send],
  );

  const deleteShape = useCallback(
    (shapeId: string) => {
      setShapes((prev) => prev.filter((s) => s.id !== shapeId));
      send({ type: "shape:delete", shapeId });
    },
    [send],
  );

  const clearShapes = useCallback(() => {
    setShapes([]);
    send({ type: "shapes:clear" });
  }, [send]);

  /** Replace whole snapshot (used after undo / bulk ops). */
  const replaceShapes = useCallback((next: Shape[]) => {
    setShapes(next);
  }, []);

  const sendCursor = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - lastCursorSent.current < CURSOR_THROTTLE_MS) return;
      lastCursorSent.current = now;
      send({ type: "cursor:move", x, y, username, color });
    },
    [send, username, color],
  );

  return {
    shapes,
    cursors,
    users,
    connected,
    addShape,
    updateShape,
    deleteShape,
    clearShapes,
    replaceShapes,
    sendCursor,
  };
}
