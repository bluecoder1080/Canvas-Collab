# syntax=docker/dockerfile:1
# ============================================================
# ws-backend container — realtime WebSocket server.
# Deploy the built image to Render / Fly.io / Railway (or any host
# that runs long-lived processes; Vercel Functions can't host this).
#
# Build from the REPO ROOT (the Dockerfile reaches into packages/*):
#   docker build -f apps/ws-backend/Dockerfile -t canvas-ws .
# Run:
#   docker run -p 8080:8080 -e DATABASE_URL=postgres://… canvas-ws
#
# Stages: install (cached deps) -> build (TypeScript) -> runner
# (production-only files via `pnpm deploy`, which materializes the
#  workspace:* links into a self-contained folder).
# ============================================================

FROM node:22-alpine AS install
# Pin pnpm 9: pnpm-lock.yaml is lockfileVersion 9.0 (written by pnpm 9).
# (The repo's `packageManager` field targets corepack users, not Docker.)
RUN npm install -g pnpm@9.15.0
WORKDIR /repo

# Copy manifests first: this layer is cached until dependencies change.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY apps/ws-backend/package.json apps/ws-backend/
COPY apps/http-backend/package.json apps/http-backend/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

FROM install AS build
# Copy only what ws-backend needs to compile (plus the TS configs).
COPY packages/typescript-config packages/typescript-config
COPY packages/shared packages/shared
COPY packages/db packages/db
COPY apps/ws-backend apps/ws-backend
RUN pnpm --filter @repo/shared build \
 && pnpm --filter @repo/db build \
 && pnpm --filter ws-backend build \
 && pnpm --filter ws-backend deploy /deploy

FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /srv
COPY --from=build /deploy ./
# Platforms inject $PORT; the server reads WS_PORT ?? PORT ?? 8080,
# so no port config is needed (see apps/ws-backend/src/config/env.ts).
EXPOSE 8080
CMD ["node", "dist/index.js"]
