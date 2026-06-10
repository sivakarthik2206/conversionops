# ConversionOps Worker — pnpm monorepo build (see apps/api/Dockerfile for the
# rationale behind shipping the whole built /app rather than just dist).
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl && npm install -g pnpm@9 --quiet
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @conversionops/db run db:generate
RUN pnpm run build:packages
RUN pnpm --filter @conversionops/worker run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl && addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 worker
COPY --from=builder --chown=worker:nodejs /app ./
USER worker
EXPOSE 8080
HEALTHCHECK --interval=60s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||8080)+'/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "apps/worker/dist/main"]
