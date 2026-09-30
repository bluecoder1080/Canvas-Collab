/**
 * Centralized env config.
 * Rule: `process.env` is read ONLY here. Everything else imports `env`.
 * That makes missing-config bugs obvious at boot, not mid-request.
 */
import "dotenv/config";
import { DEFAULT_HTTP_PORT } from "@repo/shared";

export const env = {
  port: Number(process.env.PORT ?? DEFAULT_HTTP_PORT),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/canvas",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
} as const;
