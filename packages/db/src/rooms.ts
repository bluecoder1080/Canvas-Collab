/**
 * Data-access layer for rooms + shapes.
 * All SQL lives here (not in controllers) so HTTP and WS backends
 * share identical queries. Each function = one concern, one query.
 */
import type { Shape } from "@repo/shared";
import { query } from "./pool.js";

export interface RoomRow {
  id: string;
  name: string;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ShapeRow {
  id: string;
  room_id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  stroke_width: number;
  fill: string;
  points: { x: number; y: number }[];
  text: string;
  created_by: string;
}

/** Map a Postgres row -> the shared Shape type used by WS + canvas. */
function toShape(row: ShapeRow): Shape {
  return {
    // Cast is safe: the CHECK constraint in schema.sql limits `kind`.
    kind: row.kind as Shape["kind"],
    id: row.id,
    x: Number(row.x),
    y: Number(row.y),
    w: Number(row.w),
    h: Number(row.h),
    stroke: row.stroke,
    strokeWidth: Number(row.stroke_width),
    fill: row.fill,
    points: Array.isArray(row.points) ? row.points : [],
    text: row.text ?? "",
    createdBy: row.created_by ?? "",
  };
}

export async function createRoom(id: string, name: string, ownerId: string | null) {
  const { rows } = await query<RoomRow>(
    `INSERT INTO rooms (id, name, owner_id) VALUES ($1, $2, $3)
     RETURNING id, name, owner_id, created_at, updated_at`,
    [id, name, ownerId],
  );
  return rows[0] as RoomRow;
}

export async function getRoom(id: string) {
  const { rows } = await query<RoomRow>(`SELECT * FROM rooms WHERE id = $1`, [id]);
  return (rows[0] as RoomRow | undefined) ?? null;
}

export async function getRoomShapes(roomId: string): Promise<Shape[]> {
  const { rows } = await query<ShapeRow>(
    `SELECT * FROM shapes WHERE room_id = $1 ORDER BY updated_at ASC LIMIT 5000`,
    [roomId],
  );
  return rows.map(toShape);
}

export async function upsertShape(roomId: string, shape: Shape) {
  await query(
    `INSERT INTO shapes (id, room_id, kind, x, y, w, h, stroke, stroke_width, fill, points, text, created_by, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
     ON CONFLICT (id) DO UPDATE SET
       kind = EXCLUDED.kind, x = EXCLUDED.x, y = EXCLUDED.y,
       w = EXCLUDED.w, h = EXCLUDED.h, stroke = EXCLUDED.stroke,
       stroke_width = EXCLUDED.stroke_width, fill = EXCLUDED.fill,
       points = EXCLUDED.points, text = EXCLUDED.text,
       updated_at = now()`,
    [
      shape.id,
      roomId,
      shape.kind,
      shape.x,
      shape.y,
      shape.w,
      shape.h,
      shape.stroke,
      shape.strokeWidth,
      shape.fill,
      JSON.stringify(shape.points ?? []),
      shape.text ?? "",
      shape.createdBy ?? "",
    ],
  );
}

/**
 * Replace a room's whole snapshot (used by HTTP autosave).
 * Wrapped in a transaction: delete + bulk insert is atomic.
 */
export async function replaceRoomShapes(roomId: string, shapes: Shape[]) {
  const client = await (await import("./pool.js")).pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM shapes WHERE room_id = $1`, [roomId]);
    for (const s of shapes) {
      await client.query(
        `INSERT INTO shapes (id, room_id, kind, x, y, w, h, stroke, stroke_width, fill, points, text, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          s.id,
          roomId,
          s.kind,
          s.x,
          s.y,
          s.w,
          s.h,
          s.stroke,
          s.strokeWidth,
          s.fill,
          JSON.stringify(s.points ?? []),
          s.text ?? "",
          s.createdBy ?? "",
        ],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteShape(shapeId: string) {
  await query(`DELETE FROM shapes WHERE id = $1`, [shapeId]);
}

export async function clearRoomShapes(roomId: string) {
  await query(`DELETE FROM shapes WHERE room_id = $1`, [roomId]);
}
