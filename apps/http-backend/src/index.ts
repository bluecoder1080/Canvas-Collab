/**
 * Server bootstrap for long-running hosts (`pnpm dev`, Docker, Render…).
 * The Express app itself lives in `./app.ts` and is imported here —
 * this file only binds the port. Serverless platforms (Vercel Functions)
 * skip this file and import the app object directly.
 */
import { env } from "./config/env.js";
import { app } from "./app.js";

app.listen(env.port, () => {
  console.log(`[http] listening on http://localhost:${env.port}`);
  console.log(`[http] DATABASE_URL=${env.databaseUrl.replace(/:[^:@/]+@/, ":****@")}`);
});
