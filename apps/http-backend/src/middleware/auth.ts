/**
 * Optional auth: guests can draw WITHOUT logging in.
 * If `Authorization: Bearer <jwt>` is present + valid, we attach
 * `req.userId`. Otherwise the request continues as a guest.
 */
import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt.js";

export interface AuthRequest extends Request {
  userId?: string;
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const payload = verifyToken(header.slice("Bearer ".length));
    if (payload) req.userId = payload.userId;
  }
  next();
}
