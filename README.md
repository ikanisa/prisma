# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/1b81869f-f7ae-4d22-99d2-79a60a4ddbf8

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1b81869f-f7ae-4d22-99d2-79a60a4ddbf8) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

## Environment Setup

This project requires Supabase credentials (shared with Lovable). Create a local `.env.local`
(ignored by git) by copying the provided `.env.example` and filling in the actual project values:

```sh
cp .env.example .env.local
```

Required variables:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (Supabase *anon* key – **replace the placeholder**)
- `VITE_SUPABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
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

### Agent learning & RAG additions

The agent-learning revamp introduces additional placeholders that must be configured before the
initial/continuous learning loops can run end-to-end. Add the following to your local `.env.local`
and deployment environments (values may remain blank until Google Drive access is provided):

- `GOOGLE_DRIVE_CLIENT_ID` – placeholder OAuth client id (configure when Drive access is ready)
- `GOOGLE_DRIVE_CLIENT_SECRET` – placeholder secret
- `GOOGLE_DRIVE_REFRESH_TOKEN` – placeholder refresh token (Drive sync disabled without it)
- `EMBED_MODEL` – defaults to `text-embedding-3-small`
- `AGENT_MODEL` – defaults to `gpt-4.1-mini`
- `RAG_SEARCH_TOP_K` – optional override for hybrid retrieval fan-out (default 12)
- `OPENAI_WEB_SEARCH_ENABLED` – set to `true` once OpenAI web search credentials are provisioned
- `OPENAI_WEB_SEARCH_MODEL` – optional custom web search model id (default `gpt-4.1-mini`)

> Until Google Drive credentials are supplied the ingestion pipeline runs in placeholder mode. The
> new endpoints/edge function will queue learning runs and emit knowledge events without fetching
> real documents. Web harvests also operate in placeholder mode until OpenAI web search is
> available. Swap the environment variables above with live credentials when the Drive workspace and
> web search access are connected.

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
