/**
 * Canvas 2D renderer. One function per shape kind — easy to study,
 * easy to extend (add a kind here + a toolbar button + hit-test below).
 */
import type { Point, Shape } from "@repo/shared";

function setupStroke(ctx: CanvasRenderingContext2D, s: Shape) {
  ctx.strokeStyle = s.stroke;
  ctx.lineWidth = s.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function applyFill(ctx: CanvasRenderingContext2D, s: Shape) {
  if (s.fill && s.fill !== "transparent") {
    ctx.fillStyle = s.fill;
    ctx.fill();
  }
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const size = 10 + ctx.lineWidth * 2;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle - 0.4), toY - size * Math.sin(angle - 0.4));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle + 0.4), toY - size * Math.sin(angle + 0.4));
  ctx.stroke();
}

function drawPencilPath(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  // Simple polyline. (Upgrade path: quadratic smoothing / perfect-freehand.)
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
  ctx.stroke();
}

/** Draw ONE shape. Assumes the camera transform is already applied. */
export function drawShape(ctx: CanvasRenderingContext2D, s: Shape) {
  setupStroke(ctx, s);
  const { x, y, w, h } = s;

  switch (s.kind) {
    case "rect":
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      applyFill(ctx, s);
      ctx.stroke();
      break;

    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
      applyFill(ctx, s);
      ctx.stroke();
      break;

    case "diamond":
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      applyFill(ctx, s);
      ctx.stroke();
      break;

    case "line":
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
      break;

    case "arrow":
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
      drawArrowHead(ctx, x, y, x + w, y + h);
      break;

    case "pencil":
      drawPencilPath(ctx, s.points ?? []);
      break;

    case "text": {
      ctx.fillStyle = s.stroke;
      ctx.font = `${Math.max(12, s.strokeWidth * 8)}px sans-serif`;
      ctx.textBaseline = "top";
      const lines = (s.text ?? "").split("\n");
      lines.forEach((line, i) => ctx.fillText(line, x, y + i * 20));
      break;
    }
  }
}

/**
 * Hit-test: is world point (px,py) "on" the shape?
 * Used for select + eraser. Rect/ellipse use bounding boxes
 * (fast, predictable); pencil checks distance to any segment.
 */
export function hitTest(s: Shape, px: number, py: number): boolean {
  const pad = Math.max(6, s.strokeWidth * 2);
  if (s.kind === "pencil") {
    const pts = s.points ?? [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      // Distance point->segment < pad ?
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy || 1;
      const t = Math.min(1, Math.max(0, ((px - a.x) * dx + (py - a.y) * dy) / lenSq));
      const cx = a.x + t * dx;
      const cy = a.y + t * dy;
      if ((px - cx) ** 2 + (py - cy) ** 2 < pad * pad) return true;
    }
    return false;
  }
  if (s.kind === "text") {
    return px >= s.x - pad && px <= s.x + Math.max(s.w, 60) && py >= s.y - pad && py <= s.y + 30;
  }
  const minX = Math.min(s.x, s.x + s.w) - pad;
  const maxX = Math.max(s.x, s.x + s.w) + pad;
  const minY = Math.min(s.y, s.y + s.h) - pad;
  const maxY = Math.max(s.y, s.y + s.h) + pad;
  return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

/** Normalize a drag (any direction) into a positive w/h rect. */
export function normalizeRect(x0: number, y0: number, x1: number, y1: number) {
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: x1 - x0, h: y1 - y0 };
}
