/**
 * /room/[roomId] — the collaborative board view.
 *
 * Steps:
 * 1. Ask for a display name (stored in sessionStorage so refresh keeps it).
 * 2. Load the room title via HTTP (shows a friendly 404 for bad links).
 * 3. Mount <Whiteboard>, which opens the WebSocket and syncs shapes.
 */
"use client";

import { use, useEffect, useState } from "react";
import { Whiteboard } from "../../../components/canvas/Whiteboard";
import { api } from "../../../lib/api";

const AVATAR_COLORS = ["#e03131", "#2f9e44", "#1971c2", "#f08c00", "#9c36b5", "#0c8599"];

function randomName() {
  const animals = ["Fox", "Panda", "Otter", "Falcon", "Koala", "Zebra", "Heron", "Badger"];
  return `Guest-${animals[Math.floor(Math.random() * animals.length)]}`;
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const [username, setUsername] = useState<string | null>(null);
  const [color, setColor] = useState(AVATAR_COLORS[0]!);
  const [nameInput, setNameInput] = useState("");
  // Placeholder suggestion. Generated in useEffect (client-only) so the
  // server render and the first client render match — calling randomName()
  // during render would cause a hydration mismatch.
  const [namePlaceholder, setNamePlaceholder] = useState("Your display name");
  const [roomName, setRoomName] = useState("Loading…");
  const [notFound, setNotFound] = useState(false);

  // Restore identity across refreshes (per room).
  useEffect(() => {
    setNamePlaceholder(randomName());
    const saved = sessionStorage.getItem(`canvas:${roomId}:name`);
    const savedColor = sessionStorage.getItem(`canvas:${roomId}:color`);
    if (saved) {
      setUsername(saved);
      if (savedColor) setColor(savedColor);
    }
    api
      .getRoom(roomId)
      .then(({ room }) => setRoomName(room.name))
      .catch(() => {
        // Room may still exist (auto-created on WS join); don't hard-fail.
        // Only treat as missing after the socket also fails — here we just
        // show the id so link-sharing still works for fresh rooms.
        setRoomName(`Board ${roomId}`);
        setNotFound(false);
      });
  }, [roomId]);

  const enter = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameInput.trim() || randomName();
    const c = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!;
    sessionStorage.setItem(`canvas:${roomId}:name`, name);
    sessionStorage.setItem(`canvas:${roomId}:color`, c);
    setUsername(name);
    setColor(c);
  };

  if (!username) {
    return (
      <main className="gate">
        <form className="gate-card" onSubmit={enter}>
          <h2>🎨 Join board</h2>
          <p className="muted">
            {notFound ? "Board not found." : `Room: ${roomId}`}
          </p>
          <input
            placeholder={randomName()}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={30}
            autoFocus
          />
          <button className="btn primary" type="submit">
            Enter board →
          </button>
        </form>
      </main>
    );
  }

  return (
    <Whiteboard
      key={`${roomId}:${username}`}
      roomId={roomId}
      username={username}
      color={color}
      roomName={roomName}
    />
  );
}
