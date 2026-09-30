/** POST /api/auth/signup + POST /api/auth/signin */
import { Router } from "express";
import { signin, signup } from "../controllers/auth.controller.js";

export const authRoutes = Router();
authRoutes.post("/signup", signup);
authRoutes.post("/signin", signin);
