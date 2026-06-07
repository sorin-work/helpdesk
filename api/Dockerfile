# Build context is the repository root (see docker-compose.yml).

FROM node:22-alpine AS base
WORKDIR /app

# Install only the API workspace's dependencies.
FROM base AS deps
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --workspace api --include-workspace-root=false

FROM deps AS build
COPY tsconfig.base.json ./
COPY api api
RUN npm run build --workspace api

FROM base AS runtime
ENV NODE_ENV=production \
    UPLOAD_DIR=/app/uploads
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --workspace api --include-workspace-root=false --omit=dev \
  && npm cache clean --force \
  && mkdir -p /app/uploads \
  && chown node:node /app/uploads
COPY --from=build /app/api/dist api/dist
COPY api/drizzle api/drizzle

WORKDIR /app/api
USER node
EXPOSE 4410
VOLUME ["/app/uploads"]
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4410/api/health > /dev/null || exit 1
# Applies pending migrations, then starts listening.
CMD ["node", "dist/index.js"]
