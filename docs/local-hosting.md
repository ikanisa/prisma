# Local hosting guide

This guide explains how to run the Prisma Glow stack without relying on managed preview environments.

## 1. Environment configuration

1. Copy the example file and fill in secrets shared by the Supabase/Vault teams:
   ```bash
   cp .env.example .env.local
   ```
2. Update the following entries at a minimum:
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **SERVER-ONLY** - Store in Vault, never in NEXT_PUBLIC_*
   - `SUPABASE_JWT_SECRET` ⚠️ **SERVER-ONLY** - Store in Vault, never in NEXT_PUBLIC_*
   - `DATABASE_URL` ⚠️ **SERVER-ONLY** - Store in Vault, never commit to git
   - `OPENAI_API_KEY` ⚠️ **SERVER-ONLY** - Store in Vault, never expose to client

3. **Critical Secret Management Rules:**
   - ⛔ **NEVER** copy server-only secrets (SERVICE_ROLE_KEY, JWT_SECRET, API keys) to NEXT_PUBLIC_* variables
   - ⛔ **NEVER** commit real secrets to version control
   - ✅ **ALWAYS** use secret managers (Supabase Vault, AWS Secrets Manager, GitHub Actions secrets)
   - ✅ **ALWAYS** use different secrets per environment (dev/staging/prod)
   - ✅ **ALWAYS** verify no secrets leaked with: `node tools/scripts/check-client-secrets.mjs`

4. Optional toggles (`SUPABASE_ALLOW_STUB`, rate limits, telemetry webhooks) can remain unset locally.
5. Restart any dev servers after editing `.env.local` so Vite/Next/Gateway pick up the changes.

## 2. Install and build with pnpm

The monorepo is pinned to pnpm via `packageManager` and Volta metadata. From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run build
```

The `build` script runs `tsc -b` before bundling the Vite front-end. Add `--filter <workspace>` to scope commands to services like `web`, `@prisma-glow/gateway`, or `@prisma-glow/rag-service`.

## 3. Start local servers

Choose the process that matches your target surface:

- **Vite shell** (legacy UI):
  ```bash
  pnpm dev
  ```
- **Next.js app**:
  ```bash
  pnpm --filter web dev
  ```
- **Gateway API**:
  ```bash
  pnpm --filter @prisma-glow/gateway dev
  ```
- **FastAPI backend**:
  ```bash
  python -m venv .venv
  source .venv/bin/activate
  pip install -r server/requirements.txt
  uvicorn server.main:app --reload --port 8000
  ```

Open http://localhost:5173 for the Vite app, http://localhost:3000 for the Next.js app, and http://localhost:3001 for the gateway default port.

## 4. Remote Access (Deprecated)

**Note:** Cloudflare tunnel helpers have been removed as part of the migration to Netlify + Supabase architecture. For remote access during development, use:

1. **Netlify Preview Deployments**: Push to a branch to get automatic preview URLs
2. **ngrok or similar**: For ad-hoc local sharing
3. **Supabase Local Development**: `supabase start` for local backend

## 5. Future reverse-proxy plans

For production deployments, follow [`docs/deployment/netlify-supabase.md`](./deployment/netlify-supabase.md). This guide covers Netlify configuration, Supabase setup, and CI/CD integration.

