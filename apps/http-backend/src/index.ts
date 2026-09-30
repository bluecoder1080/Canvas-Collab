/**
 * Entry point. Boot order matters:
 * 1. Load env (config/env.ts)
 * 2. Create Express app (JSON body, CORS, logging)
 * 3. Mount routes (/api/auth, /api/rooms)
 * 4. Mount error handler LAST (Express rule)
 * 5. Listen
 */
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { optionalAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./routes/auth.routes.js";
import { roomRoutes } from "./routes/room.routes.js";

const app = express();

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

app.listen(env.port, () => {
  console.log(`[http] listening on http://localhost:${env.port}`);
  console.log(`[http] DATABASE_URL=${env.databaseUrl.replace(/:[^:@/]+@/, ":****@")}`);
});
