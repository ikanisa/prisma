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

## 4. Cloudflare tunnel helpers

Some teams expose the local admin app through a Cloudflare tunnel for remote demos. The repository ships helper scripts under `scripts/mac` to manage the tunnel:

- `tunnel_up.sh` runs the tunnel in the foreground for ad-hoc use.
- `tunnel_bg.sh` starts the tunnel in the background and tails logs to `infra/cloudflared/cloudflared.log`.
- `tunnel_down.sh` stops the background tunnel using the PID stored alongside the log file.

Before running any of the scripts:

1. Copy `infra/cloudflared/config.yml.example` to `infra/cloudflared/config.yml` and replace the placeholders with your tunnel details. The `${ADMIN_HOSTNAME}` placeholder expects an environment variable so that the same config can serve multiple hostnames.
2. Run `cloudflared login` and choose the zone that owns `${ADMIN_HOSTNAME}`. The login flow writes the credentials JSON referenced by the config file.

## 5. Future reverse-proxy plans

When you need an externally accessible reverse proxy, follow [`docs/local-caddy-cloudflare-tunnel.md`](./local-caddy-cloudflare-tunnel.md). It provides the Caddy configuration, Cloudflare Tunnel setup, Access policies, Supabase CORS updates, and rollback steps tailored for macOS. Future changes to the proxy workflow will be documented there.

