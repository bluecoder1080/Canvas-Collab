/**
 * Public API of @repo/db. Backends import only from here,
 * never from deep paths — keeps refactors painless.
 */
export { pool, query } from "./pool.js";
export * from "./rooms.js";
export * from "./users.js";
