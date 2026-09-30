/**
 * Landing page: product intro + create / join a board.
 * No login required — guests get a random display name per room.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../lib/api";

export default function Home() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [error, setError] = useState("");

  const createBoard = async () => {
    setBusy(true);
    setError("");
    try {
      const { room } = await api.createRoom("Untitled board");
      router.push(`/room/${room.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach the API. Is http-backend running?",
      );
    } finally {
      setBusy(false);
    }
  };

  const joinBoard = (e: React.FormEvent) => {
    e.preventDefault();
    // Accept a full link or a bare id: ".../room/aB3xK9mQ2Z" -> "aB3xK9mQ2Z".
    const id = joinId.trim().split("/").pop() ?? "";
    if (id) router.push(`/room/${id}`);
  };

  return (
    <main className="landing">
      <nav className="landing-nav">
        <span className="logo">🎨 Canvas</span>
        <span className="nav-hint">open-source · realtime · postgres-backed</span>
      </nav>

      <section className="hero">
        <h1>
          Draw together,
          <br />
          <span className="accent">in real time.</span>
        </h1>
        <p className="subtitle">
          A shareable infinite whiteboard. No signup — create a board, send the
          link, and sketch with your team. Every stroke syncs live over
          WebSockets and persists in Postgres.
        </p>
        <div className="hero-actions">
          <button className="btn primary" onClick={createBoard} disabled={busy}>
            {busy ? "Creating…" : "＋ Create a board"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}

        <form className="join-form" onSubmit={joinBoard}>
          <input
            placeholder="Paste a board link or id…"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
          />
          <button className="btn" type="submit">
            Join →
          </button>
        </form>
      </section>

      <section className="features">
        <div className="feature">
          <h3>🖌️ 7 tools</h3>
          <p>Rect, ellipse, diamond, line, arrow, freehand pencil and text.</p>
        </div>
        <div className="feature">
          <h3>👥 Live cursors</h3>
          <p>See everyone&apos;s mouse with name flags and an online roster.</p>
        </div>
        <div className="feature">
          <h3>💾 Postgres</h3>
          <p>Every shape is a row. Reload anytime — the board is still there.</p>
        </div>
        <div className="feature">
          <h3>🔍 Pan & zoom</h3>
          <p>Infinite canvas: scroll to pan, Ctrl+scroll to zoom, H for hand.</p>
        </div>
        <div className="feature">
          <h3>🔗 Share link</h3>
          <p>One URL per board. Anyone with the link can draw — no account.</p>
        </div>
        <div className="feature">
          <h3>📖 Clean code</h3>
          <p>Turborepo + TypeScript, commented for studying. See HOW_TO_RUN.md.</p>
        </div>
      </section>

      <footer className="landing-footer">
        Canvas-Collab · Next.js + Express + ws + Postgres · MIT
      </footer>
    </main>
  );
}
