# Prisma Core — Refactor Contract

> **Version:** 1.0  
> **Date:** 2026-01-09  
> **Status:** DRAFT — Pending Partner Approval

---

## 1. Product Vision

**Prisma Core** is an AI-first engagement system for professional services firms serving SME and self-employed clients. The system provides comprehensive Accounting, Audit, and Tax capabilities through an AI-driven Engagement Workspace.

---

## 2. Hard Scope Rules

### 2.1 Client Segments Served

| Segment | Included |
|---------|----------|
| Self-employed / Sole proprietors | ✅ YES |
| Micro enterprises | ✅ YES |
| Small enterprises | ✅ YES |
| Medium enterprises | ✅ YES |

### 2.2 Client Segments NOT Served

> [!CAUTION]
> The following client types are **explicitly excluded** and must be blocked at intake and engagement creation:

| Segment | Status | Enforcement |
|---------|--------|-------------|
| Banks | ❌ BLOCKED | `is_financial_institution` check |
| Microfinance Institutions (MFIs) | ❌ BLOCKED | Industry code screening |
| SACCOs / Credit Unions | ❌ BLOCKED | Industry code screening |
| Insurance companies | ❌ BLOCKED | Industry code screening |
| Other financial institutions | ❌ BLOCKED | `is_financial_institution = true` |

**Enforcement mechanism:** The `clients` table must include `is_financial_institution BOOLEAN NOT NULL DEFAULT FALSE`. A database constraint and application-level check must reject engagement creation for clients where `is_financial_institution = true`.

### 2.3 Engagement Types

Only the following engagement types are supported:

| Type | Description |
|------|-------------|
| **Accounting** | Transaction processing, periodic close, financial statement drafting |
| **Audit** | Planning → Fieldwork → Completion, workpapers, sampling/materiality |
| **Tax** | VAT/GST, income/corporate tax, payroll compliance packs |

All other engagement types (e.g., advisory, consulting, corporate services, company formation) are **out of scope**.

### 2.4 Jurisdictions

**Only 3 markets are supported:**

| Code | Jurisdiction | Tax Authority |
|------|--------------|---------------|
| `RW` | Rwanda | RRA (Rwanda Revenue Authority) |
| `MT` | Malta | CFR (Commissioner for Revenue) |
| `CA` | Canada | CRA (Canada Revenue Agency) |

> [!WARNING]
> All references to other jurisdictions must be deleted:
> - `KE` (Kenya), `UG` (Uganda), `TZ` (Tanzania), `ZA` (South Africa)
> - `US`, `UK`, `EU`, `GLOBAL` (generic/fallback codes)
> - Any other country codes not in the approved list

---

## 3. AI-First Architecture

### 3.1 Core UX Pattern

The **Engagement Workspace** is the primary user interface:
- **Left panel:** Phases + Tasks (hierarchical checklist)
- **Center panel:** Agent Chat (structured messages rendered as UI widgets)
- **Right panel:** Evidence (documents, extracted tables, citations)

### 3.2 Core AI Features

| Feature | Description |
|---------|-------------|
| **Autoplan** | Generates tasks, workpapers, and document requests from jurisdiction playbooks |
| **Autopilot** | Event-driven loop that updates tasks when documents are ingested |
| **Agent Chat** | Conversational interface to AccountingAgent, AuditAgent, TaxAgent |

### 3.3 Fully-Fledged Agent Workflows

**Accounting Agent:**
- Transaction processing and categorization
- Period-end close procedures
- Financial statement drafting

**Audit Agent:**
- Audit planning (strategy, materiality, risk assessment)
- Fieldwork (control testing, substantive procedures)
- Completion (KAM drafting, RFI follow-up)
- Workpaper generation
- Sampling plan and materiality calculators (deterministic)

**Tax Agent:**
- VAT/GST return computation (deterministic)
- Income/corporate tax calculations (deterministic)
- Payroll compliance packs
- LLM-drafted narratives and schedules

---

## 4. Explicit Scope Boundaries

### 4.1 In-Scope

| Category | Items |
|----------|-------|
| **Client segments** | Self-employed, micro, small, medium SMEs |
| **Jurisdictions** | RW, MT, CA only |
| **Engagement types** | Accounting, Audit, Tax |
| **Core features** | Engagement Workspace, Autoplan, Autopilot, Agent Chat |
| **Pages** | Engagements, Engagement Workspace, Settings |
| **Agents** | Orchestrator, AccountingAgent, AuditAgent, TaxAgent |
| **Packages** | db, agents, config, ui |
| **Apps** | web (PWA), api |

### 4.2 Out-of-Scope (DELETE)

| Category | Items to Delete |
|----------|-----------------|
| **Client segments** | Banks, MFIs, SACCOs, insurers, all financial institutions |
| **Jurisdictions** | KE, UG, TZ, ZA, US, UK, EU, GLOBAL, any others |
| **Features** | Corporate services, company formation, advisory |
| **Dead code** | Unused components, mock pages, duplicate modules |
| **Unused dependencies** | Packages not required by core features |
| **Legacy apps** | Any apps besides web and api |

---

## 5. Deletion Principle

> [!IMPORTANT]
> **If it's not explicitly in scope, delete it.**

This applies to:
- Source code files
- Database tables and functions
- Supabase migrations
- Configuration files
- Documentation
- Dependencies

---

## 6. Architecture Target

```
prisma/
├── apps/
│   ├── web/         # PWA Engagement Workspace
│   └── api/         # API + agent endpoints
├── packages/
│   ├── db/          # Supabase schema/migrations/RLS
│   ├── agents/      # Orchestrator + Agent teams + tools
│   ├── config/      # RW/MT/CA rulesets only
│   └── ui/          # Minimal shared components
└── docs/            # Documentation
```

---

## 7. Review Gates

All major changes require partner approval:

| Gate | Reviewer | Trigger |
|------|----------|---------|
| Workpaper submission | Manager → Partner | Staff completes workpaper |
| Deliverable approval | Partner | Before client delivery |
| Engagement QC | EQR (Engagement Quality Reviewer) | High-risk engagements |

---

## 8. Acceptance Criteria Summary

See [definition-of-done.md](./definition-of-done.md) for detailed acceptance criteria.

---

## 9. Signatories

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | ☐ Pending |
| Technical Lead | | | ☐ Pending |
| Partner | | | ☐ Pending |
