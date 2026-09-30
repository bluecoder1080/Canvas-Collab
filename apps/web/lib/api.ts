/**
 * Tiny HTTP client for the REST API (room create/load/autosave).
 * Realtime drawing goes over WebSockets — see hooks/useCollabRoom.ts.
 */
import type { Shape } from "@repo/shared";
import { config } from "./config";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${config.httpUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface Room {
  id: string;
  name: string;
}

export const api = {
  /** Create a board -> { room }. No login needed (guest-friendly). */
  createRoom(name = "Untitled board") {
    return request<{ room: Room }>("/api/rooms", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  /** Fetch board metadata (for the header title). */
  getRoom(roomId: string) {
    return request<{ room: Room }>(`/api/rooms/${roomId}`);
  },

  /** Overwrite the room snapshot (autosave fallback; WS is primary). */
  saveShapes(roomId: string, shapes: Shape[]) {
    return request<{ ok: boolean }>(`/api/rooms/${roomId}/shapes`, {
      method: "PUT",
      body: JSON.stringify({ shapes }),
    });
  },
};
