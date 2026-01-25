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
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --workspace api --include-workspace-root=false --omit=dev \
  && npm cache clean --force
COPY --from=build /app/api/dist api/dist
COPY api/drizzle api/drizzle

WORKDIR /app/api
USER node
EXPOSE 4410
# Applies pending migrations, then starts listening.
CMD ["node", "dist/index.js"]
