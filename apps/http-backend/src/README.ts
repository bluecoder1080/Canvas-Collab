/**
 * http-backend — folder guide (read this first):
 *
 * src/index.ts            → boots Express, mounts routes, connects nothing
 *                            (Pool connects lazily on first query)
 * src/config/env.ts       → all env vars in ONE place with defaults
 * src/utils/              → jwt, password hashing, room ids, async errors
 * src/middleware/         → optionalAuth (guests allowed), errorHandler
 * src/controllers/        → HTTP verbs translated to DB calls (thin layer)
 * src/routes/             → URL <-> controller mapping (no logic here)
 *
 * Flow of a request: route -> controller -> @repo/db -> Postgres.
 */
