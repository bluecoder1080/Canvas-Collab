/**
 * Toolbar — tool picker + style controls + board actions.
 * Pure presentational component: all state lives in Whiteboard.tsx.
 */
"use client";

import { STROKE_PRESETS } from "@repo/shared";

export type Tool =
  | "select"
  | "hand"
  | "rect"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "pencil"
  | "text"
  | "eraser";

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "select", label: "Select / move (V)", icon: "➤" },
  { id: "hand", label: "Pan (H)", icon: "✋" },
  { id: "rect", label: "Rectangle (R)", icon: "▭" },
  { id: "ellipse", label: "Ellipse (O)", icon: "⬭" },
  { id: "diamond", label: "Diamond (D)", icon: "◇" },
  { id: "line", label: "Line (L)", icon: "╱" },
  { id: "arrow", label: "Arrow (A)", icon: "↗" },
  { id: "pencil", label: "Draw (P)", icon: "✎" },
  { id: "text", label: "Text (T)", icon: "T" },
  { id: "eraser", label: "Eraser (E)", icon: "⌫" },
];

interface Props {
  tool: Tool;
  onToolChange: (t: Tool) => void;
  stroke: string;
  onStrokeChange: (c: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (n: number) => void;
  fill: string;
  onFillChange: (c: string) => void;
  onUndo: () => void;
  onClear: () => void;
  onCopyLink: () => void;
  canUndo: boolean;
}

export function Toolbar(p: Props) {
  return (
    <div className="toolbar">
      <div className="toolbar-row">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            title={t.label}
            className={`tool-btn ${p.tool === t.id ? "active" : ""}`}
            onClick={() => p.onToolChange(t.id)}
          >
            {t.icon}
          </button>
        ))}
      </div>
      <div className="toolbar-row">
        {STROKE_PRESETS.map((c) => (
          <button
            key={c}
            title={c}
            className={`swatch ${p.stroke === c ? "active" : ""}`}
            style={{ background: c }}
            onClick={() => p.onStrokeChange(c)}
          />
        ))}
        <label className="toolbar-label">
          Width
          <input
            type="range"
            min={1}
            max={12}
            value={p.strokeWidth}
            onChange={(e) => p.onStrokeWidthChange(Number(e.target.value))}
          />
        </label>
        <label className="toolbar-label">
          Fill
          <input
            type="color"
            value={p.fill === "transparent" ? "#ffffff" : p.fill}
            onChange={(e) => p.onFillChange(e.target.value)}
          />
          <button
            className={`mini-btn ${p.fill === "transparent" ? "active" : ""}`}
            onClick={() => p.onFillChange("transparent")}
            title="No fill"
          >
            ∅
          </button>
        </label>
      </div>
      <div className="toolbar-row">
        <button className="mini-btn" onClick={p.onUndo} disabled={!p.canUndo} title="Delete your last shape">
          ↩ Undo
        </button>
        <button className="mini-btn danger" onClick={p.onClear} title="Delete ALL shapes for everyone">
          🗑 Clear
        </button>
        <button className="mini-btn" onClick={p.onCopyLink} title="Copy shareable link">
          🔗 Copy link
        </button>
      </div>
    </div>
  );
}
