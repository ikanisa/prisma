# Architecture: Prisma Glow Autonomous Finance Suite

**Version:** 2.0.0  
**Generated:** 2026-01-02  
**Audit Phase:** Phase 1 - Repository Inventory

---

## 1. Repository Tree Summary

```
prisma/
├── .github/workflows/          # CI/CD (31 workflows)
├── apps/                       # Frontend applications
│   ├── admin/                  # Admin dashboard (React/Vite)
│   ├── client/                 # Client portal (React/Vite)  
│   ├── gateway/                # API gateway (Deno/Edge)
│   └── web/                    # Main web app (Next.js)
├── config/                     # System configuration (YAML)
├── db/                         # Database utilities
├── docs/                       # Documentation (175 files)
├── examples/                   # Usage examples
├── infra/                      # Infrastructure as Code
│   ├── terraform/              # Terraform configs
│   ├── monitoring/             # Grafana/Prometheus
│   └── chaos/                  # Chaos engineering tests
├── migrations/                 # Legacy migrations (120 files)
├── openapi/                    # OpenAPI specs
├── ops/                        # Operations scripts
├── packages/                   # Shared packages (11)
│   ├── agents/                 # Agent framework
│   ├── audit/                  # Audit module
│   ├── core/                   # Core utilities
│   ├── corporate-services/     # Corporate services
│   ├── database/               # Database client
│   ├── lib/                    # Shared library
│   ├── security/               # Security utilities
│   ├── supabase-client/        # Supabase wrapper
│   ├── tax/                    # Tax computation
│   ├── types/                  # TypeScript types
│   └── ui/                     # UI components
├── scripts/                    # Build/deploy scripts (73 files)
├── server/                     # Python FastAPI backend
│   ├── agents/                 # AI agent implementations
│   ├── api/                    # API routers (28 files)
│   ├── learning/               # ML/Learning system
│   ├── routers/                # Route handlers
│   ├── services/               # Business services
│   └── main.py                 # Entry point (232KB)
├── services/                   # Microservices
│   ├── agents/                 # Agent service
│   ├── analytics/              # Analytics service
│   ├── cache/                  # Redis cache layer
│   ├── ledger/                 # Accounting ledger
│   ├── otel/                   # OpenTelemetry
│   ├── rag/                    # RAG pipeline (73 files)
│   └── tax/                    # Tax service
├── src/                        # Main React frontend
│   ├── agents/                 # Frontend agent types
│   ├── components/             # UI components (145)
│   ├── hooks/                  # React hooks (45)
│   ├── lib/                    # Libraries (57 files)
│   ├── pages/                  # Page components (66)
│   ├── routes/                 # Routing config
│   └── services/               # API services
├── src-tauri/                  # Tauri desktop app (Rust)
├── supabase/                   # Supabase config
│   ├── functions/              # Edge functions
│   ├── migrations/             # DB migrations (151)
│   ├── seed/                   # Seed data
│   └── sql/                    # SQL utilities
├── tests/                      # Test suite (189 files)
│   ├── accounting/             # Accounting tests
│   ├── agents/                 # Agent tests
│   ├── audit/                  # Audit tests
│   ├── desktop/                # Desktop app tests
│   ├── load/                   # Load tests
│   ├── performance/            # Performance tests
│   ├── playwright/             # E2E tests
│   ├── security/               # Security tests
│   └── tax/                    # Tax tests
└── ui/                         # Shared UI library
```

---

## 2. Component Inventory

### 2.1 Frontend Applications

| App | Location | Framework | Package Manager | Entry Point | Start Command |
|-----|----------|-----------|-----------------|-------------|---------------|
| **Main Web** | `src/` | React 18 + Vite | pnpm | `src/main.tsx` | `pnpm dev` |
| **Web App** | `apps/web/` | Next.js 14 | pnpm | `apps/web/app/` | `pnpm dev:web` |
| **Client Portal** | `apps/client/` | React + Vite | pnpm | TBD | `pnpm dev:client` |
| **Admin Dashboard** | `apps/admin/` | React + Vite | pnpm | TBD | `pnpm dev:admin` |
| **Desktop App** | `src-tauri/` | Tauri 2.0 (Rust) | cargo | `src-tauri/src/main.rs` | `pnpm dev:tauri` |

### 2.2 Backend Services

| Service | Location | Framework | Language | Entry Point | Start Command |
|---------|----------|-----------|----------|-------------|---------------|
| **FastAPI Server** | `server/` | FastAPI | Python 3.11+ | `server/main.py` | `uvicorn server.main:app` |
| **Gateway** | `apps/gateway/` | Deno/Hono | TypeScript | TBD | TBD |
| **Edge Functions** | `supabase/functions/` | Deno | TypeScript | Individual functions | `supabase functions serve` |

### 2.3 Microservices

| Service | Location | Purpose |
|---------|----------|---------|
| `services/agents/` | Agent orchestration | Agent execution, tool calling |
| `services/analytics/` | Analytics pipeline | Usage metrics, performance |
| `services/cache/` | Redis wrapper | Caching, rate limiting |
| `services/ledger/` | Accounting ledger | Double-entry bookkeeping |
| `services/otel/` | Observability | OpenTelemetry tracing |
| `services/rag/` | RAG pipeline | Document ingestion, search |
| `services/tax/` | Tax computation | CIT, VAT, DAC6, Pillar Two |

### 2.4 Database & Migrations

| Component | Technology | Location |
|-----------|------------|----------|
| Primary DB | PostgreSQL (Supabase) | `supabase/` |
| Migrations | Supabase CLI | `supabase/migrations/` (151 files) |
| Vector Store | pgvector | Enabled via extension |
| Auth | Supabase Auth | Built-in |
| Storage | Supabase Storage | Built-in |

### 2.5 AI/Agent Components

| Component | Location | Technology |
|-----------|----------|------------|
| Agent Registry | `agents.registry.yaml` | YAML config |
| System Config | `config/system.yaml` | YAML config |
| Python Agents | `server/agents/` | Python/FastAPI |
| TS Agents | `src/agents/`, `packages/agents/` | TypeScript |
| RAG Pipeline | `services/rag/` | pgvector, OpenAI |
| Learning System | `server/learning/` | Python |

### 2.6 Infrastructure & CI/CD

| Component | Location | Technology |
|-----------|----------|------------|
| CI/CD Workflows | `.github/workflows/` | GitHub Actions (31 files) |
| Terraform | `infra/terraform/` | AWS/GCP/Cloudflare |
| Docker | `docker-compose.*.yml` | Docker Compose |
| Monitoring | `infra/monitoring/` | Grafana, Prometheus |
| Chaos Testing | `infra/chaos/` | Chaos engineering |

---

## 3. Technology Stack

### Languages & Runtimes

| Language | Version | Usage |
|----------|---------|-------|
| TypeScript | 5.9.3 | Frontend, packages |
| Python | 3.11+ | Backend API |
| Rust | Latest stable | Tauri desktop |
| SQL | PostgreSQL 15+ | Database |

### Package Managers

| Manager | Version | Config File |
|---------|---------|-------------|
| pnpm | 9.12.3 | `pnpm-workspace.yaml` |
| pip | Latest | `server/requirements.txt` |
| cargo | Latest | `src-tauri/Cargo.toml` |

### Key Frameworks

| Framework | Version | Purpose |
|-----------|---------|---------|
| React | 18.x | UI components |
| Next.js | 14.x | Web app framework |
| Vite | 6.x | Build tool |
| FastAPI | 0.115.x | Python API |
| Tauri | 2.0.0 | Desktop app |
| Supabase | 2.39+ | BaaS |

### External Services

| Service | Purpose | Required |
|---------|---------|----------|
| Supabase | Auth, DB, Storage | Yes |
| OpenAI | GPT-4o, Embeddings | Yes |
| Google Gemini | Alt AI provider | Optional |
| Sentry | Error tracking | Production |
| Redis | Cache, rate limiting | Yes |
| Cloudflare | CDN, Pages | Production |

---

## 4. Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL ACTORS                                 │
├───────────────┬───────────────┬───────────────┬───────────────┬─────────────┤
│   Partners    │   Managers    │   Employees   │    Clients    │   System    │
│   (Signers)   │   (Approvers) │   (Workers)   │   (Viewers)   │   (Cron)    │
└───────┬───────┴───────┬───────┴───────┬───────┴───────┬───────┴──────┬──────┘
        │               │               │               │              │
        v               v               v               v              v
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRISMA GLOW SYSTEM                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        FRONTEND LAYER                                   ││
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────────────┐││
│  │  │ Web App   │  │ Admin     │  │ Client    │  │ Desktop App (Tauri)   │││
│  │  │ (React)   │  │ Dashboard │  │ Portal    │  │ macOS/Windows/Linux   │││
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│                                    v                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         API LAYER                                       ││
│  │  ┌───────────────────────────────────────────────────────────────────┐ ││
│  │  │               FastAPI Backend (server/main.py)                    │ ││
│  │  │  • Authentication/Authorization  • Rate Limiting                  │ ││
│  │  │  • Agents API  • Documents API   • Tax API  • Accounting API      │ ││
│  │  │  • RAG Search  • Workflows       • Analytics                      │ ││
│  │  └───────────────────────────────────────────────────────────────────┘ ││
│  │  ┌───────────────────────────────────────────────────────────────────┐ ││
│  │  │               Supabase Edge Functions                             │ ││
│  │  │  • Tax Computations  • Document Processing  • Webhooks            │ ││
│  │  └───────────────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│                                    v                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                       SERVICES LAYER                                    ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐││
│  │  │ Agents  │ │ Ledger  │ │  Tax    │ │  RAG    │ │Analytics│ │ Cache  │││
│  │  │ Service │ │ Service │ │ Service │ │ Service │ │ Service │ │Service │││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └────────┘││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│                                    v                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                       DATA LAYER                                        ││
│  │  ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────┐││
│  │  │  PostgreSQL (Supabase)│  │  Supabase Storage     │  │    Redis     │││
│  │  │  • Core tables        │  │  • Documents          │  │  • Cache     │││
│  │  │  • pgvector embeddings│  │  • Attachments        │  │  • Sessions  │││
│  │  │  • RLS policies       │  │  • PBC folders        │  │  • Rate limit│││
│  │  └───────────────────────┘  └───────────────────────┘  └──────────────┘││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
        │               │               │               │
        v               v               v               v
┌───────────────┬───────────────┬───────────────┬───────────────────────────┐
│    OpenAI     │    Gemini     │    Sentry     │    External Integrations  │
│  (GPT-4o +    │  (Fallback)   │  (Monitoring) │    • Banking APIs         │
│   Embeddings) │               │               │    • Email (SMTP)         │
│               │               │               │    • Google Drive         │
└───────────────┴───────────────┴───────────────┴───────────────────────────┘
```

---

## 5. Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND COMPONENTS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │   src/ (React)   │  │  apps/web (Next) │  │   src-tauri (Desktop)    │  │
│  │                  │  │                  │  │                          │  │
│  │  ├── pages/      │  │  ├── app/        │  │  ├── src/                │  │
│  │  ├── components/ │  │  ├── components/ │  │  │   ├── main.rs         │  │
│  │  ├── hooks/      │  │  ├── lib/        │  │  │   └── commands/       │  │
│  │  ├── lib/        │  │  └── api/        │  │  └── Cargo.toml         │  │
│  │  └── services/   │  │                  │  │                          │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
│           │                     │                        │                  │
│           └─────────────────────┼────────────────────────┘                  │
│                                 │                                            │
│                                 v                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     packages/ (Shared Libraries)                       │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐│ │
│  │  │ agents  │ │  audit  │ │   tax   │ │  core   │ │   lib   │ │  ui   ││ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────┘│ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    v
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND COMPONENTS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    server/ (FastAPI - Python)                         │  │
│  │                                                                       │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐│  │
│  │  │ main.py (232KB - Monolith)                                       ││  │
│  │  │ • Middleware: CORS, Security Headers, Rate Limiting, Telemetry   ││  │
│  │  │ • Auth: JWT validation, Supabase integration                     ││  │
│  │  │ • Endpoints: 100+ routes                                         ││  │
│  │  └──────────────────────────────────────────────────────────────────┘│  │
│  │                                                                       │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐ │  │
│  │  │  agents/  │ │  api/     │ │ routers/  │ │ services/ │ │learning/│ │  │
│  │  │ Agent     │ │ Route     │ │ Handler   │ │ Business  │ │ ML/AI   │ │  │
│  │  │ Framework │ │ Defs      │ │ Logic     │ │ Logic     │ │ Pipeline│ │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └─────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    services/ (Microservices)                          │  │
│  │                                                                       │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐ │  │
│  │  │  agents/  │ │  ledger/  │ │   tax/    │ │   rag/    │ │ cache/  │ │  │
│  │  │ Orchestr- │ │ Double-   │ │ CIT, VAT  │ │ Ingestion │ │ Redis   │ │  │
│  │  │ ation     │ │ Entry GL  │ │ DAC6, P2  │ │ Search    │ │ Wrapper │ │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └─────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                 supabase/functions/ (Edge Functions)                  │  │
│  │  • accounting-close    • tax-mt-cit     • tax-mt-vat                  │  │
│  │  • reconciliation      • document-classify                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Flow: Accounting & Tax

### 6.1 Transaction to Ledger Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Document   │────▶│   AI Agent   │────▶│   Journal    │────▶│    Ledger    │
│   (Invoice,  │     │   Extract    │     │   Entry      │     │   (Posted)   │
│   Receipt)   │     │   & Classify │     │   Draft      │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       v                    v                    v                    v
  ┌─────────┐         ┌─────────┐          ┌─────────┐          ┌─────────┐
  │ Upload  │         │ Extract │          │ DR = CR │          │ Audit   │
  │ Storage │         │ Amounts │          │ Validate│          │ Trail   │
  │         │         │ Dates   │          │ Approve │          │ Immut.  │
  └─────────┘         └─────────┘          └─────────┘          └─────────┘
```

### 6.2 Journal Entry Workflow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   CREATE    │─────▶│   SUBMIT    │─────▶│   APPROVE   │─────▶│    POST     │
│   (Draft)   │      │   (Pending) │      │   (Manager) │      │   (Final)   │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
     │                     │                    │                    │
     │                     │                    │                    │
     v                     v                    v                    v
  Employee              System              Manager              Ledger
  creates               validates           reviews              updated
  batch                 DR = CR             & signs              immutably
```

### 6.3 Tax Computation Flow (Malta CIT Example)

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Pre-Tax      │────▶│  Adjustments  │────▶│  CIT Compute  │────▶│  Refund       │
│  Profit       │     │  (Add-backs,  │     │  (35% rate)   │     │  Calculation  │
│  (from GL)    │     │   Deductions) │     │               │     │  (6/7, 5/7)   │
└───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘
       │                     │                    │                    │
       v                     v                    v                    v
  Trial Balance        Tax Adjustments       Chargeable           Final Tax
  Snapshot             Applied               Income               Liability
```

### 6.4 RAG Document Flow

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Upload      │────▶│    Extract    │────▶│   Embed       │────▶│    Store      │
│   Document    │     │    Text       │     │   (OpenAI)    │     │   pgvector    │
└───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘
       │                     │                    │                    │
       v                     v                    v                    v
  PDF/Word/Excel       OCR + Parser         text-embedding        knowledge_docs
  to Storage          → Chunks              -3-large              table + index
```

---

## 7. Auth & RBAC Model (As Implemented)

### 7.1 Authentication Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│   Login    │────▶│  Supabase  │────▶│  JWT       │────▶│  Client    │
│   Form     │     │  Auth      │     │  Token     │     │  Storage   │
└────────────┘     └────────────┘     └────────────┘     └────────────┘
                         │
                         v
                   ┌────────────┐
                   │  Session   │
                   │  Created   │
                   └────────────┘
```

### 7.2 RBAC Roles & Permissions

| Role | Rank | Key Permissions |
|------|------|-----------------|
| `SYSTEM_ADMIN` | 1 | Full system access, policy editing |
| `PARTNER` | 2 | close.lock, audit.report.release, plan.freeze |
| `EQR` | 2 | eqr.signoff (Engagement Quality Review) |
| `MANAGER` | 3 | journal.post, tax.return.submit, task.assign |
| `EMPLOYEE` | 4 | tasks.create, documents.upload, onboarding.start |
| `CLIENT` | 5 | Limited to PBC folders, view only |
| `READONLY` | 6 | View only, no actions |
| `SERVICE_ACCOUNT` | - | Automated system operations |

### 7.3 RLS Implementation

```sql
-- Example RLS policy from migrations
CREATE POLICY "knowledge_documents_select_policy" 
  ON knowledge_documents
  FOR SELECT TO authenticated
  USING (
    auth_cache.has_min_role_cached(auth.uid(), organization_id, 'VIEWER')
  );
```

### 7.4 ⚠️ Known Gap: Agent RBAC

```python
# server/agents/security.py:41
# TODO: Implement actual RBAC checks against database
# For now, allow all authenticated users
return {"allowed": True, "reason": "authenticated"}
```

---

## 8. Integration Inventory

| Integration | Type | Purpose | Config Location |
|-------------|------|---------|-----------------|
| **Supabase** | BaaS | Auth, DB, Storage | `.env` |
| **OpenAI** | AI | GPT-4o, Embeddings | `OPENAI_API_KEY` |
| **Gemini** | AI | Fallback LLM | `GEMINI_API_KEY` |
| **Sentry** | Monitoring | Error tracking | `SENTRY_DSN` |
| **Redis** | Cache | Sessions, rate limits | `REDIS_URL` |
| **SMTP** | Email | Notifications | `server/mailer.py` |
| **Google Drive** | Storage | Document sync | OAuth scopes |
| **Cloudflare** | CDN | Pages, Workers | `wrangler.toml` |

---

## 9. Environment Variables

### Critical (Required)

| Variable | Component | Purpose |
|----------|-----------|---------|
| `SUPABASE_URL` | All | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Admin operations |
| `SUPABASE_JWT_SECRET` | Backend | JWT validation |
| `OPENAI_API_KEY` | Backend | AI operations |
| `REDIS_URL` | Backend | Cache, rate limiting |

### Frontend

| Variable | Component | Purpose |
|----------|-----------|---------|
| `VITE_SUPABASE_URL` | Vite apps | Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vite apps | Anon key |
| `NEXT_PUBLIC_SUPABASE_URL` | Next.js | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Next.js | Anon key |
| `VITE_SENTRY_DSN` | Vite apps | Error tracking |

### Backend

| Variable | Component | Purpose |
|----------|-----------|---------|
| `SENTRY_DSN` | FastAPI | Error tracking |
| `GEMINI_API_KEY` | FastAPI | Alt AI provider |
| `ALLOWED_HOSTS` | FastAPI | Host validation |
| `API_ALLOWED_ORIGINS` | FastAPI | CORS origins |

---

## 10. Deployment Topology

### Production

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLOUDFLARE                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                     Cloudflare Pages                                ││
│  │  • Web App (Next.js)                                                ││
│  │  • Client Portal                                                    ││
│  │  • Admin Dashboard                                                  ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    v
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                 Docker Container (FastAPI)                          ││
│  │  • Cloud Run / ECS / Self-hosted                                    ││
│  │  • Horizontal scaling                                               ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    v
┌─────────────────────────────────────────────────────────────────────────┐
│                          SUPABASE                                        │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────┐│
│  │  PostgreSQL   │ │  Auth         │ │  Storage      │ │  Edge Funcs  ││
│  │  + pgvector   │ │  (JWT)        │ │  (S3-compat)  │ │  (Deno)      ││
│  └───────────────┘ └───────────────┘ └───────────────┘ └──────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    v
┌─────────────────────────────────────────────────────────────────────────┐
│                          SUPPORTING SERVICES                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐                  │
│  │  Redis Cloud  │ │  Sentry       │ │  OpenAI       │                  │
│  │  (Cache)      │ │  (Monitoring) │ │  (AI)         │                  │
│  └───────────────┘ └───────────────┘ └───────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Desktop App Distribution

| Platform | Build | Distribution |
|----------|-------|--------------|
| macOS | Universal binary | GitHub Releases, Notarized |
| Windows | x64 | GitHub Releases, Code signed |
| Linux | AppImage, deb | GitHub Releases |

---

## 11. CI/CD Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push, PR | Main CI (lint, test, build) |
| `security.yml` | Push, PR | CodeQL, ZAP, audits |
| `gitleaks.yml` | Push, PR | Secret scanning |
| `container-scan.yml` | Push | Docker image CVE scan |
| `sbom.yml` | Push | SBOM generation |
| `desktop-app-release.yml` | Tag | Desktop app builds |
| `deploy-cloudflare.yml` | Push main | Frontend deployment |
| `supabase-migrate.yml` | Push | DB migrations |

---

*Architecture document generated during Phase 1 audit. Last updated: 2026-01-02*
