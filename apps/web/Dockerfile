# ---- Build stage ----
FROM node:20.19.4-alpine AS builder
WORKDIR /app

# Corepack + pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy top-level manifests to allow workspace install
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
# Copy the web app and any shared packages you use (adjust paths if needed)
COPY apps/web/package.json apps/web/
COPY packages/api-client/package.json packages/api-client/
COPY packages/system-config/package.json packages/system-config/
COPY packages/ui/package.json packages/ui/

RUN pnpm install --frozen-lockfile

# Now copy source for a proper build
COPY . .
WORKDIR /app/apps/web

# Ensure standalone in apps/web/next.config.[jt]s
RUN pnpm build

# ---- Runtime stage ----
FROM node:20.19.4-alpine
WORKDIR /app

RUN apk add --no-cache wget

# ⚠️ SECURITY WARNING: Environment Variables
# - Prefer runtime secrets over build args for sensitive data
# - NEVER pass long-lived secrets (API keys, passwords, tokens) as ARG or ENV in build stage
# - Use secret managers (AWS Secrets Manager, HashiCorp Vault, Docker secrets)
# - Mount secrets at runtime using --secret flag or secret managers
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy web standalone server
# Standalone folder is inside the web app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
