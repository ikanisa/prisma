# Prisma Glow Workspace - Copilot Agent Instructions

## Repository Overview

**Prisma Glow** is a modern AI-powered operations suite built as a monorepo workspace. The codebase is a full-stack TypeScript/Python application with:
- **Frontend**: React + Vite (legacy UI) and Next.js (apps/web)
- **Backend**: FastAPI (Python 3.11+) and Express.js gateway
- **Database**: PostgreSQL via Supabase with Prisma ORM
- **AI/RAG**: OpenAI integration with custom agent platform
- **Infrastructure**: Docker Compose, Cloudflare Tunnel, pnpm workspace (15 packages)

**Repository size**: ~1,700+ npm packages, multiple Docker services (gateway, rag, agent, analytics, ui, web)

**Key technologies**: TypeScript 5.9, React 18, Next.js, FastAPI, Supabase, OpenAI, pnpm 9.12.3, Node.js 22.12.0, Python 3.11, PostgreSQL 15, Redis 7

## Critical Setup & Runtime Requirements

### Required Versions
- **Node.js**: 22.12.0 (enforced by Volta in package.json; CI uses 20.19.4 but local dev expects 22.12.0)
- **pnpm**: 9.12.3 (install via `npm install -g pnpm@9.12.3`)
- **Python**: 3.11+ (3.12 works; backend and analytics use Python)
- **PostgreSQL**: 15 (Supabase migrations)

### Installation
**ALWAYS** run `pnpm install --frozen-lockfile` after cloning or pulling changes. This installs 1,700+ dependencies and takes 2-3 minutes.

## Build & Validation Commands

### Core Workflows (in order)
1. **Install dependencies**: `pnpm install --frozen-lockfile` (ALWAYS run first)
2. **Typecheck**: `pnpm run typecheck` (validates TypeScript without emitting files; fast ~5s)
3. **Lint**: `pnpm run lint` (runs ADR checker + ESLint; requires installed deps)
4. **Test**: `pnpm run test` (Vitest unit tests)
5. **Coverage**: `pnpm run coverage` (Vitest with coverage gates: 45/40/45/45 statements/branches/functions/lines)
6. **Build**: `pnpm run build` (runs `tsc -b` then Vite bundle)
7. **Config validation**: `pnpm run config:validate` (validates config/system.yaml; may fail locally if yaml dep missing, safe to skip)

### Workspace Commands
- **Recursive build/lint/test**: `pnpm run ci:verify` (runs lint/test/build across all workspaces)
- **Per-workspace**: `pnpm --filter <workspace> <command>` (e.g., `pnpm --filter web build`)
- **Turbo**: `pnpm turbo run build --filter=@prisma-glow/gateway...` (builds with dependencies)

### Python Backend
**Setup virtualenv first** (only once per clone):
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r server/requirements.txt
```

**Run tests**: `pytest` (from repo root; pytest.ini configures PYTHONPATH automatically)

**Start FastAPI**: `uvicorn server.main:app --reload --port 8000` (or use `server.health_app:app` for smoke tests)

## CI/CD Pipelines

### Main CI Workflow (.github/workflows/ci.yml)
- **build-test**: Lint, typecheck, coverage (Vitest), build, bundle size check, pgTAP policy tests
- **migration-smoke**: Applies Supabase migrations to ephemeral PostgreSQL
- **openapi-client**: Exports FastAPI OpenAPI, generates TypeScript types, enforces drift-free
- **next-web**: Builds Next.js app, validates Prisma schema, runs Prisma generate
- **ui-smoke**: Playwright tests (requires `PLAYWRIGHT_BASE_URL` secret)
- **agent-manifests**: Publishes OpenAI agent manifests on main branch
- **fastapi-smoke**: Health checks for FastAPI with PostgreSQL/Redis services

### Workspace CI Workflow (.github/workflows/workspace-ci.yml)
- Runs parallel jobs: gateway build/lint/test, RAG build/lint, web tests, Node package tests, Deno (Supabase functions), gateway smoke, FastAPI smoke, backend pytest (60% coverage gate), DB migrations + pgTAP, OpenAPI codegen, Playwright core journeys, Artillery load tests, analytics tests, k6 RAG smoke

### Other Workflows
- **prisma-migrate.yml**: Prisma migrations for apps/web
- **supabase-migrate.yml**: Supabase migrations
- **docker-build.yml**: Multi-platform Docker image builds
- **compose-deploy.yml**: Deploys via SSH to remote host with docker-compose
- **healthz-smoke.yml**: Synthetic health checks
- **pwa-audit.yml**: PWA/Lighthouse audits
- **ci-secret-guard.yml**: Secret scanning

## Project Layout

### Root Files
- `package.json`: Root workspace config, defines scripts (dev, build, lint, test, coverage)
- `pnpm-workspace.yaml`: Workspace packages (analytics, apps/*, services/*, packages/*)
- `turbo.json`: Turbo build orchestration config
- `tsconfig.base.json`, `tsconfig.json`: Root TypeScript configs
- `vite.config.ts`, `vitest.config.ts`: Vite and Vitest configs
- `eslint.config.js`: ESLint config (TypeScript-ESLint 8, React hooks/refresh)
- `playwright.config.ts`: Playwright e2e test config
- `Makefile`: Docker Compose helpers, version management
- `.env.example`, `.env.development.example`, `.env.production.example`: Environment templates

### Source Structure
- **apps/web/**: Next.js app (app router, Prisma client, server actions)
- **apps/gateway/**: Express.js API gateway (proxies to FastAPI, handles auth/tracing)
- **services/rag/**: Node.js RAG service (OpenAI embeddings, vector search)
- **packages/**: Shared libs (api-client, system-config, logger, lib, ui, agents, platform, tax, config)
- **server/**: FastAPI backend (api/, workflows/, main.py, health_app.py)
- **src/**: Legacy Vite UI components
- **supabase/migrations/**: Supabase SQL migrations (applied sequentially)
- **migrations/sql/**: Consolidated SQL migrations
- **scripts/**: Build, maintenance, deploy, perf (k6), chaos engineering scripts
- **tests/**: Vitest tests, Playwright tests, load tests (Artillery), Python tests
- **docs/**: Architecture docs, ADRs, runbooks, phase guides, deployment guides

### Configuration Files
- **Linting**: `eslint.config.js` (no-console error in root, off in services/packages/tests)
- **TypeScript**: `tsconfig.*.json` (base, app, node configs per workspace)
- **Testing**: `vitest.config.ts` (jsdom, 120s timeout, coverage thresholds from env vars)
- **Migrations**: `supabase/migrations/*.sql`, `apps/web/prisma/schema.prisma`
- **System config**: `config/system.yaml` (loaded by @prisma-glow/system-config)

## Common Issues & Workarounds

### Node Version Mismatch
**Symptom**: "Unsupported engine: wanted: {"node":"22.12.0"} (current: ...)"
**Solution**: Use Node.js 22.12.0. CI uses 20.19.4 but local dev expects 22.12.0. If using 20.x, commands may still work but expect warnings.

### Config Validation Fails
**Symptom**: `pnpm run config:validate` fails with "Cannot find package 'yaml'"
**Cause**: yaml package not in node_modules (rare)
**Solution**: Skip validation locally if not editing config/system.yaml. CI validates it.

### Build Failures After Pull
**Always** run `pnpm install --frozen-lockfile` after pulling changes to sync dependencies.

### Python Import Errors
**Symptom**: `ModuleNotFoundError: No module named 'fastapi'`
**Solution**: Activate venv and install: `source .venv/bin/activate && pip install -r server/requirements.txt`

### Prisma Client Out of Sync
**Symptom**: "Prisma Client out of sync with schema"
**Solution**: `pnpm --filter web run prisma:generate`

### Coverage Thresholds
**Default thresholds**: 45% statements, 40% branches, 45% functions, 45% lines
**Override**: Set `TARGET_STATEMENTS`, `TARGET_BRANCHES`, `TARGET_FUNCTIONS`, `TARGET_LINES` env vars before `pnpm run coverage`

### OpenAPI Drift
**Symptom**: "OpenAPI or types drift detected" in CI
**Solution**: Run `pnpm run codegen:api` locally (requires Python deps installed) and commit `packages/api-client/types.ts` and `openapi/fastapi.json`

### Playwright Tests Fail
**Cause**: Playwright browsers not installed
**Solution**: `pnpm exec playwright install --with-deps`

### Docker Compose Port Conflicts
**Symptom**: Port 3000 already in use
**Cause**: Both ui and web profiles bind to port 3000
**Solution**: Use `--profile ui` OR `--profile web` (not both): `docker compose --profile web up -d`

## Development Workflows

### Making Code Changes
1. **Create feature branch**: `git checkout -b feature/my-change`
2. **Install deps**: `pnpm install --frozen-lockfile`
3. **Make changes** (keep surgical and minimal)
4. **Typecheck**: `pnpm run typecheck` (fast validation)
5. **Lint**: `pnpm run lint` (fixes code style)
6. **Test**: `pnpm run test` (or `pytest` for Python)
7. **Build**: `pnpm run build` (ensure bundle succeeds)
8. **Commit and push**

### Testing Backend
- **FastAPI health smoke**: `uvicorn server.health_app:app --port 8000` then `curl http://localhost:8000/health`
- **Gateway smoke**: `pnpm --filter @prisma-glow/gateway build && node apps/gateway/dist/server.js`
- **Full pytest suite**: `pytest` (60% coverage gate in CI)

### Running Locally
- **Vite UI**: `pnpm dev` (http://localhost:5173)
- **Next.js app**: `pnpm --filter web dev` (http://localhost:3000)
- **Gateway**: `pnpm --filter @prisma-glow/gateway dev` (http://localhost:3001)
- **FastAPI**: `uvicorn server.main:app --reload` (http://localhost:8000)

### Docker Compose (Local Dev)
```bash
make compose-dev-up        # Starts dev stack with SERVICE_VERSION
make compose-dev-logs      # Tails logs
make compose-dev-down      # Stops and removes containers
```

### Database Migrations
- **Supabase**: Manually apply with `psql "$DATABASE_URL" -f supabase/migrations/YYYYMMDD_name.sql`
- **Prisma**: `pnpm --filter web run prisma:migrate:dev` (dev) or `prisma:migrate:deploy` (CI/prod)

## Architecture Decision Records (ADRs)

**Critical**: When making architectural changes, you **must** create or update an ADR in `docs/adr/` using the template at `docs/adr/000-template.md`. The lint step (`scripts/lint/check-architecture-adr.mjs`) validates ADR references. PRs touching architecture-critical areas without ADR references will fail linting.

## Key Facts for Agents

- **ALWAYS** run `pnpm install --frozen-lockfile` before any build/test/lint commands
- **ALWAYS** use pnpm (not npm or yarn) for Node.js commands
- **ALWAYS** activate Python virtualenv before running pytest or uvicorn
- **ALWAYS** use `--filter <workspace>` to scope workspace commands
- **DO NOT** commit `.env.local` or any secrets to git
- **DO NOT** skip typechecking before building (it's fast and catches errors early)
- **DO NOT** modify node_modules, dist/, .next/, or coverage/ directories
- **Trust these instructions**: Only search the codebase if information here is incomplete or incorrect. This guide consolidates knowledge from README, CONTRIBUTING, workflow files, and build experimentation.

## Quick Reference

| Task | Command |
|------|---------|
| Install deps | `pnpm install --frozen-lockfile` |
| Typecheck | `pnpm run typecheck` |
| Lint | `pnpm run lint` |
| Test (JS) | `pnpm run test` |
| Test (Python) | `pytest` |
| Coverage | `pnpm run coverage` |
| Build | `pnpm run build` |
| Dev (Vite) | `pnpm dev` |
| Dev (Next) | `pnpm --filter web dev` |
| Prisma generate | `pnpm --filter web run prisma:generate` |
| Export OpenAPI | `pnpm run codegen:api` |
| Playwright | `pnpm exec playwright install --with-deps` then `pnpm run test:playwright` |
| Docker dev | `make compose-dev-up` |
