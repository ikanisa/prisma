# Architecture Overview

## Monorepo Layout
- `apps/staff`: Staff Progressive Web App (React + TypeScript)
- `apps/admin`: Admin PWA for oversight workflows
- `packages/api`: Shared API clients and DTOs
- `packages/types-finance`: Domain primitives (Money, JournalEntry, TaxRule)
- `services/gateway`: Edge API gateway exposing REST/GraphQL endpoints
- `services/agents`: Autonomous agent orchestration and evaluation harness
- `infra`: Terraform modules for AWS (Vercel frontend, ECS/Fargate services, RDS, Redis, BullMQ workers)

## Deployment Topology
```mermaid
deploymentDiagram
    node "Client Devices" {
      component staff "Staff PWA"
      component admin "Admin PWA"
    }
    node "Edge" {
      component cdn "CloudFront CDN"
      component waf "WAF"
    }
    node "Control Plane" {
      component api "API Gateway"
      component services "Next/Nest Services"
      component auth "OIDC Provider"
    }
    node "Data Plane" {
      database db "Postgres (RDS)"
      database cache "Redis"
      component queue "BullMQ Workers"
      component storage "Object Storage"
    }
    node "Agent Zone" {
      component orchestrator "Agent Orchestrator"
      component llm "LLM Provider"
    }
    node "Observability" {
      component otel "OpenTelemetry Collector"
      component grafana "Grafana/Alerting"
    }
    staff --> cdn
    admin --> cdn
    cdn --> waf --> api
    api --> services --> db
    services --> cache
    services --> queue
    services --> storage
    services --> auth
    orchestrator --> services
    orchestrator --> llm
    services --> otel --> grafana
```

## Trust Boundaries
1. **Client Boundary:** Browsers interact over HTTPS using OAuth/OIDC tokens.
2. **Edge Boundary:** CDN and WAF terminate TLS; only approved origins allowed.
3. **Control Plane:** Authenticated services; enforce RBAC/ABAC and policy checks.
4. **Data Plane:** Contains regulated financial data; network-restricted and encrypted at rest.
5. **Agent Zone:** Tools accessed through allow-list and policy engine; monitored for cost and safety.
6. **Observability Boundary:** Receives telemetry with PII redaction applied.

## Data Flows
- Staff/Admin PWAs authenticate via OIDC, call API gateway, which proxies to domain services.
- Services interact with Postgres via Prisma, caching results in Redis and dispatching jobs via BullMQ.
- Agents request tasks via orchestrator, evaluate prompts, and submit journal updates through vetted APIs.
- Telemetry exported via OpenTelemetry to Grafana/Loki; security events forwarded to SIEM.

## Compliance Notes
- SOC 2 controls mapped to deployment pipeline; refer to `go-live-checklist.md` for gating steps.
- GDPR data residency handled via region-specific Terraform modules under `infra/regions/*`.
- Audit trail pipeline ensures immutable records stored in append-only tables and object storage.
