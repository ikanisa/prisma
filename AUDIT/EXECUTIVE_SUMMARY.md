# Executive Summary

**Project health:** The codebase spans a Vite SPA, a partially scaffolded Next.js app, Python (FastAPI) + Node (Express) services, and Supabase SQL. Implementation depth is uneven: most domain features are UI mock-ups or placeholder services without persistence, while production secrets are embedded directly in source. Operational hygiene (branch backlog, dependency drift, missing env controls) has lapsed.

## Top Risks (next 30 days)
1. **Supabase credentials committed to source (Critical).** The public client (`src/integrations/supabase/client.ts:5`) hard-codes the project URL and anon key; `.gitignore` omits `.env.local`, so rotations are likely to leak again. Anyone cloning the repo can read/write tenant data unless RLS catches every path.
2. **Unauthenticated service endpoints (High).** The FastAPI RAG API (`server/main.py:34-89`) and Express ingestion service (`services/rag/index.ts:20-150`) are internet-facing, CORS-open, and lack auth or tenancy enforcement. A single request can exhaust OpenAI quota or poison embeddings.
3. **Document & storage flows are stubs (High).** The “Documents” UI (`src/pages/documents.tsx:1-162`) writes to in-memory state only; the file hook (`src/hooks/use-file-upload.ts:12-74`) fakes uploads. There is no Supabase Storage bucket, signed URL issuance, or activity logging despite blueprints expecting them.
4. **Multi-service drift with no authoritative deployment story (Medium).** Main build targets the Vite SPA, yet `/apps/web` Next 14 app and multiple backend services exist with conflicting auth narratives (NextAuth Keycloak vs Supabase email/password). Without alignment, environments will fracture.
5. **Dependency backlog & branch debt (Medium).** Twenty-two open PRs (most Dependabot major upgrades) and numerous long-lived `codex/*` branches leave main behind on security updates (e.g., `multer@1.x`). Automated updates cannot land because there is no CI and merges conflict.

## Recommended Path & Timeline
- **Week 1 (Safety sprint):** Rotate Supabase keys, move env secrets out of source, restore `.gitignore` coverage, lock down service endpoints with Supabase auth + per-org guards, upgrade `multer`/`esbuild`, and enforce consistent RLS helpers.
- **Week 2–3 (Core hardening):** Centralize tenancy-aware data access (server-side helpers), add indexes + pagination, normalise error handling/logging, and cut bundle size (code-split + remove dead Next app or finish migration).
- **Week 4–6 (Feature completion):** Implement real document storage & activity logs, finish compliance evaluator exports, and build the accounting close/audit workflows called out in the blueprint.
- **Week 7–8 (Ops & readiness):** Stand up CI, add k6 performance budgets, ship monitoring/runbooks, and formalize SLOs + deployment pipeline.

Stakeholders should reserve a dedicated cross-functional squad for the first two phases; later phases can parallelize once env hygiene and auth boundaries are trustworthy.
