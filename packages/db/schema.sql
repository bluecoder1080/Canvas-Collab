-- ============================================================
-- Canvas-Collab Postgres schema
-- Run: psql $DATABASE_URL -f schema.sql
-- Or:  pnpm --filter @repo/db migrate   (runs this file via pg)
-- ============================================================

-- UUID generation for users (Postgres 13+ has gen_random_uuid built in)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- users: optional accounts (guests can still draw without login)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- rooms: one row per whiteboard. `id` is short + shareable,
-- e.g. "aB3xK9mQ2Z" so links look like /room/aB3xK9mQ2Z
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled board',
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- shapes: one row per drawable object.
-- `id` is generated on the CLIENT (uuid) so realtime collaboration
-- works optimistically: draw -> broadcast -> persist, no roundtrip.
-- Bounding box (x,y,w,h) is indexed for fast room loads; the rest
-- (points, text, colors) lives in the same row as plain columns
-- where possible to keep SQL readable for learners.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shapes (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('rect','ellipse','diamond','line','arrow','pencil','text')),
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  w DOUBLE PRECISION NOT NULL DEFAULT 0,
  h DOUBLE PRECISION NOT NULL DEFAULT 0,
  stroke TEXT NOT NULL DEFAULT '#1e1e1e',
  stroke_width DOUBLE PRECISION NOT NULL DEFAULT 2,
  fill TEXT NOT NULL DEFAULT 'transparent',
  points JSONB NOT NULL DEFAULT '[]',
  text TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shapes_room_id ON shapes(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON rooms(owner_id);
