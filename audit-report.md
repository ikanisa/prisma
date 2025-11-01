# Audit Report: Staff & Admin PWAs

## Executive Summary
The prisma monorepo already centralizes Staff and Admin PWAs alongside shared backend and infrastructure code, but the production controls remain partially implemented. Our audit identified solid groundwork—pnpm-based workspaces, Supabase migrations, and numerous operational playbooks—yet gaps persist in automated verification, strict type safety, offline conflict handling, and agent guardrails. The recommended remediation program focuses on stabilizing financial invariants, enforcing comprehensive CI/CD gates (coverage, SAST/DAST, SBOM, Lighthouse), and documenting operational responses so the teams can meet SOC 2 and GDPR expectations prior to launch.

## Go-Live Readiness Score
| Domain               | Weight | Score (0-5) | Weighted |
|----------------------|--------|-------------|----------|
| Security             | 0.25   | 2.5         | 0.63     |
| Privacy/Compliance   | 0.10   | 2.0         | 0.20     |
| Data Integrity       | 0.15   | 2.0         | 0.30     |
| PWA                  | 0.10   | 2.0         | 0.20     |
| Performance          | 0.10   | 2.5         | 0.25     |
| Testing              | 0.10   | 2.0         | 0.20     |
| CI/CD & Release      | 0.08   | 3.0         | 0.24     |
| Observability        | 0.07   | 2.5         | 0.18     |
| AI Agent Safety      | 0.05   | 1.5         | 0.08     |
| **TOTAL**            | **1.00**|             | **2.28** |

## Top Risks, Mitigations, and Owners
1. **Financial Data Integrity (Likelihood: Medium, Impact: Critical)**  
   *Mitigation:* Introduce Money/Decimal primitives, enforce balanced journal entries, and add invariant tests in `packages/domain-ledger`.  
   *Owner:* Ledger Engineering Lead.
2. **Agent Prompt Safety (Likelihood: Medium, Impact: High)**  
   *Mitigation:* Centralize prompts with signed manifests, add prompt-injection regression tests, and enforce tool allow-lists via `AGENT-GUARDRAILS.md`.  
   *Owner:* AI Platform Owner.
3. **Offline Sync Conflicts (Likelihood: High, Impact: Medium)**  
   *Mitigation:* Implement deterministic merge policy and background sync tests for Staff PWA drafts in `apps/staff`.  
   *Owner:* Staff PWA Tech Lead.
4. **Regulatory Evidence & Audit Trail Gaps (Likelihood: Medium, Impact: High)**  
   *Mitigation:* Harden audit trail schema with trace IDs, ensure immutable append-only storage, and document export procedures in `RUNBOOK.md`.  
   *Owner:* Compliance Program Manager.

## Architecture Map with Trust Boundaries
```mermaid
flowchart LR
  subgraph Client Zone
    A[Staff PWA]
    B[Admin PWA]
  end
  subgraph Zero-Trust Edge
    C[CloudFront / CDN]
    D[WAF]
  end
  subgraph Control Plane
    E[API Gateway]
    F[Next/Nest Services]
    G[Auth Service (OIDC)]
  end
  subgraph Data Plane
    H[(Postgres + Prisma)]
    I[(Redis Cache)]
    J[(BullMQ Workers)]
    K[(Object Storage / Evidence Vault)]
  end
  subgraph Agent Zone
    L[Agent Orchestrator]
    M[LLM Provider]
  end
  subgraph Observability & Governance
    N[OpenTelemetry Collector]
    O[SIEM / Alerting]
    P[Secrets Manager]
  end

  A -->|HTTPS| C --> D --> E
  B -->|HTTPS| C
  E --> F --> H
  F --> I
  F --> J
  F --> K
  F --> G
  L --> F
  L --> M
  F --> N --> O
  P --> F
  P --> L
```

## Open Questions & Assumptions
- Tenancy model clarification: current migrations suggest shared schema; confirm isolation guarantees.
- Filing jurisdictions list remains incomplete; need definitive localization requirements.
- Data retention/erasure SLA for GDPR subject requests is unspecified.
- Offline conflict policy (last-write wins vs. merge) requires product decision.
- Approved LLM provider list and DPAs are pending confirmation.
- Regions with data residency mandates are not captured in infra manifests.
- SLA for reconciliation completion and filing deadlines needs executive sign-off.
