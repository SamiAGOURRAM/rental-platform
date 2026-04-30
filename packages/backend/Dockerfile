FROM node:20-bookworm-slim AS builder

RUN npm install -g pnpm
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .npmrc pnpm-lock.yaml* ./

# Keep deterministic installs when a local lockfile exists,
# but still allow building from this package-only context.
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    else \
      pnpm install --no-frozen-lockfile; \
    fi

COPY . .

RUN pnpm run db:generate
RUN pnpm run build
RUN pnpm prune --prod

FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs appuser \
  && chown -R appuser:nodejs /app

USER appuser

EXPOSE 3000

CMD ["node", "dist/server.js"]
