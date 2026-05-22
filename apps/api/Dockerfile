FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@9 --quiet
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
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
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --prod

FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9 --quiet
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @conversionops/api run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Non-root user for container security
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
# Copy only the compiled output and production deps (no source code)
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
# Prisma: copy schema for potential runtime validation
COPY --from=builder --chown=nestjs:nodejs /app/packages/db/prisma/schema.prisma ./prisma/schema.prisma
USER nestjs
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/v1/health/live', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "dist/main"]
