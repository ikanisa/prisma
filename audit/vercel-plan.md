# Vercel Deployment Plan

## apps/web (Next.js 14 App Router)
- **rootDirectory**: `apps/web`
- **Framework**: Next.js (`output: 'standalone'` already configured)
- **Install Command**: `cd .. && pnpm install --frozen-lockfile`
- **Build Command**: `cd .. && pnpm --filter web build`
- **Output Directory**: `.next`
- **Node Version**: 18.20.x (pinned via `.nvmrc` and `package.json` engines)
- **Environment acquisition**: `vercel pull --environment=<preview|production>` executed from `apps/web`
- **Notes**:
  - Requires Supabase (service role + anon key), Keycloak (OIDC) and optional downstream API URLs.
  - Middleware/edge routes are not defined; default Node runtime is compatible with Prisma + OpenAI usage.
  - Generated `apps/web/vercel.json` encodes the install/build commands and enables health-check route passthrough.
  - GitHub Action mirrors these commands and uses `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TOKEN` secrets.

## apps/gateway (Express proxy)
- **Deployment target**: Keep on Vercel as a Node Serverless Function if needed, but recommended to run behind API routes or move to separate infra.
- **Install Command**: `pnpm install --frozen-lockfile`
- **Build Command**: `pnpm --filter @prisma-glow/gateway build`
- **Runtime**: Node 18 serverless function using the compiled `dist/server.js` entry.
- **Notes**: Requires Redis, PostgreSQL, and upstream FastAPI URLs. Not wired to Vercel in this iteration; include in future phases when service boundaries are stable.

## services/rag (Node workers + Express)
- **Deployment target**: Not suitable for Vercel due to long-running workers and heavy OpenAI dependencies. Deploy to container runtime (Fly.io, Railway, Render, etc.).
- **Build Command**: `pnpm --filter @prisma-glow/rag-service build`
- **Notes**: Relies on background processing, Supabase, PostgreSQL, and multiple OpenAI APIs. Include as external dependency for the web app via authenticated gateway endpoints.

## Shared Considerations
- Use `corepack enable` before running pnpm in CI/preview environments.
- Ensure `VERCEL_AUTOMATION_BYPASS_SECRET` is configured when Deployment Protection is active; pass through to CI via GitHub secrets.
- Prisma generates during `pnpm --filter web build`; add optional `pnpm --filter web prisma:generate` step in CI/local preflight before `vercel build` when schema changes.
- All env validation is performed through the new `env` modules; missing variables will fail builds early.
