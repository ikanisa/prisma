# Full-Stack Audit Report

## Codebase Overview & Structure
- **Front-end:** Primary SPA under `src/` built with Vite + React 18, shared UI components in `src/components/ui`. A parallel Next.js app lives in `apps/web/` but is skeletal (e.g., `apps/web/app/dashboard/page.tsx:1-9` renders placeholder text).
- **Back-end services:** Python FastAPI service (`server/main.py:1-93`) handles RAG ingestion/search with OpenAI, Redis queues, and OTEL plumbing. A separate Express service (`services/rag/index.ts:1-154`) duplicates RAG endpoints using `multer` and pgvector. Analytics service stubs exist in `services/analytics/` with placeholder auth.
- **Supabase artifacts:** SQL migrations (`supabase/migrations/`) define core tables, RLS helpers, and indexes. No Prisma schema is active on main; previous attempts remain stashed.
- **Other assets:** Documentation scaffolding (`DATA_MODEL.md`, `IMPLEMENTATION_PLAN.md`), tests for Python modules, and various Dockerfiles.

### Key Observations
1. The Vite SPA consumes Supabase directly via a generated client, whereas the Next.js app assumes Keycloak via NextAuth. The two auth models conflict and there is no routing glue.
2. Many services are placeholders (e.g., analytics admin guard always returns `True` in `services/analytics/api.py:9-18`).
3. There is no central configuration registry—environment access is ad hoc across Node, Python, and browser bundles.

## Dependency Health & Security Summary
- `npm ci` completed with warnings: `multer@1.4.5-lts.2` is deprecated with known vulnerabilities, and `node-domexception@1.0.0` is obsolete.
- `npm audit --production` reports **2 moderate** vulnerabilities via `esbuild <=0.24.2`, transitively affecting Vite.
- Python dependencies (`services/analytics/requirements.txt`, `server/requirements.txt`) pin broad ranges (`fastapi`, `openai`) without lock files, increasing drift risk.
- 22 open Dependabot PRs indicate unattended updates for React 19, Next 15, Tailwind 4, GitHub Actions, etc. Without CI these cannot be validated automatically.

## Auth / RBAC / RLS Findings
- Supabase RLS helpers `public.is_member_of` & `public.has_min_role` are defined in `supabase/migrations/20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql:95-166` and applied to core tables (organizations, memberships, clients, engagements, tasks, documents, notifications, activity_log).
- Gaps:
  - **System admin detection** relies on `public.users.is_system_admin`, but the SPA never fetches this safely; clients call Supabase directly using anon key.
  - `documents_delete` policy (`supabase/migrations/...:222-232`) allows any uploader to delete without managerial oversight; there is no soft-delete or activity logging enforcement.
  - Additional tables introduced in `supabase/blueprint.sql` (e.g., `public.accounting`, `public.tax`, `public.audit`) rely on the same helpers but there is no application layer using them.
- FastAPI/Express services bypass Supabase altogether; they trust bearer-less HTTP requests and operate on Postgres directly (`services/rag/index.ts:38-103`), ignoring tenant scopes.

## Storage & Signed URLs
- No Supabase Storage integration exists. Document upload UI is client-only state (`src/pages/documents.tsx:20-92`), and the hook `src/hooks/use-file-upload.ts:23-72` mocks upload progress and returns `URL.createObjectURL`—no persistence, no ACLs.
- No signed URL helper or TTL enforcement is implemented; even the compliance evaluator API is local-only.
- Bucket `documents` is not provisioned in SQL or code. There is no server code generating signed URLs or writing ActivityLog entries.

## API & Server Actions
- **FastAPI (`server/main.py`)** exposes `/v1/rag/ingest` and `/v1/rag/search` with wide-open CORS (`allow_origins=['*']`). There is no Supabase session validation or rate limiting beyond an embedding limiter inside `server/rag.py:34-68`.
- **Express RAG service** duplicates functionality but also lacks authentication, error telemetry, or request validation; chunk writes go straight to Postgres with `await db.query('BEGIN')` but no schema-level RLS.
- **Graph/UI APIs**: The SPA routes call Supabase directly from the browser. There are no server actions to guard multi-tenant operations, so security depends entirely on RLS.
- **Error handling:** Many endpoints simply `console.error` and return 500; no structured logging or correlation IDs despite `structlog` imports.

## Database & Prisma
- Core schema defined in SQL migrations; there is no Prisma schema on main. Enums (`public.role_level`) exist, and tables include `created_at/updated_at` triggers.
- Missing indexes: `public.documents`, `public.tasks`, `public.engagements`, and `public.memberships` lack composite indexes on `(org_id, created_at/status)` leading to sequential scans under load.
- Some migrations add indexes for analytics tables (`supabase/migrations/003_indexes.sql`), but they exclude high-traffic tables like `clients` and `notifications`.
- Multi-tenancy relies on `org_id` foreign keys; referential integrity is enforced. However, there is no migration covering Supabase Storage path metadata.

## Compliance Engine
- Config packs added under `apps/web/public/configs/compliance/*.json` define Malta VAT/CIT and GAPSME checklists with metadata, validations, and calculations.
- Evaluator (`apps/web/lib/compliance/evaluator.ts`) parses a restricted expression language: arithmetic, logical ops, `sum`, `max`, and `round`. It avoids `eval`, but lacks explicit numeric coercion on arrays (arrays returned from `sum` path expansion are flattened). Unknown identifiers resolve silently to `undefined`, which may mask typos.
- API endpoint (`apps/web/app/api/compliance/eval/route.ts`) is server-side (Next 14 route handler) but there is no auth guard; any caller can hit it. It loads configs from the file system, not the database.
- Demo page (`apps/web/app/compliance/page.tsx`) is client-side only and uses fetch API without session context.

## Accounting / Audit / Tax Features
- Dashboard UIs for engagements, tasks, accounting, and audit exist only as static mock-ups; there are no API routes or persistence layers hooking into Supabase tables.
- No CSV importers, journal posting, trial balance, or period lock mechanisms are implemented.
- “Audit & checklists” features referenced in docs are absent; checklists are simple lists in the SPA without workflow state.
- E-signature, OTP flows, client portal approvals, and archive/handoff zip features are unimplemented.

## PWA / Accessibility / UX
- `public/manifest.json` exists, but service worker (`public/sw.js`) caches `/static/js/bundle.js`/`/auth/sign-in`—paths that do not exist in the Vite build, so offline caching will 404.
- Large components (e.g., `src/components/ui/sidebar.tsx:1-761`) hamper accessibility and maintainability.
- Keyboard accessibility is inconsistent; some buttons use `<div role="button">` without `aria` fallbacks (e.g., compliance pack cards in `apps/web/app/compliance/page.tsx:59-104` rely on JS to handle key events, but the rest of the app lacks similar care).

## Observability & Ops
- Structured logging via `structlog` is configured but rarely used; most handlers rely on `console.log`/`console.error` or no logging at all.
- Sentry is initialised (`server/main.py:21-22`) but errors in Express service and SPA are not captured.
- No health checks or readiness probes despite claims in docs; `server/main.py` lacks `/healthz`.
- No CI workflows active; multiple PRs propose GitHub Actions but remain unmerged.

## Performance Risks & Suggested Indexing/Caching
- Build output warns of a 920 kB main bundle (Vite build log) due to all pages/components in one chunk; no dynamic imports or code splitting.
- Supabase queries in hooks (`src/hooks/use-organizations.ts:42-57`) fetch entire memberships with nested organizations without pagination or caching.
- Absence of HTTP caching headers or stale-while-revalidate for document/compliance endpoints.
- SQL layer lacks indexes on `memberships(org_id, user_id)` beyond unique constraint and no `notifications(org_id, created_at)` index.

## Secret Handling & Governance
- Supabase URL + anon key committed at `src/integrations/supabase/client.ts:5-12`.
- `.gitignore` only ignores `.env`, not `.env.local` or `.env.*` (see `.gitignore:23-31`), increasing risk of leaking environment-specific creds.
- No secret scanning or commit hooks. Historical commits already include Supabase keys; rotation is mandatory.

## Final Risk Table
| ID | Title | Severity | Owner | Recommended Fix |
| --- | --- | --- | --- | --- |
| R1 | Supabase credentials stored in repo (`src/integrations/supabase/client.ts:5-12`) | Critical | Unassigned | Move keys to env vars, rotate anon/service keys, update `.gitignore` to cover `.env.*`, regenerate generated client during build. |
| R2 | Unauthenticated RAG endpoints (`server/main.py:41-87`, `services/rag/index.ts:46-123`) | High | Unassigned | Require Supabase JWT verification + org scope on every request, enforce rate limits, and disable duplicate Express service until secured. |
| R3 | Document storage is non-functional (`src/hooks/use-file-upload.ts:23-72`) | High | Unassigned | Implement Supabase Storage uploads via server action, capture ActivityLog, enforce signed URL TTL ≤120s, and cover with tests. |
| R4 | Client-only tenancy enforcement (`src/hooks/use-organizations.ts:37-70`) | High | Unassigned | Introduce server-side helpers that inject `org_id` filters, remove direct browser writes to privileged tables, and gate actions by role. |
| R5 | Vulnerable/outdated packages (e.g., `multer@1.4.5-lts.2` in `services/rag/index.ts:3`) | Medium | Unassigned | Upgrade to Multer 2.x, patch Vite/esbuild, and automate audit checks in CI. |
| R6 | Service worker caches invalid assets (`public/sw.js:4-47`) | Medium | Unassigned | Regenerate SW using Vite PWA plugin or remove until offline support designed, to avoid stale/404 behaviour. |
| R7 | No CI / merge backlog (22 open PRs) | Medium | Unassigned | Stand up GitHub Actions for lint/build/test, triage stale PRs, and enforce branch protection. |
| R8 | Oversized UI modules & no pagination (`src/components/ui/sidebar.tsx:1-761`, `src/pages/documents.tsx:104-145`) | Low | Unassigned | Split components, add pagination/virtualization, and document UX guidelines. |
