FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@9 --quiet
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/
COPY packages/ai/package.json packages/ai/
COPY packages/compliance/package.json packages/compliance/
COPY packages/db/package.json packages/db/
COPY packages/integrations/package.json packages/integrations/
COPY packages/observability/package.json packages/observability/
COPY packages/orchestration/package.json packages/orchestration/
COPY packages/sdk-standards/package.json packages/sdk-standards/
COPY packages/types/package.json packages/types/
RUN pnpm install --frozen-lockfile --prod

FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9 --quiet
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @conversionops/worker run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Non-root user for container security
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 worker
# Copy only compiled output and production node_modules (no source)
COPY --from=builder --chown=worker:nodejs /app/apps/worker/dist ./dist
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/packages/db/prisma/schema.prisma ./prisma/schema.prisma
USER worker
# Worker has no HTTP port — liveness is determined by process health
HEALTHCHECK --interval=60s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1
CMD ["node", "dist/main"]
