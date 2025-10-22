# Vercel footprint audit

## `rg "vercel"`
- `apps/web/vercel.json` defines Next.js build/install commands and health check route for the deployment. 【apps/web/vercel.json†L1-L11】
- `config/vercel-credentials.json` stores stubbed org/project/token values consumed by local tooling. 【config/vercel-credentials.json†L1-L5】
- `scripts/vercel-preflight.mjs` enforces env requirements, loads credentials, and runs `vercel pull`/`vercel build` (with optional stub mode). 【scripts/vercel-preflight.mjs†L1-L120】
- Deployment docs (`DEPLOYMENT_READINESS_REPORT.md`, `docs/deployment/prisma-vercel-supabase.md`, `audit/vercel-plan.md`) describe CI mirroring and helper scripts for Vercel. 【DEPLOYMENT_READINESS_REPORT.md†L29-L38】【docs/deployment/prisma-vercel-supabase.md†L127-L163】【audit/vercel-plan.md†L10-L32】
- `scripts/vercel-cli-stub.mjs` provides a mock CLI for offline builds. 【scripts/vercel-cli-stub.mjs†L8-L54】

## `rg "@vercel/"`
- No matches found.

## `rg "edge-runtime"`
- Only indirect dependency references via `@edge-runtime/vm` in `pnpm-lock.yaml`. 【pnpm-lock.yaml†L6596-L6604】

# Supabase usage inventory
- Frontend Supabase client created in `src/integrations/supabase/client.ts`; validates env, falls back to demo credentials, and exposes `isSupabaseConfigured`. 【src/integrations/supabase/client.ts†L1-L84】
- Server-side helper `apps/web/lib/supabase-server.ts` returns a cached service client, falling back to a stub if env or secret retrieval fails. 【apps/web/lib/supabase-server.ts†L1-L40】
- Secrets retrieved via Vault-backed manager in `lib/secrets/supabase.ts`. 【lib/secrets/supabase.ts†L1-L44】
- Required env variables validated in `apps/web/src/env.server.ts`, including Supabase URLs and keys with test fallbacks. 【apps/web/src/env.server.ts†L1-L104】
- Supabase database types generated under `supabase/src/integrations/supabase/types.ts`. 【supabase/src/integrations/supabase/types.ts†L1-L60】
