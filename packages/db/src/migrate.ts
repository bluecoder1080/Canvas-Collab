/**
 * `pnpm --filter @repo/db migrate` runs schema.sql against DATABASE_URL.
 * Keeping migrations as one readable .sql file is intentional:
 * this project is for learning SQL, not for hiding it in an ORM.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// src/ -> package root -> schema.sql
const schemaPath = path.resolve(here, "..", "schema.sql");

async function main() {
  const sql = fs.readFileSync(schemaPath, "utf8");
  console.log(`[db] applying ${schemaPath}`);
  await pool.query(sql);
  console.log("[db] schema is up to date");
  await pool.end();
}

main().catch((err) => {
  console.error("[db] migration failed:", err);
  process.exit(1);
});
