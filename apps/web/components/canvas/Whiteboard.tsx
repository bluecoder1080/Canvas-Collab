/**
 * Whiteboard — infinite canvas with realtime collaboration.
 *
 * How it works (study guide):
 * 1. `useCollabRoom` owns the shape list + WebSocket. This component owns
 *    the camera, current tool, style, selection and the in-progress draft.
 * 2. Mouse events convert screen px -> world coords (geometry.ts),
 *    then either create a draft shape (preview) or move a selection.
 * 3. On mouse-up the draft is committed via `addShape` (optimistic +
 *    broadcast). Remote shapes arrive via the hook and just re-render.
 * 4. Rendering is immediate-mode Canvas 2D: clear -> grid -> shapes ->
 *    draft -> selection -> remote cursors, every time state changes.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Shape } from "@repo/shared";
import { AUTOSAVE_INTERVAL_MS } from "@repo/shared";
import { useCollabRoom } from "../../hooks/useCollabRoom";
import { api } from "../../lib/api";
import { screenToWorld, zoomAt, type Camera } from "../../lib/canvas/geometry";
import { drawShape, hitTest, normalizeRect } from "../../lib/canvas/draw";
import { PresenceBar } from "./PresenceBar";
import { Toolbar, type Tool } from "./Toolbar";

interface Props {
  roomId: string;
  username: string;
  color: string;
  roomName: string;
}

export function Whiteboard({ roomId, username, color, roomName }: Props) {
  const {
    shapes,
    cursors,
    users,
    connected,
    addShape,
    updateShape,
    deleteShape,
    clearShapes,
    sendCursor,
  } = useCollabRoom(roomId, username, color);

  // --- local UI state (never synced) ---
  const [tool, setTool] = useState<Tool>("select");
  const [stroke, setStroke] = useState("#1e1e1e");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fill, setFill] = useState("transparent");
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;

  // In-progress shape while dragging (preview only, not yet broadcast).
  const draftRef = useRef<Shape | null>(null);
  const [, setDraftTick] = useState(0); // bump to repaint preview
  const dragRef = useRef<{
    mode: "create" | "move" | "pan";
    startWX: number;
    startWY: number;
    startSX: number;
    startSY: number;
    origShape?: Shape;
    panCam?: Camera;
  } | null>(null);
  const spaceHeld = useRef(false);

  // ============================ autosave ============================
  // WS already persists every change server-side; this HTTP snapshot is a
  // backup so a room survives even if the WS process restarts mid-session.
  useEffect(() => {
    const t = setInterval(() => {
      if (shapesRef.current.length === 0) return;
      api.saveShapes(roomId, shapesRef.current).catch(() => {});
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [roomId]);

  // ============================ rendering ============================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Camera transform: everything below is in WORLD coordinates.
    const cam = cameraRef.current;
    ctx.save();
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    ctx.lineWidth = 1 / cam.zoom; // keep grid hairline at any zoom

    // Dot grid (helps perceive pan/zoom; cheap to draw).
    const grid = 32;
    const x0 = Math.floor(cam.x / grid) * grid;
    const y0 = Math.floor(cam.y / grid) * grid;
    ctx.fillStyle = "#e5e7eb";
    for (let gx = x0; gx < cam.x + w / cam.zoom; gx += grid) {
      for (let gy = y0; gy < cam.y + h / cam.zoom; gy += grid) {
        ctx.fillRect(gx, gy, 1.5 / cam.zoom, 1.5 / cam.zoom);
      }
    }

    // Shapes (remote + local look identical — that's the point).
    for (const s of shapesRef.current) drawShape(ctx, s);

    // Draft preview (dashed outline so users see it's uncommitted).
    const draft = draftRef.current;
    if (draft) {
      ctx.save();
      ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
      drawShape(ctx, draft);
      ctx.restore();
    }

    // Selection highlight.
    if (selectedId) {
      const sel = shapesRef.current.find((s) => s.id === selectedId);
      if (sel) {
        ctx.save();
        ctx.strokeStyle = "#1971c2";
        ctx.lineWidth = 1.5 / cam.zoom;
        ctx.setLineDash([5 / cam.zoom, 4 / cam.zoom]);
        const pad = 6 / cam.zoom;
        const minX = Math.min(sel.x, sel.x + sel.w) - pad;
        const minY = Math.min(sel.y, sel.y + sel.h) - pad;
        const maxX = Math.max(sel.x, sel.x + sel.w) + pad;
        const maxY = Math.max(sel.y, sel.y + sel.h) + pad;
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.restore();
      }
    }

    // Remote live cursors (name flags).
    ctx.font = `${12 / cam.zoom}px sans-serif`;
    for (const c of Object.values(cursors)) {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5 / cam.zoom, 0, Math.PI * 2);
      ctx.fill();
      const label = c.username;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x + 8 / cam.zoom, c.y - 20 / cam.zoom, tw + 10 / cam.zoom, 18 / cam.zoom);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, c.x + 13 / cam.zoom, c.y - 7 / cam.zoom);
    }

    ctx.restore();
  }, [shapes, camera, cursors, selectedId]);

  // Repaint helper for high-frequency draft updates (mousemove).
  const repaint = useCallback(() => setDraftTick((t) => t + 1), []);

  // ============================ pointer handlers ============================
  const toWorld = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top, cameraRef.current);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) return; // middle button: browser handles via wheel-pan below
    const { x: wx, y: wy } = toWorld(e);
    const cam = cameraRef.current;

    // Pan mode: hand tool OR space held OR middle-drag intent.
    if (tool === "hand" || spaceHeld.current || e.button === 1) {
      dragRef.current = { mode: "pan", startWX: wx, startWY: wy, panCam: { ...cam } };
      return;
    }

    if (tool === "select") {
      // Topmost shape first (iterate from the end).
      const hit = [...shapesRef.current].reverse().find((s) => hitTest(s, wx, wy));
      if (hit) {
        setSelectedId(hit.id);
        dragRef.current = { mode: "move", startWX: wx, startWY: wy, origShape: { ...hit } };
      } else {
        setSelectedId(null);
      }
      return;
    }

    if (tool === "eraser") {
      const hit = [...shapesRef.current].reverse().find((s) => hitTest(s, wx, wy));
      if (hit) {
        deleteShape(hit.id);
        if (selectedId === hit.id) setSelectedId(null);
      }
      return;
    }

    if (tool === "text") {
      const text = window.prompt("Enter text:");
      if (text) {
        addShape({
          id: crypto.randomUUID(),
          kind: "text",
          x: wx,
          y: wy,
          w: text.length * 10,
          h: 24,
          stroke,
          strokeWidth,
          fill: "transparent",
          text,
          createdBy: username,
        });
      }
      return;
    }

    // Shape tools: begin draft.
    const kind = tool as Shape["kind"];
    if (tool === "pencil") {
      draftRef.current = {
        id: crypto.randomUUID(),
        kind: "pencil",
        x: wx,
        y: wy,
        w: 0,
        h: 0,
        stroke,
        strokeWidth,
        fill: "transparent",
        points: [{ x: wx, y: wy }],
        createdBy: username,
      };
    } else {
      draftRef.current = {
        id: crypto.randomUUID(),
        kind,
        x: wx,
        y: wy,
        w: 0,
        h: 0,
        stroke,
        strokeWidth,
        fill,
        createdBy: username,
      };
    }
    dragRef.current = { mode: "create", startWX: wx, startWY: wy };
    repaint();
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const { x: wx, y: wy } = toWorld(e);
    sendCursor(wx, wy); // live presence (throttled inside the hook)

    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === "pan" && drag.panCam) {
      // Keep the grabbed world point under the cursor: shift the camera
      // by the world-space delta since the grab started.
      setCamera({
        ...drag.panCam,
        x: drag.panCam.x - (wx - drag.startWX),
        y: drag.panCam.y - (wy - drag.startWY),
      });
      return;
    }

    if (drag.mode === "move" && drag.origShape) {
      const dx = wx - drag.startWX;
      const dy = wy - drag.startWY;
      const o = drag.origShape;
      if (o.kind === "pencil" && o.points) {
        updateShape({
          ...o,
          points: o.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })),
          x: o.x + dx,
          y: o.y + dy,
        });
        // Refresh grab point so next move is incremental (avoids drift).
        drag.startWX = wx;
        drag.startWY = wy;
        drag.origShape = { ...o, x: o.x + dx, y: o.y + dy, points: o.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) };
      } else {
        const moved = { ...o, x: o.x + dx, y: o.y + dy };
        updateShape(moved);
        drag.origShape = moved;
        drag.startWX = wx;
        drag.startWY = wy;
      }
      return;
    }

    if (drag.mode === "create" && draftRef.current) {
      const d = draftRef.current;
      if (d.kind === "pencil") {
        d.points = [...(d.points ?? []), { x: wx, y: wy }];
        const xs = d.points.map((p) => p.x);
        const ys = d.points.map((p) => p.y);
        d.x = Math.min(...xs);
        d.y = Math.min(...ys);
        d.w = Math.max(...xs) - d.x;
        d.h = Math.max(...ys) - d.y;
      } else if (d.kind === "line" || d.kind === "arrow") {
        d.w = wx - drag.startWX;
        d.h = wy - drag.startWY;
      } else {
        const n = normalizeRect(drag.startWX, drag.startWY, wx, wy);
        d.x = n.x;
        d.y = n.y;
        d.w = Math.abs(n.w);
        d.h = Math.abs(n.h);
      }
      repaint();
    }
  };

  const onMouseUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.mode === "create" && draftRef.current) {
      const d = draftRef.current;
      draftRef.current = null;
      const tooSmall =
        d.kind !== "pencil" && Math.abs(d.w) < 4 && Math.abs(d.h) < 4;
      if (!tooSmall) {
        // Normalize negative drags for line/arrow too (keep direction! no —
        // lines keep signed w/h so the arrow points the dragged way).
        addShape({ ...d });
        setSelectedId(d.id);
      }
      repaint();
    }
  };

  // Wheel: scroll = pan, Ctrl/Cmd+scroll = zoom at cursor.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = canvas.getBoundingClientRect();
        setCamera((c) => zoomAt(c, e.clientX - rect.left, e.clientY - rect.top, e.deltaY));
      } else {
        setCamera((c) => ({
          ...c,
          x: c.x + e.deltaX / c.zoom,
          y: c.y + e.deltaY / c.zoom,
        }));
      }
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  // ============================ keyboard ============================
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === " ") spaceHeld.current = true;
      if (k === "v") setTool("select");
      if (k === "h") setTool("hand");
      if (k === "r") setTool("rect");
      if (k === "o") setTool("ellipse");
      if (k === "d") setTool("diamond");
      if (k === "l") setTool("line");
      if (k === "a") setTool("arrow");
      if (k === "p") setTool("pencil");
      if (k === "t") setTool("text");
      if (k === "e") setTool("eraser");
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        deleteShape(selectedId);
        setSelectedId(null);
      }
      if ((e.ctrlKey || e.metaKey) && k === "z") {
        e.preventDefault();
        undoLast();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") spaceHeld.current = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, shapes]);

  /** Delete my most recently created shape (simple, predictable undo). */
  const undoLast = useCallback(() => {
    const mine = shapesRef.current.filter((s) => s.createdBy === username);
    const last = mine[mine.length - 1];
    if (last) {
      deleteShape(last.id);
      if (selectedId === last.id) setSelectedId(null);
    }
  }, [deleteShape, selectedId, username]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    alert("Invite link copied! Share it to collaborate.");
  }, []);

  const confirmClear = useCallback(() => {
    if (window.confirm("Clear the ENTIRE board for everyone?")) clearShapes();
  }, [clearShapes]);

  const myCount = shapes.filter((s) => s.createdBy === username).length;

  return (
    <div className="board-root">
      <PresenceBar users={users} connected={connected} roomName={roomName} />
      <Toolbar
        tool={tool}
        onToolChange={setTool}
        stroke={stroke}
        onStrokeChange={setStroke}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        fill={fill}
        onFillChange={setFill}
        onUndo={undoLast}
        onClear={confirmClear}
        onCopyLink={copyLink}
        canUndo={myCount > 0}
      />
      <div className="canvas-wrap">
        <canvas
          ref={canvasRef}
          className={`board-canvas tool-${tool}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
      </div>
      <div className="status-bar">
        <span>
          {shapes.length} shapes · {Math.round(camera.zoom * 100)}% zoom
        </span>
        <span>Scroll to pan · Ctrl+scroll to zoom · Del deletes selection</span>
      </div>
    </div>
  );
}
