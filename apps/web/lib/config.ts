/**
 * Frontend config. Rule: `process.env` is read ONLY here.
 * NEXT_PUBLIC_* vars are inlined into the browser bundle at BUILD time,
 * so restart `pnpm dev` (and redeploy) after changing them.
 *
 * - `httpUrl` defaults to "" (same-origin): in production the API lives at
 *   /api/* on the SAME domain (Vercel rewrite -> http-backend service), so
 *   relative URLs work on every deployment, including previews. Set
 *   NEXT_PUBLIC_HTTP_URL only if the API has its own domain. Local `pnpm
 *   dev` is covered by the /api proxy in next.config.js.
 * - `wsUrl` must stay absolute (WebSocket URLs can't be relative). Point it
 *   at wherever ws-backend runs: localhost in dev, wss://… in production.
 */
export const config = {
  httpUrl: process.env.NEXT_PUBLIC_HTTP_URL ?? "",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080",
} as const;
