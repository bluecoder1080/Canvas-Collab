/**
 * Postgres connection pool (singleton).
 *
 * Why a singleton? `pg.Pool` manages ~10-20 sockets. Creating one per
 * request leaks connections; sharing one Pool per process is the norm.
 *
 * Usage:
 *   import { pool, query } from "@repo/db";
 *   const { rows } = await query("SELECT * FROM rooms WHERE id = $1", [id]);
 */
import "dotenv/config";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/canvas";

export const pool = new Pool({
  connectionString,
  // Small default is fine for a study project.
  max: Number(process.env.PG_POOL_MAX ?? 10),
});

pool.on("error", (err) => {
  // Idle-client errors would otherwise crash the process silently.
  console.error("[db] idle client error", err);
});

/** Thin helper so callers don't import Pool everywhere. */
export async function query<T extends import("pg").QueryResultRow = import("pg").QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return pool.query<T>(text, params as never[]);
}
