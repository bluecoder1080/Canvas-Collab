/**
 * Room + shape controller.
 *
 * REST surface (all JSON):
 *   POST   /api/rooms              -> create a board (guest OK)
 *   GET    /api/rooms/:roomId      -> fetch one board (404 if missing)
 *   GET    /api/rooms/:roomId/shapes -> load all shapes (canvas init)
 *   PUT    /api/rooms/:roomId/shapes -> replace snapshot (autosave)
 *   DELETE /api/rooms/:roomId/shapes -> clear the board
 *
 * Realtime drawing itself goes over WebSockets, not here.
 */
import { createRoomSchema, saveShapesSchema, shapeSchema } from "@repo/shared";
import {
  clearRoomShapes,
  createRoom,
  getRoom,
  getRoomShapes,
  replaceRoomShapes,
} from "@repo/db";
import type { Response } from "express";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { newRoomId } from "../utils/roomId.js";

export const createRoomHandler = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const input = createRoomSchema.safeParse(req.body ?? {});
    if (!input.success) throw new HttpError(400, "Invalid room name");

    const room = await createRoom(newRoomId(), input.data.name, req.userId ?? null);
    res.status(201).json({ room });
  },
);

export const getRoomHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const room = await getRoom(req.params.roomId as string);
  if (!room) throw new HttpError(404, "Room not found");
  res.json({ room });
});

export const listShapesHandler = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const room = await getRoom(req.params.roomId as string);
    if (!room) throw new HttpError(404, "Room not found");
    res.json({ shapes: await getRoomShapes(room.id) });
  },
);

export const saveShapesHandler = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const roomId = req.params.roomId as string;
    const room = await getRoom(roomId);
    if (!room) throw new HttpError(404, "Room not found");

    const input = saveShapesSchema.safeParse(req.body);
    if (!input.success) throw new HttpError(400, "Invalid shapes payload");

    // Validate each shape strictly (zod) before touching SQL.
    for (const s of input.data.shapes) {
      if (!shapeSchema.safeParse(s).success)
        throw new HttpError(400, "Invalid shape in payload");
    }

    await replaceRoomShapes(roomId, input.data.shapes);
    res.json({ ok: true, count: input.data.shapes.length });
  },
);

export const clearShapesHandler = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const room = await getRoom(req.params.roomId as string);
    if (!room) throw new HttpError(404, "Room not found");
    await clearRoomShapes(room.id);
    res.json({ ok: true });
  },
);
