# Prisma Glow Workspace

Modern AI-powered operations suite with Supabase, FastAPI, and multi-app pnpm workspace tooling.

## Local Setup (Mac)

1. **Install prerequisites**
   - Install [Homebrew](https://brew.sh) if it is missing.
   - `brew install node@20 pnpm python@3.11 postgresql@15` provides the toolchain used in CI. Volta pins Node.js `18.20.4` for local parity; Node 20 is also validated in the workflows.
   - Optionally install [direnv](https://direnv.net) for environment variable management.
2. **Clone the repository**
   ```bash
   git clone <your-fork-url>
   cd prisma
   ```
3. **Install dependencies**
   ```bash
   pnpm install --frozen-lockfile
   ```
4. **Create your local environment file** by copying `.env.example` to `.env.local` and filling in credentials. See [docs/local-hosting.md](docs/local-hosting.md) for details.
5. **Start developing**
   - Web (Vite) shell: `pnpm dev`
   - Next.js app: `pnpm --filter web dev`
   - Gateway service: `pnpm --filter @prisma-glow/gateway dev`

More context on running the stack locally, including reverse-proxy plans, lives in [docs/local-hosting.md](docs/local-hosting.md).

## Environment Variables

The project loads configuration from `.env.local` for local runs and GitHub Actions/Compose secrets in automation. Copy the template first:

```sh
cp .env.example .env.local
```

### Core application

Required variables:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (Supabase *anon* key – **replace the placeholder**)
- `VITE_SUPABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ALLOW_STUB` (optional; set to `true` locally to enable the stub Supabase client when credentials are missing)
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL` (Postgres connection string for the Supabase instance)
- `OPENAI_API_KEY` (RAG embedding service)
- Optional: `API_RATE_LIMIT` (default 60 req/min), `API_RATE_WINDOW_SECONDS`,
  `SIGNED_URL_DEFAULT_TTL_SECONDS` (default 300s) and `SIGNED_URL_EVIDENCE_TTL_SECONDS`
  to control signed URL expiry windows.
- Optional alerts: `RATE_LIMIT_ALERT_WEBHOOK` for Express rate-limit breaches and
  `TELEMETRY_ALERT_WEBHOOK` for telemetry/SLA warnings (fallbacks to
  `ERROR_NOTIFY_WEBHOOK` if unset).
- Optional security headers: `ALLOWED_HOSTS` (comma-separated) to enable trusted host
  enforcement at the FastAPI layer.
- Optional assistant/knowledge throttles: `ASSISTANT_RATE_LIMIT`,
  `ASSISTANT_RATE_WINDOW_SECONDS`, `DOCUMENT_UPLOAD_RATE_LIMIT`,
  `DOCUMENT_UPLOAD_RATE_WINDOW_SECONDS`, `KNOWLEDGE_RUN_RATE_LIMIT`,
  `KNOWLEDGE_RUN_RATE_WINDOW_SECONDS`, `KNOWLEDGE_PREVIEW_RATE_LIMIT`,
  `KNOWLEDGE_PREVIEW_RATE_WINDOW_SECONDS`, `RAG_INGEST_RATE_LIMIT`,
  `RAG_INGEST_RATE_WINDOW_SECONDS`, `RAG_REEMBED_RATE_LIMIT`,
  `RAG_REEMBED_RATE_WINDOW_SECONDS`, `RAG_SEARCH_RATE_LIMIT`,
  `RAG_SEARCH_RATE_WINDOW_SECONDS`, `AUTOPILOT_SCHEDULE_RATE_LIMIT`,
  `AUTOPILOT_SCHEDULE_RATE_WINDOW_SECONDS`, `AUTOPILOT_JOB_RATE_LIMIT`, and
  `AUTOPILOT_JOB_RATE_WINDOW_SECONDS`.

## Run Commands

- `pnpm install --frozen-lockfile` – install workspace dependencies.
- `pnpm run typecheck` – project-reference typecheck (`tsc -b`) for gateway, shared packages, and services; the script cleans the incremental build artefacts afterwards.
- `pnpm --filter web typecheck` – Next.js typecheck (fails until the web workspace cleans up its outstanding TS debt).
- `pnpm run lint` – lint the monorepo.
- `pnpm run test` or `pnpm run coverage` – execute Vitest suites (coverage gate lives in CI).
- `pnpm run build` – build shared packages and the Vite bundle (`tsc -b` runs first).
- `pnpm run preview` – serve the production bundle locally.
- `pnpm --filter <workspace>` – scope commands to a specific app (e.g. `pnpm --filter web build`).
- `pnpm --filter @prisma-glow/gateway dev` – start the Express gateway for local API smoke tests.

Git hooks, CI, and deployment workflows now rely on pnpm exclusively; make sure your local environment mirrors the lockfile versions.

## Supabase Notes

- Database migrations live in `supabase/migrations` (SQL) and `apps/web/prisma/migrations` (Prisma). Use `pnpm --filter web run prisma:migrate:dev` for iterative schema work and `pnpm --filter web run prisma:migrate:deploy` in CI.
- Stub mode (`SUPABASE_ALLOW_STUB=true`) lets UI developers work without live Supabase credentials; gateway and FastAPI continue to guard privileged routes.
- Policy tests reside in `scripts/test_policies.sql`. Run them with `pnpm run config:validate` + manual `psql` or trigger the GitHub Action with `run_pgtap=true` once pgTAP is installed.
- Supabase client keys should stay in `.env.local` (or GitHub secrets) only; never commit Supabase secrets.

## Summary of Vercel removal

- All Vercel-specific GitHub workflows and preview deployments have been removed from this repository.
- Continuous integration now standardises on pnpm for install/typecheck/lint/build gates via `pnpm run ci:verify` (which now calls the monorepo `typecheck`).
- Production hosting is driven by Docker/Compose and manual GitHub Actions deployments (see `.github/workflows/compose-deploy.yml`).
- Local preview flows are documented in [docs/local-hosting.md](docs/local-hosting.md); reverse proxies will be introduced there when ready.

The sections below retain the deep-dive environment details and operational runbooks referenced throughout the monorepo.

### Agent learning & RAG additions

The agent-learning revamp introduces additional placeholders that must be configured before the
initial/continuous learning loops can run end-to-end. Add the following to your local `.env.local`
and deployment environments (values may remain blank until Google Drive access is provided):

- `GOOGLE_DRIVE_CLIENT_ID` – placeholder OAuth client id (configure when Drive access is ready)
- `GOOGLE_DRIVE_CLIENT_SECRET` – placeholder secret
- `GOOGLE_DRIVE_REFRESH_TOKEN` – placeholder refresh token (Drive sync disabled without it)
- `EMBED_MODEL` – defaults to `text-embedding-3-small`
- `AGENT_MODEL` – defaults to `gpt-5-mini`
- `RAG_SEARCH_TOP_K` – optional override for hybrid retrieval fan-out (default 12)
- `OPENAI_WEB_SEARCH_ENABLED` – set to `true` once OpenAI web search credentials are provisioned
- `OPENAI_WEB_SEARCH_MODEL` – optional custom web search model id (default `gpt-5`)
- `OPENAI_DEFAULT_REASONING_EFFORT` – optional global Responses API reasoning effort (`minimal`/`low`/`medium`/`high`; default `low`)
- `OPENAI_DEFAULT_VERBOSITY` – optional global verbosity control (`low`/`medium`/`high`; default `medium`)
- `OPENAI_AGENT_REASONING_EFFORT` / `OPENAI_AGENT_VERBOSITY` – override agent run behaviour when GPT-5 handles multi-step workflows
- `OPENAI_SUMMARY_REASONING_EFFORT` / `OPENAI_SUMMARY_VERBOSITY` – override summarisation and policy-check defaults

> Until Google Drive credentials are supplied the ingestion pipeline runs in placeholder mode. The
> new endpoints/edge function will queue learning runs and emit knowledge events without fetching
> real documents. Web harvests also operate in placeholder mode until OpenAI web search is
> available. Swap the environment variables above with live credentials when the Drive workspace and
> web search access are connected. The production environment has live credentials with `OPENAI_WEB_SEARCH_ENABLED=true`
> and a 14-day cache retention policy driven by `WEB_FETCH_CACHE_RETENTION_DAYS`.

### OpenAI agent platform & streaming toggles

The HITL agent rollout introduces additional OpenAI flags. Enable them progressively alongside the
phase guides (`docs/openai-phase0.md` → `docs/openai-phase4.md`):

- `OPENAI_AGENT_PLATFORM_ENABLED`, `OPENAI_AGENT_ID` – synchronise the Supabase tool registry with
  an OpenAI Agent when Platform access is granted (Phase 1).
- `OPENAI_DEBUG_LOGGING`, `OPENAI_DEBUG_FETCH_DETAILS` – persist OpenAI request metadata to
  `openai_debug_events` and optionally call the Debugging Requests API for enriched payloads
  (Phase 0 observability).
- `OPENAI_STREAMING_ENABLED` – unlocks `/api/agent/stream` and the streaming playground in
  `/agent-chat` (Phase 2).
- `OPENAI_STREAMING_TOOL_ENABLED` – emits tool start/result events alongside text deltas (Phase 4
  preview; requires the base streaming flag).
- `OPENAI_REALTIME_ENABLED`, `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_VOICE`, `OPENAI_REALTIME_TURN_SERVERS` – allow
  `/api/agent/realtime/session` to issue ephemeral secrets for Realtime experiments (Phase 3).
- `OPENAI_TRANSCRIPTION_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, `OPENAI_TTS_FORMAT` – configure speech-to-text and text-to-speech loops for ChatKit sessions.
- `OPENAI_SORA_ENABLED`, `OPENAI_SORA_MODEL`, `OPENAI_SORA_ASPECT_RATIO` – enable the Sora preview
  route (`/api/agent/media/video`) when video access is available (Phase 4 optional).
- `OPENAI_ORCHESTRATOR_ENABLED` – exposes multi-agent planning routes
  (`/api/agent/orchestrator/*`).
- `ORCHESTRATION_POLL_INTERVAL_MS` – controls how frequently the MCP scheduler assigns pending
  tasks (default 15000ms); set to `0` to disable background polling.

### System configuration overrides

Backend services read `config/system.yaml` for autonomy, RLS, and agent policy defaults. Set
`SYSTEM_CONFIG_PATH` to point to an alternate file or directory containing `system.yaml` whenever
you need to test or run with a customised configuration bundle.

### Backend development environment

The FastAPI/RQ services depend on the packages listed in `server/requirements.txt`. To run `pytest`
or start the API locally, create a virtualenv and install them once:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r server/requirements.txt
```

The repository ships with `pytest.ini` so running `pytest` from the repo root works without extra
`PYTHONPATH` tweaks. Install the requirements before invoking the tests to avoid import errors
(e.g. missing `fastapi`).

#### Shared system configuration loader

Node services load `config/system.yaml` through the shared helpers in
`packages/system-config/`. Import `getGoogleDriveSettings`, `getUrlSourceSettings`, or
`getBeforeAskingSequence` to access normalised settings. The helpers honour `SYSTEM_CONFIG_PATH`
and cache results for 60 seconds.

> Optional: AI features (RAG reranker) attempt to load `sentence-transformers`. Install it alongside
> PyTorch if you need reranking locally; otherwise the code will fall back gracefully.

### Node workspace layout

The repository now uses a pnpm workspace (see `pnpm-workspace.yaml`). Packages live under:

- `apps/gateway` – Express edge service (depends on `@prisma-glow/system-config`)
- `apps/web` – Front-end (Vite/React)
- `services/rag` – Node agent/RAG runtime
- `packages/system-config` – Shared configuration helper for system.yaml
- `packages/api-client` – Typed client generated from FastAPI OpenAPI
- `packages/ui` – Minimal shared UI components for reuse across apps

Install dependencies with `pnpm install` (or continue using npm for the front-end if preferred).
Workspace packages expose `build` scripts that rely on the top-level TypeScript toolchain.

### Observability

All services support OpenTelemetry and Sentry. Recommended environment variables:

- `OTEL_SERVICE_NAME` (e.g. `gateway`, `rag-service`, `fastapi-api`)
- `OTEL_EXPORTER_OTLP_ENDPOINT` (e.g. `https://otel-collector:4318/v1/traces`)
- `OTEL_TRACES_SAMPLER` (e.g. `parentbased_always_on`, `parentbased_traceidratio`)
- `OTEL_TRACES_SAMPLER_ARG` (e.g. `0.1` when using ratio sampler)
- `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`
- Resource attributes are standardised across services: `service.name`, `service.namespace=prisma-glow`, `deployment.environment`, `service.version`.

User agent and correlation:

- Gateway forwards `Authorization`, `X-Request-ID`, `X-Trace-ID`, and W3C `traceparent`/`tracestate` headers to FastAPI.
- Gateway sets a service user agent on upstream requests: `prisma-glow-gateway/<SERVICE_VERSION>`.
- Ensure `SERVICE_VERSION` is set in runtime (CI uses the commit SHA). When running on a managed host (the retired Vercel deployment or future PaaS targets), set it as an environment variable so traces include `service.version`.

Versioning for trace correlation:

- `SERVICE_VERSION` is included in emitted traces as `service.version`.
- In CI, it is set to the commit SHA. In Docker builds, it is passed as a build arg and baked as an OCI label.
- For local/dev, set `SERVICE_VERSION=$(git rev-parse --short HEAD)` or leave it unset to default to `dev`.

### Local Docker (compose)

Use the provided Makefile targets to run the local stack with version metadata:

- `make print-version` — prints derived `SERVICE_VERSION` (short git SHA or `dev`).
- `make compose-dev-up` — builds and starts the dev stack with `SERVICE_VERSION` propagated to images.
- `make compose-dev-down` — stops and removes the dev stack.
- `make compose-dev-logs` — tails logs for gateway, rag, agent, analytics.

You can override the version explicitly: `SERVICE_VERSION=feature123 make compose-dev-up`.

Frontend selection with profiles:

- Legacy Vite UI (default previously): `docker compose --profile ui up -d`
- New Next.js web app: `docker compose --profile web up -d`

Only one of `ui` or `web` should be active at a time since both bind to port 3000.
The compose files mark these services under distinct profiles so you can choose during `up`.

### Production Compose

Use the provided `docker-compose.prod.yml` with an env file describing image tags and version:

1) Prepare `.env.compose` from `.env.compose.example` and set image refs (e.g., GHCR):

```
cp .env.compose.example .env.compose
# edit to set ghcr.io/<owner>/<repo>/<service>:<tag>
```

2) Launch with your chosen frontend profile (`web` for Next.js, `ui` for legacy Vite):

```
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml up -d
```

3) To switch frontends, stop the current profile and start the other:

```
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml down
docker compose --env-file .env.compose --profile ui  -f docker-compose.prod.yml up -d
```

Compose Deploy via GitHub Actions (optional)

- Create repository secrets:
  - `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (private key for SSH), and `COMPOSE_ENV` (contents of your `.env.compose`).
- Trigger the workflow "Compose Deploy (SSH)" manually and select `profile` (web/ui) and `deploy_path`.
- The workflow uploads `docker-compose.prod.yml` and the env to the remote host and runs `docker compose pull && up -d`.

Rollback support: provide `rollback_tag` (commit SHA or tag) when triggering the workflow to update all image tags in the remote env file before deploy. Locally, use:

```
make compose-prod-rollback ROLLBACK_TAG=<sha> FRONTEND_PROFILE=web
```


Gateway → FastAPI proxying uses `FASTAPI_BASE_URL` (or `API_BASE_URL`) to target the Python API.

Gateway exposes `/health` and `/readiness`; the RAG service and FastAPI expose the same. CI includes
synthetic checks that will hit these endpoints when `SYNTHETIC_*_URL` secrets are provided.

Sentry dry-run endpoints (guarded by `ALLOW_SENTRY_DRY_RUN=true`):

- Gateway: `POST /v1/observability/dry-run`
- RAG: `POST /v1/observability/dry-run`
- FastAPI: `POST /v1/observability/dry-run`

### API Contracts (OpenAPI → TS Types)

- FastAPI OpenAPI is exported to `openapi/fastapi.json` using `server/export_openapi.py`.
- TypeScript types for the API client are generated into `packages/api-client/types.ts` via `openapi-typescript`.
- CI enforces that OpenAPI export and generated types are drift-free. If either changes, the job fails so PR authors can commit the updates.
- Gateway consumes the typed client for core proxies (autonomy, release-controls, tasks, files, knowledge) and forwards auth + trace headers end-to-end.

The Agent Approvals UI (`/agent/approvals`) surfaces pending tool reviews and tool registry toggles.
Governance details live in `STANDARDS/POLICY/agent_hitl.md`, with execution guidance captured in
`CHECKLISTS/AGENT/agent_hitl_acceptance.md` and the validation steps under
`TEST_PLAN.md#agent-hitl-hitl-1`.

### Idempotency and Retries

- Gateway enforces idempotency for POST/PUT/PATCH when clients send `X-Idempotency-Key`.
- Upstream calls from gateway to FastAPI include a small, bounded retry with backoff for transient statuses (429/502/503/504).
- See `apps/gateway/src/middleware/idempotency.ts` and `packages/api-client/index.ts` for behavior.

### Deploying Supabase credentials to Lovable

Add the same values to your Lovable deployment under **Project → Settings → Environment** so the
hosted app can connect to Supabase. Set `VITE_ENABLE_PWA=true` in production to restore the PWA
bundle Lovable expects; locally it can remain `false` to avoid Workbox build failures when testing
offline features.

### Applying database migrations

The SQL migrations in `supabase/migrations/` must be applied to the Supabase Postgres instance. If
you have network access to the database you can run:

```bash
psql "postgresql://postgres:rnUor1Vzr06galzC@db.xzwowkxzgqigfuefmaji.supabase.co:5432/postgres" \
  -f supabase/migrations/<timestamp>_<name>.sql
```

Apply the files in chronological order. (From this environment the Supabase endpoint is not
reachable – DNS resolution fails – so run the commands from a machine with outbound access.)

The repository now seeds `web_knowledge_sources` with a Malta-focused catalogue (IFRS/ISA/Tax/MFSA
publications). The RAG service exposes `/v1/knowledge/web-sources` and `/v1/knowledge/web-harvest`
so the UI can schedule OpenAI web-search powered ingestions once the feature is enabled.

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1b81869f-f7ae-4d22-99d2-79a60a4ddbf8) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Testing

Run the Python test suites:

```bash
pytest
```

## CI gating & RLS policy tests

GitHub Actions (`.github/workflows/ci.yml`) runs linting, Vitest (with coverage thresholds), and
pgTAP policy tests. The policy step connects to a staging database via the
`STAGING_DATABASE_URL` secret. Without this secret the workflow fails fast, so be sure to configure
it in the repository/organization secrets. Locally you can run the same check with:

```bash
psql "$STAGING_DATABASE_URL" -f scripts/test_policies.sql
```

Vitest coverage thresholds are enforced through `npm run coverage`, which
honours `TARGET_STATEMENTS`, `TARGET_BRANCHES`, `TARGET_FUNCTIONS`, and
`TARGET_LINES` (defaults 45/40/45/45). Run the script locally before opening a
PR so the CI job matches your results.

## Performance harness

The Phase 4 load scenarios live in `tests/perf/*.js`. The helper script
`scripts/perf/run_k6.sh` wraps k6 execution, exporting JSON summaries under
`docs/PERF/<timestamp>/`:

```bash
./scripts/perf/run_k6.sh ada recon telemetry
```

Set the environment variables referenced inside each scenario (for example
`K6_BASE_URL`, `ACCESS_TOKEN`, `K6_ORG_ID`, `K6_ENG_ID`). The exported JSON files
should be attached to the performance evidence pack described in
`docs/performance-uat-plan.md`.

## Playwright smoke tests

UI smokes can be executed against any environment with:

```bash
PLAYWRIGHT_BASE_URL="https://staging.example.com" \
PLAYWRIGHT_SMOKE_PATHS="/,/login" \
npm run test:playwright
```

The suite defaults to `http://localhost:3000` and probes the provided routes,
skipping gracefully if the target environment is unreachable. HTML reports are
written to `playwright-report/` when running in CI.

> CI expects the `PLAYWRIGHT_BASE_URL` secret (and optional
> `PLAYWRIGHT_SMOKE_PATHS`) so the GitHub Action can run the smoke job.

## Curl smoke tests

Assuming the service is running locally on port 8000:

```bash
# RAG ingest
curl -X POST http://localhost:8000/rag/ingest -H "Content-Type: application/json" -d '{"text":"sample"}'

# RAG search
curl "http://localhost:8000/rag/search?q=VAT"

# Agent routing
curl "http://localhost:8000/route?q=What%20is%20the%20current%20VAT%20rate%20in%20the%20UK?"

# VAT evaluator
curl -X POST http://localhost:8000/vat/evaluate -H "Content-Type: application/json" -d '{"question":"What is the current VAT rate in the UK?"}'

# Idempotent request
curl -X POST http://localhost:8000/process -H "Idempotency-Key: test-1" -d '{"payload":"data"}'

# Rate limit check
curl -I http://localhost:8000/ratelimit/test
```
