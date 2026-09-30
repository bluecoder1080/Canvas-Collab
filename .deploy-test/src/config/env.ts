/** All env vars in one place (same rule as http-backend). */
import "dotenv/config";
import { DEFAULT_WS_PORT } from "@repo/shared";

export const env = {
  port: Number(process.env.WS_PORT ?? process.env.PORT ?? DEFAULT_WS_PORT),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/canvas",
} as const;
