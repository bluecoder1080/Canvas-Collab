/**
 * Shared constants. Single source of truth so web + backends agree.
 * Change ports here? Change the .env files too (they win at runtime).
 */

export const DEFAULT_HTTP_PORT = 3001;
export const DEFAULT_WS_PORT = 8080;
export const DEFAULT_WEB_PORT = 3000;

/** Throttle for cursor broadcasts (ms). Lower = smoother, more traffic. */
export const CURSOR_THROTTLE_MS = 50;

/** How often the frontend autosaves the snapshot via HTTP (ms). */
export const AUTOSAVE_INTERVAL_MS = 10_000;

/** Max shapes per room (abuse guard). */
export const MAX_SHAPES_PER_ROOM = 5000;

/** Stroke color presets shown in the toolbar. */
export const STROKE_PRESETS = [
  "#1e1e1e",
  "#e03131",
  "#2f9e44",
  "#1971c2",
  "#f08c00",
  "#9c36b5",
] as const;

/** Room id shape: short, URL-friendly (nanoid-style, 10 chars). */
export const ROOM_ID_LENGTH = 10;
