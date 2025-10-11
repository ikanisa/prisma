FROM node:20-alpine AS deps
ARG SERVICE_VERSION=dev
ENV SERVICE_VERSION=${SERVICE_VERSION}
WORKDIR /app/apps/web
COPY apps/web/package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
ARG SERVICE_VERSION=dev
ENV SERVICE_VERSION=${SERVICE_VERSION}
WORKDIR /app/apps/web
COPY --from=deps /app/apps/web/node_modules ./node_modules
COPY apps/web .
RUN npm run build

FROM node:20-alpine AS runner
ARG SERVICE_VERSION=dev
ENV SERVICE_VERSION=${SERVICE_VERSION}
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -g 1001 nextjs && adduser -D -u 1001 -G nextjs nextjs && apk add --no-cache curl
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public
USER nextjs
EXPOSE 3000
ENV PORT=3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s CMD curl -f http://localhost:3000/ || exit 1
CMD ["node", "server.js"]

