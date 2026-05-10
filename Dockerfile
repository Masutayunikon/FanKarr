FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10 --activate
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
FROM node:22-slim
ARG BUILD_VERSION=dev
RUN apt-get update && apt-get install -y gosu && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist/server /app/dist/server
COPY --from=build /app/dist/client /app/public
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN mkdir -p /config
RUN echo "$BUILD_VERSION" > /app/version.txt

EXPOSE 3001
ENV NODE_ENV=production
ENTRYPOINT ["/entrypoint.sh"]
