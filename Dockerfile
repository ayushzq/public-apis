# ─── BaseKey CRM — production Dockerfile ───
# Multi-stage build: install deps → build (with Prisma client generated) →
# copy only the Next.js "standalone" output into a slim runtime image.
# Works with AWS App Runner, ECS/Fargate, or Elastic Beanstalk's Docker
# platform — see docs/AWS_DEPLOY.md for exact steps per service.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL is only needed here so `prisma generate` can read the
# schema's provider — it does NOT connect to the DB at build time.
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
