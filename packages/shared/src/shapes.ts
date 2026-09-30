/**
 * Shared shape model.
 *
 * A "shape" is the smallest drawable unit on the whiteboard.
 * Every shape has a client-generated `id` so two users can create
 * shapes concurrently without waiting for the database.
 *
 * Coordinate system: plain 2D canvas pixels in "world" space.
 * The frontend camera (pan + zoom) converts world -> screen.
 */

/** Every tool that creates a persistent object. */
export type ShapeKind =
  | "rect"
  | "ellipse"
  | "diamond"
  | "line"
  | "arrow"
  | "pencil"
  | "text";

/** A single freehand point (world coordinates). */
export interface Point {
  x: number;
  y: number;
}

/** A drawable shape. Keep it flat + JSON-serializable on purpose. */
export interface Shape {
  /** Client-generated id, e.g. crypto.randomUUID(). Stable across edits. */
  id: string;
  kind: ShapeKind;
  /** Top-left x in world space (for pencil: bounding-box min x). */
  x: number;
  /** Top-left y in world space. */
  y: number;
  /** Width (for line/arrow/pencil: bounding-box width). */
  w: number;
  /** Height (same note as above). */
  h: number;
  /** Stroke color, e.g. "#1e1e1e". */
  stroke: string;
  /** Stroke width in px (world units). */
  strokeWidth: number;
  /** Fill color ("transparent" = no fill). */
  fill: string;
  /** Freehand points (pencil only). Stored relative to world space. */
  points?: Point[];
  /** Text content (text only). */
  text?: string;
  /** Display name of the author (guest-friendly, no auth required). */
  createdBy?: string;
}

/** Create a shape with sane defaults. Used by the canvas + tests. */
export function createShape(partial: Partial<Shape> & Pick<Shape, "kind">): Shape {
  return {
    id: partial.id ?? crypto.randomUUID(),
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    w: partial.w ?? 100,
    h: partial.h ?? 100,
    stroke: partial.stroke ?? "#1e1e1e",
    strokeWidth: partial.strokeWidth ?? 2,
    fill: partial.fill ?? "transparent",
    points: partial.points,
    text: partial.text,
    createdBy: partial.createdBy,
    kind: partial.kind,
  };
}
