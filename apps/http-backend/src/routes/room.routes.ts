/** Room + shape endpoints (see room.controller.ts for the API table). */
import { Router } from "express";
import {
  clearShapesHandler,
  createRoomHandler,
  getRoomHandler,
  listShapesHandler,
  saveShapesHandler,
} from "../controllers/room.controller.js";

export const roomRoutes = Router();
roomRoutes.post("/", createRoomHandler);
roomRoutes.get("/:roomId", getRoomHandler);
roomRoutes.get("/:roomId/shapes", listShapesHandler);
roomRoutes.put("/:roomId/shapes", saveShapesHandler);
roomRoutes.delete("/:roomId/shapes", clearShapesHandler);
