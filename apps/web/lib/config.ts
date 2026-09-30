/**
 * Frontend config. Rule: `process.env` is read ONLY here.
 * NEXT_PUBLIC_* vars are inlined into the browser bundle at BUILD time,
 * so restart `pnpm dev` after changing them.
 */
export const config = {
  httpUrl:
    process.env.NEXT_PUBLIC_HTTP_URL ?? "http://localhost:3001",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080",
} as const;
