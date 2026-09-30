/**
 * PresenceBar — who is online + connection status.
 * Remote cursors themselves are painted on the canvas (see Whiteboard).
 */
"use client";

import type { PresenceUser } from "../../hooks/useCollabRoom";

export function PresenceBar({
  users,
  connected,
  roomName,
}: {
  users: PresenceUser[];
  connected: boolean;
  roomName: string;
}) {
  return (
    <div className="presence-bar">
      <span className={`dot ${connected ? "online" : "offline"}`} />
      <strong>{roomName}</strong>
      <span className="presence-count">
        {connected ? `${users.length} online` : "connecting…"}
      </span>
      <span className="presence-users">
        {users.slice(0, 8).map((u, i) => (
          <span
            key={`${u.username}-${i}`}
            className="presence-chip"
            style={{ borderColor: u.color }}
            title={u.username}
          >
            <span className="chip-color" style={{ background: u.color }} />
            {u.username}
          </span>
        ))}
      </span>
    </div>
  );
}
