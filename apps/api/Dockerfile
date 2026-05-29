# ConversionOps API — pnpm monorepo build.
# The builder installs the full workspace, generates the Prisma client, builds
# all workspace packages, then the API. The runner ships the whole built /app
# so the @conversionops/* workspace symlinks and the generated Prisma client
# resolve at runtime (copying only apps/api/dist + node_modules breaks the
# workspace symlinks, which point into /app/packages/*/dist).
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl && npm install -g pnpm@9 --quiet
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @conversionops/db exec prisma generate
RUN pnpm run build:packages
RUN pnpm --filter @conversionops/api run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl && addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app ./
USER nestjs
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3001)+'/v1/health/live', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "apps/api/dist/main"]
