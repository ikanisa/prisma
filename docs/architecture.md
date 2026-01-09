# Prisma Core — Architecture Guide

> **Version:** 1.0.0  
> **Date:** 2026-01-09

---

## 1. Overview

Prisma Core is an AI-first engagement system for **Accounting, Audit, and Tax** serving SME and self-employed clients in:

| Jurisdiction | Tax Authority |
|--------------|---------------|
| 🇷🇼 Rwanda (RW) | RRA (Rwanda Revenue Authority) |
| 🇲🇹 Malta (MT) | CFR (Commissioner for Revenue) |
| 🇨🇦 Canada (CA) | CRA (Canada Revenue Agency) |

---

## 2. Monorepo Structure

```
prisma/
├── apps/
│   ├── api/              # Hono API server (port 3001)
│   ├── gateway/          # Legacy gateway (to be consolidated)
│   └── web/              # Main PWA (Vite + React)
├── packages/
│   ├── agents/           # Agent SDK and orchestration
│   ├── audit/            # Audit-specific logic
│   ├── config/           # Jurisdiction playbooks
│   │   └── playbooks/
│   │       ├── RW/       # Rwanda playbooks
│   │       ├── MT/       # Malta playbooks
│   │       └── CA/       # Canada playbooks
│   ├── db/               # Database client and types
│   ├── lib/              # Shared utilities
│   ├── tax/              # Tax calculation logic
│   ├── tools/            # Agent tools
│   ├── types/            # Shared TypeScript types
│   └── ui/               # Shared UI components
├── supabase/             # Supabase project
│   ├── migrations/       # SQL migrations
│   └── functions/        # Edge functions
└── docs/                 # Documentation
```

---

## 3. Running Locally

### Prerequisites

- Node.js >= 22.12.0
- pnpm >= 9.12.3
- Supabase CLI (for database)

### Start the API

```bash
# Install dependencies
pnpm install

# Start API server (port 3001)
pnpm --filter @prisma/api dev
```

### Start the Web App

```bash
# Start web app (port 5173)
pnpm dev:web
```

### Verify API is running

```bash
# Health check
curl http://localhost:3001/health

# Root endpoint
curl http://localhost:3001/
```

---

## 4. API Endpoints

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check (returns 200) |
| `/health/ready` | GET | Readiness probe |

### Agent

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/agent/run` | POST | Execute agent for engagement |
| `/agent/eligibility-check` | POST | Check client eligibility |

### Engagements

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/engagements/autoplan` | POST | Generate plan from playbook |
| `/engagements/autopilot` | POST | Trigger autopilot actions |

### Documents

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/documents/ingest` | POST | Ingest and queue for extraction |
| `/documents/:engagementId` | GET | List documents |
| `/documents/:engagementId/:documentId` | GET | Get document with extraction |

---

## 5. Playbooks

Each jurisdiction has 3 playbooks (accounting, audit, tax):

| File | Description |
|------|-------------|
| `packages/config/playbooks/RW/accounting.json` | Rwanda accounting with RRA/EBM |
| `packages/config/playbooks/RW/audit.json` | Rwanda audit per ISA |
| `packages/config/playbooks/RW/tax.json` | Rwanda tax (VAT 18%, PAYE, CIT 30%) |
| `packages/config/playbooks/MT/accounting.json` | Malta accounting per GAPSME |
| `packages/config/playbooks/MT/audit.json` | Malta audit per MIA/ISA |
| `packages/config/playbooks/MT/tax.json` | Malta tax (CIT 35%, imputation, NID) |
| `packages/config/playbooks/CA/accounting.json` | Canada accounting per ASPE/IFRS |
| `packages/config/playbooks/CA/audit.json` | Canada audit per CAS |
| `packages/config/playbooks/CA/tax.json` | Canada tax (GST/HST, T2) |

---

## 6. Database Types

Core enums (enforced in database):

```typescript
type Jurisdiction = 'RW' | 'MT' | 'CA';
type EngagementType = 'accounting' | 'audit' | 'tax';
type ClientSegment = 'self_employed' | 'micro' | 'small' | 'medium';
```

---

## 7. Key Packages

| Package | Purpose |
|---------|---------|
| `@prisma/api` | API server with Hono |
| `@prisma/db` | Database client and types |
| `@prisma/config` | Playbook loader and types |
| `@prisma/agents` | Agent SDK |
| `@prisma/web` | PWA frontend |

---

## 8. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (API) | Service role key |
| `PORT` | No | API port (default: 3001) |

---

## 9. Related Documentation

- [Refactor Contract](./refactor-contract.md) — Scope and exclusions
- [Definition of Done](./definition-of-done.md) — Acceptance criteria
- [Inventory](./inventory.md) — Repository inventory
- [Deletion Plan](./deletion-plan.md) — Out-of-scope deletions
