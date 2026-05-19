FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/
COPY packages/auth/package.json packages/auth/
COPY packages/ai/package.json packages/ai/
COPY packages/compliance/package.json packages/compliance/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/integrations/package.json packages/integrations/
COPY packages/observability/package.json packages/observability/
COPY packages/orchestration/package.json packages/orchestration/
COPY packages/sdk-standards/package.json packages/sdk-standards/
COPY packages/types/package.json packages/types/
RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile --prod

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm@9 && pnpm install --frozen-lockfile
RUN pnpm --filter @conversionops/worker run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 worker
COPY --from=builder --chown=worker:nodejs /app/apps/worker/dist ./dist
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/packages ./packages
USER worker
CMD ["node", "dist/main"]
