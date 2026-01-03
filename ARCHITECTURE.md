# Prisma Glow - Architecture Document

> **Comprehensive Full-Stack Audit - Phase 1**
> Generated: 2026-01-03

## 1. Executive Summary

Prisma Glow is an **Accounting & Tax AI Agent Platform** built as a monorepo containing:
- 4 frontend applications (Next.js PWAs)
- 1 backend API (Python FastAPI)
- 1 API gateway (Node/Express)
- 11 shared packages
- 153 database migrations (Supabase/PostgreSQL)
- Tauri desktop application
- AI agent system with knowledge base

---

## 2. Repository Structure

```
prisma/
├── apps/                           # Frontend applications
│   ├── web/                       # Main web app (Next.js 14)
│   ├── client/                    # Client portal (Next.js PWA)
│   ├── admin/                     # Admin dashboard (Next.js)
│   └── gateway/                   # API gateway (Node/Express)
├── packages/                       # Shared libraries
│   ├── agents/                    # AI agent system
│   ├── audit/                     # Audit agents
│   ├── tax/                       # Tax computation engine
│   ├── corporate-services/        # Corporate services
│   ├── core/                      # Core utilities
│   ├── database/                  # Database client
│   ├── lib/                       # Shared libraries
│   ├── security/                  # Security utilities
│   ├── supabase-client/           # Supabase client
│   ├── types/                     # TypeScript types
│   └── ui/                        # UI components
├── server/                         # Python FastAPI backend
│   ├── main.py                    # Main entry (233KB)
│   ├── agents/                    # AI agents (37 files)
│   ├── api/                       # API routes (28 files)
│   └── learning/                  # Knowledge/RAG system
├── services/                       # TypeScript services
│   └── rag/knowledge/             # Knowledge Factory
├── supabase/                       # Database
│   ├── migrations/                # 153 SQL migrations
│   └── functions/                 # Edge functions
├── src-tauri/                      # Desktop app (Rust)
├── .github/workflows/              # 31 CI/CD workflows
├── config/                         # Configuration files
├── scripts/                        # Build/deploy scripts
├── tests/                          # Test suites
└── docs/                           # Documentation (180 files)
```

---

## 3. Technology Stack

### Frontend
| Component | Technology | Version |
|-----------|------------|---------|
| Web App | Next.js | 14.2.18 |
| Styling | TailwindCSS | 3.4.x |
| State | Zustand, React Query | 5.x |
| UI Components | Radix UI | - |
| PWA | @ducanh2912/next-pwa | 10.x |

### Backend
| Component | Technology | Version |
|-----------|------------|---------|
| API Server | Python FastAPI | 0.104.x |
| Gateway | Node/Express | 4.x |
| AI/LLM | OpenAI, Gemini | 4.x, 0.21.x |
| Task Queue | (In-process) | - |

### Database
| Component | Technology | Details |
|-----------|------------|---------|
| Primary DB | PostgreSQL | Via Supabase |
| Vector Store | pgvector | For RAG/embeddings |
| Auth | Supabase Auth | JWT + RLS |
| Migrations | Supabase CLI | 153 migrations |

### Infrastructure
| Component | Technology |
|-----------|------------|
| Hosting (Frontend) | Cloudflare Pages |
| Backend Hosting | TBD (Cloud Run/Railway) |
| CI/CD | GitHub Actions (31 workflows) |
| Desktop | Tauri (Rust + WebView) |
| Package Manager | pnpm 9.12.3 |
| Monorepo | Turborepo |

---

## 4. Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┤
│ Web App     │ Client PWA  │ Admin Panel │ Desktop App │ API Clients │
│ (Next.js)   │ (Next.js)   │ (Next.js)   │ (Tauri)     │ (REST)      │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┘
       │             │             │             │             │
       └─────────────┴─────────────┴─────────────┼─────────────┘
                                                 │
                     ┌───────────────────────────▼───────────────────┐
                     │              API GATEWAY                       │
                     │         (apps/gateway - Express)               │
                     └───────────────────────────┬───────────────────┘
                                                 │
       ┌─────────────────────────┬───────────────┴───────────────────┐
       │                         │                                    │
┌──────▼──────┐         ┌────────▼────────┐              ┌────────────▼─────┐
│ FastAPI     │         │ Supabase Edge   │              │ External APIs    │
│ Backend     │         │ Functions       │              │ (OpenAI/Gemini)  │
│ (server/)   │         │ (supabase/      │              │                  │
│             │         │  functions/)    │              │                  │
└──────┬──────┘         └────────┬────────┘              └──────────────────┘
       │                         │
       └─────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │  PostgreSQL + pgvector │
         │      (Supabase)        │
         │  • 153 migrations      │
         │  • RLS enabled         │
         │  • Multi-tenant        │
         └────────────────────────┘
```

---

## 5. Data Flow - Accounting/Tax

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  INGESTION   │────▶│  PROCESSING  │────▶│   STORAGE    │
└──────────────┘     └──────────────┘     └──────────────┘
     │                     │                     │
  • Bank imports       • AI classification    • transactions
  • Manual entry       • Tax computation      • journal_entries
  • Invoice upload     • VAT calculation      • invoices
  • Receipt scan       • Double-entry         • tax_reports
                       • Period close         • ledger_balances

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   RETRIEVAL  │────▶│  AI AGENTS   │────▶│   OUTPUTS    │
└──────────────┘     └──────────────┘     └──────────────┘
     │                     │                     │
  • RAG search         • Tax advisor          • Financial reports
  • KB queries         • Audit support        • Tax returns
  • Vector search      • Grounded answers     • Compliance docs
```

---

## 6. Authentication & RBAC Model

### Auth Flow
```
User ──▶ Supabase Auth ──▶ JWT ──▶ API/Gateway ──▶ RLS Policies
```

### Roles (Implemented)
| Role | Access Level |
|------|-------------|
| `SYSTEM_ADMIN` | Full access, user management |
| `STAFF` | Standard access to assigned tenants |
| `PARTNER` | Partner-level access |
| `MANAGER` | Department management |
| `EMPLOYEE` | Basic employee access |
| `CLIENT` | External client portal |
| `READONLY` | View-only access |

### Tables with RLS
- `user_profiles` - Tenant + role isolation
- `kb_*` tables - Tenant + confidentiality
- `organizations` - Tenant isolation
- All financial tables - Tenant + RLS

---

## 7. Integration Inventory

| Integration | Purpose | Config Location |
|-------------|---------|-----------------|
| Supabase | Database, Auth, Functions | `.env` |
| OpenAI | LLM, Embeddings | `OPENAI_API_KEY` |
| Gemini | LLM, Classification | `GEMINI_API_KEY` |
| Google Drive | Document ingestion | `GDRIVE_*` |
| Sentry | Error tracking | `SENTRY_DSN` |
| Cloudflare | Hosting, CDN | `CLOUDFLARE_*` |
| Google Maps | Location services | `GOOGLE_MAPS_API_KEY` |

---

## 8. Environment Variables

### Required (Frontend)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
```

### Required (Backend)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
GEMINI_API_KEY
```

### Knowledge Factory
```
GDRIVE_SERVICE_ACCOUNT_EMAIL
GDRIVE_SERVICE_ACCOUNT_KEY
GDRIVE_FOLDER_ID
KB_EMBEDDING_MODEL
```

Full list: See `.env.example` (130+ variables)

---

## 9. Deployment Topology

```
┌─────────────────────────────────────────┐
│           CLOUDFLARE PAGES              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ web     │ │ client  │ │ admin   │   │
│  │ (PWA)   │ │ (PWA)   │ │ (SSR)   │   │
│  └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────┘
                    │
┌───────────────────▼───────────────────┐
│           CLOUD RUN / RAILWAY          │
│  ┌──────────────────────────────────┐ │
│  │     FastAPI Backend (Python)      │ │
│  │     + Gateway (Node)              │ │
│  └──────────────────────────────────┘ │
└───────────────────────────────────────┘
                    │
┌───────────────────▼───────────────────┐
│              SUPABASE                  │
│  ┌──────────┐ ┌──────────┐            │
│  │PostgreSQL│ │ Edge Fn  │            │
│  │ pgvector │ │          │            │
│  └──────────┘ └──────────┘            │
└────────────────────────────────────────┘
```

---

## 10. Entry Points & Start Commands

| Component | Dev Command | Build Command |
|-----------|-------------|---------------|
| Web App | `pnpm dev:web` | `pnpm build:web` |
| Client | `pnpm dev:client` | `pnpm --filter @prisma/client build` |
| Admin | `pnpm dev:admin` | `pnpm --filter @prisma/admin build` |
| Gateway | `pnpm --filter @prisma/gateway dev` | - |
| Backend | `cd server && uvicorn main:app` | Docker |
| Desktop | `pnpm tauri:dev` | `pnpm tauri:build` |
| All | `pnpm dev` | `pnpm build` |

---

## 11. CI/CD Workflows (31 total)

### Critical Workflows
| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR/Push | Main CI (lint, test, build) |
| `deploy-cloudflare.yml` | Push to main | Deploy frontends |
| `desktop-app-release.yml` | Release | Build desktop apps |
| `supabase-migrate.yml` | Push | Apply migrations |
| `security.yml` | Schedule | Security scans |
| `codeql.yml` | PR/Schedule | Code analysis |

---

## 12. Knowledge Factory Architecture

```
Google Drive ──▶ Ingestion ──▶ Extraction ──▶ Enrichment
                    │              │              │
               kb_sources    kb_document_text  kb_summaries
               kb_documents                    kb_tags
                    │
                    ▼
              Chunking ──▶ Embedding ──▶ Vector Store
                  │            │              │
             kb_chunks   kb_embeddings    pgvector
                    │
                    ▼
              Retrieval ──▶ Agent Tool ──▶ Grounded Answer
                  │              │              │
           kb_audit_trail   kb_search     Citations
```

---

## 13. Security Model

- **Authentication**: Supabase Auth (JWT)
- **Authorization**: Role-based + Row Level Security
- **Tenant Isolation**: All tables scoped by `tenant_id`
- **Confidentiality**: PUBLIC/INTERNAL/RESTRICTED levels
- **Secrets**: Environment variables (never in code)
- **API Protection**: Rate limiting + CORS + CSRF

---

## 14. Outstanding Items

See `AUDIT_REPORT.md` for:
- P0 Critical issues
- P1 High priority items
- P2/P3 Medium/Low items
- Remediation plan
