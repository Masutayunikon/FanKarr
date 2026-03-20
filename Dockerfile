FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app

# ── Dépendances prod ───────────────────────────────────────────
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# ── Build ──────────────────────────────────────────────────────
FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

# ── Production ─────────────────────────────────────────────────
FROM node:20-slim
RUN apt-get update && apt-get install -y gosu && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist/server /app/dist/server
COPY --from=build /app/dist/client /app/public
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN mkdir -p /config

EXPOSE 3001
ENV NODE_ENV=production
ENTRYPOINT ["/entrypoint.sh"]