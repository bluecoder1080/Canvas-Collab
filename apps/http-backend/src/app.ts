/**
 * Express application (no socket, no side effects on import).
 *
 * Why a separate file? Long-running hosts (`pnpm dev`, Docker, Render…)
 * boot via `src/index.ts`, which imports this app and calls `listen()`.
 * Serverless platforms (Vercel Functions) instead import the app object
 * directly and invoke it per request — importing this module must therefore
 * never open a port. Keep all `listen()` logic in `index.ts`.
 */
import cors from "cors";
import express, { type Express } from "express";
import { env } from "./config/env.js";
import { optionalAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./routes/auth.routes.js";
import { roomRoutes } from "./routes/room.routes.js";

export const app: Express = express();

// --- global middleware (order matters) ---
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "2mb" }));
app.use((req, _res, next) => {
  console.log(`[http] ${req.method} ${req.path}`);
  next();
});

// --- health check (load balancers + HOW_TO_RUN smoke test) ---
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "http-backend" });
});

// --- API routes (auth is optional: guests can create rooms + draw) ---
app.use("/api/auth", authRoutes);
app.use("/api/rooms", optionalAuth, roomRoutes);

// --- 404 + errors (must be last) ---
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);
