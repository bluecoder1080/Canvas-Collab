# How to run Canvas-Collab 🖌️

> Realtime collaborative whiteboard — Next.js + Express + WebSocket + Postgres.
> No Docker required. You only need **Node.js ≥ 20**, **pnpm**, and **Postgres**.

---

## 1. Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 (24 recommended) | https://nodejs.org |
| pnpm | 9 or 11 | `npm i -g pnpm` |
| Postgres | 14, 15 or 16 | see step 2 |

Check yours:

```sh
node --version
pnpm --version
```

---

## 2. Start Postgres

**Option A — Docker (easiest, if you have it):**

```sh
docker compose up -d
```

**Option B — Local Postgres (Windows / no Docker):**

1. Install from https://www.postgresql.org/download/windows/
2. Remember the `postgres` superuser password (or set it to `postgres`).
3. Open **pgAdmin** (ships with the installer) or `psql` and create the database:

```sql
CREATE DATABASE canvas;
```

4. Point the apps at it via `DATABASE_URL`:

```
postgres://postgres:<YOUR-PASSWORD>@localhost:5432/canvas
```

> The default in every `.env.example` is
> `postgres://postgres:postgres@localhost:5432/canvas` (password `postgres`).

---

## 3. Install dependencies (repo root)

```sh
pnpm install
```

This links the workspace packages (`@repo/shared`, `@repo/db`, `@repo/ui`)
into every app automatically.

---

## 4. Configure environment

Each app reads its own `.env` file. Copy the examples:

```sh
# Windows PowerShell
Copy-Item .env.example .env
Copy-Item apps\http-backend\.env.example apps\http-backend\.env
Copy-Item apps\ws-backend\.env.example apps\ws-backend\.env
Copy-Item apps\web\.env.example apps\web\.env.local
```

| File | Key vars | Defaults |
|------|----------|----------|
| `apps/http-backend/.env` | `PORT`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` | `3001` |
| `apps/ws-backend/.env` | `WS_PORT`, `DATABASE_URL` | `8080` |
| `apps/web/.env.local` | `NEXT_PUBLIC_HTTP_URL`, `NEXT_PUBLIC_WS_URL` | `http://localhost:3001`, `ws://localhost:8080` |

> `NEXT_PUBLIC_*` vars are baked into the browser bundle — restart `pnpm dev`
> after changing them.

---

## 5. Create the tables (one command)

```sh
pnpm --filter @repo/db migrate
```

This runs [`packages/db/schema.sql`](packages/db/schema.sql) against
`DATABASE_URL`. Tables created: `users`, `rooms`, `shapes`.
Re-run anytime — every statement is `IF NOT EXISTS`.

Verify (optional):

```sql
-- in psql / pgAdmin
\dt            -- users, rooms, shapes
SELECT * FROM rooms;
SELECT * FROM shapes;
```

---

## 6. Run everything (dev mode)

From the repo root:

```sh
pnpm dev
```

Turbo starts all three apps in parallel:

| App | URL | What it does |
|-----|-----|--------------|
| **web** (Next.js) | http://localhost:3000 | landing page + whiteboard |
| **http-backend** (Express) | http://localhost:3001 | REST: rooms, shapes, auth |
| **ws-backend** (`ws`) | ws://localhost:8080 | realtime drawing + cursors |

Prefer separate terminals? Run each alone:

```sh
pnpm dev --filter=web
pnpm dev --filter=http-backend
pnpm dev --filter=ws-backend
```

Smoke test the API:

```sh
curl http://localhost:3001/health
# {"ok":true,"service":"http-backend"}
```

---

## 7. Try collaboration 🎉

1. Open http://localhost:3000 → **Create a board**.
2. Enter a display name → draw something.
3. **Copy the URL** (`/room/<id>`) into a second browser / incognito window,
   enter a different name — draw in both. Shapes, deletes and live cursors
   sync instantly.
4. Reload either tab: the board reloads from Postgres.

---

## 8. Useful commands

```sh
pnpm build          # build all apps + packages (turbo, cached)
pnpm lint           # eslint everywhere
pnpm check-types    # tsc --noEmit everywhere
pnpm format         # prettier write

# backend production run (after build)
pnpm --filter http-backend start
pnpm --filter ws-backend start
pnpm --filter web start
```

---

## 9. Project map (where to study what)

```
Canvas-Collab/
├── apps/web/                  # Next.js 16 frontend (port 3000)
│   ├── app/page.tsx           # landing: create / join board
│   ├── app/room/[roomId]/page.tsx  # name gate -> <Whiteboard>
│   ├── components/canvas/Whiteboard.tsx  # canvas engine (read this!)
│   ├── components/canvas/Toolbar.tsx     # tools + colors + actions
│   ├── components/canvas/PresenceBar.tsx # online roster
│   ├── hooks/useCollabRoom.ts # the ONLY file that touches WebSocket
│   └── lib/canvas/draw.ts     # one render fn per shape kind
│   └── lib/canvas/geometry.ts # camera (pan/zoom) math
│   └── lib/api.ts             # REST client (rooms, autosave)
├── apps/http-backend/         # Express REST API (port 3001)
│   └── src/{index,config,routes,controllers,middleware,utils}.ts
├── apps/ws-backend/           # realtime server (port 8080)
│   └── src/{index.ts, rooms/RoomManager.ts}
├── packages/shared/           # types + zod + WS protocol (web+servers)
├── packages/db/               # pg Pool + SQL queries + schema.sql
├── docker-compose.yml         # postgres:16 for `docker compose up -d`
└── HOW_TO_RUN.md              # this file
```

**Suggested study order:**
`packages/shared` → `packages/db/schema.sql` → `http-backend` →
`ws-backend/RoomManager` → `web/hooks/useCollabRoom` → `web/Whiteboard`.

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ECONNREFUSED :5432` | Postgres isn't running, or password in `DATABASE_URL` is wrong |
| `relation "rooms" does not exist` | run step 5 (`@repo/db migrate`) |
| Board shows “connecting…” forever | `ws-backend` not running, or `NEXT_PUBLIC_WS_URL` wrong (restart `pnpm dev`) |
| “Could not reach the API” on Create | `http-backend` not running, or `NEXT_PUBLIC_HTTP_URL` wrong |
| `pnpm dev` port clash (`EADDRINUSE`) | another app on 3000/3001/8080 — stop it or change the `PORT` in that app's `.env` |
| pnpm version warning | harmless; or `npm i -g pnpm@11` to match `packageManager` |
| `crypto.randomUUID is not a function` | use a modern browser + Node ≥ 20 |

Still stuck? Open an issue with the output of `pnpm dev` and your
`node --version` / Postgres version.
