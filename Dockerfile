# syntax=docker/dockerfile:1
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

# The maintenance image can mount this named volume before the app. Seed its
# ownership here as well, so Docker's first copy-up keeps the runner UID 1001.
RUN mkdir -p /tmp/dinhduong2598-nutrition-chat-v1/web-menus && chown 1001:1001 /tmp/dinhduong2598-nutrition-chat-v1 /tmp/dinhduong2598-nutrition-chat-v1/web-menus && chmod 700 /tmp/dinhduong2598-nutrition-chat-v1 /tmp/dinhduong2598-nutrition-chat-v1/web-menus

COPY . .
RUN npx prisma generate && npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
RUN mkdir -p /tmp/dinhduong2598-nutrition-chat-v1/web-menus && chown nextjs:nodejs /tmp/dinhduong2598-nutrition-chat-v1 /tmp/dinhduong2598-nutrition-chat-v1/web-menus && chmod 700 /tmp/dinhduong2598-nutrition-chat-v1 /tmp/dinhduong2598-nutrition-chat-v1/web-menus

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

# Used only for `docker compose run --rm migrate`; it contains Prisma CLI and
# the complete schema, never runs automatically on application startup.
FROM builder AS migrate
