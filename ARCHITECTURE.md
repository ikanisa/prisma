# Prisma Glow Architecture Overview

This document captures the current runtime topology of the Prisma Glow monorepo and how clients, APIs, services, and the data plane interact. For a visual walkthrough of the primary request and event flows see the [Client → API → Data Plane diagrams](docs/diagrams/client-api-data-plane.md).

## Entry points and client experience

- **Web experience (`apps/web/`)** provides the authenticated React/Next.js UI and issues HTTPS requests to the gateway. It relies on workspace packages such as `@prisma-glow/api-client` for generated bindings and `@prisma-glow/ui` for shared components.
- **Gateway (`apps/gateway/`)** is an Express-based edge façade. It applies request context, organization scoping, API key validation, rate limits, and idempotency middleware before proxying downstream to the FastAPI backend and RAG service. Each request is logged through the analytics client to capture service timings and organization context.【F:apps/gateway/server.js†L1-L68】
- **Legacy CLI and automation** scripts consume the same gateway endpoints while authenticating using service API keys distributed via `config/system.yaml` and the `@prisma-glow/system-config` helper.【F:packages/system-config/README.md†L1-L86】

## Core services

| Service | Location | Responsibilities | Key Integrations |
| --- | --- | --- | --- |
| API Backend | `server/` | FastAPI application exposing domain RPC endpoints and orchestrating workflows. | Talks to Supabase (SQL/RPC), emits analytics events, invokes the RAG service for knowledge retrieval, and pushes jobs into `supabase.jobs` for asynchronous work. |
| Gateway | `apps/gateway/` | Edge API façade handling authentication, throttling, routing, and analytics instrumentation. | Proxies requests to FastAPI and the RAG service, records telemetry via `@prisma-glow/analytics`, and enforces idempotency through the Postgres-backed store.【F:apps/gateway/server.js†L8-L68】 |
| Retrieval & Agents | `services/rag/` | Combines knowledge ingestion, OpenAI toolchains, chat orchestration, notification fan-out, and agent execution. | Consumes Supabase tables (embeddings, notifications, dispatch queue), coordinates ChatKit sessions, drives autonomy telemetry, and publishes fan-out jobs for urgent notifications.【F:services/rag/index.ts†L1-L120】【F:services/rag/notifications/fanout.ts†L1-L120】 |
| Analytics Ingestor | `services/analytics/` | FastAPI service that validates analytics events, applies tracing and Sentry instrumentation, and persists accepted telemetry. | Authorises ingest tokens, writes to Supabase `analytics_events`, and triggers policy/anomaly jobs via its job helpers.【F:services/analytics/app.py†L1-L140】【F:services/analytics/api.py†L1-L32】 |

## Shared packages

- **`packages/api-client/`** ships generated TypeScript clients for the FastAPI schema so that web and service callers can share typing and error handling logic.【F:packages/api-client/README.md†L1-L62】
- **`packages/system-config/`** wraps configuration loading, caching, and schema validation for `config/system.yaml`, ensuring consistent feature flags and connector settings across gateway, RAG, analytics, and workers.【F:packages/system-config/README.md†L1-L86】
- **`packages/logger/`** provides a structured logging abstraction used by Node services for consistent JSON payloads and error serialization.【F:packages/logger/src/index.ts†L1-L46】

## Infrastructure and data plane

Infrastructure as code is managed under `infra/terraform/` with composable modules:

- `main.tf` provisions AWS and GCP KMS keys to protect Supabase, object storage, and job queue secrets. Modules `modules/aws_kms` and `modules/gcp_kms` encapsulate per-provider configuration, tagging, and optional secret replication.【F:infra/terraform/main.tf†L1-L62】【F:infra/terraform/modules/aws_kms/main.tf†L1-L40】
- Terraform outputs feed deployment automation for Vercel and container workloads, while variables define provider-specific toggles such as multi-region support and key rotation windows.【F:infra/terraform/main.tf†L20-L62】【F:infra/terraform/modules/gcp_kms/main.tf†L1-L40】

The operational data plane is anchored in Supabase:

- **Transactional tables** capture workspace data such as engagements, documents, notifications, and analytics events. Row-Level Security policies enforce organization boundaries and minimum role checks.
- **Queue tables** (e.g., `notification_dispatch_queue`, `jobs`, `job_schedules`) coordinate asynchronous fan-out handled by services/rag workers.【F:supabase/migrations/20250926090000_tasks_documents_notifications.sql†L219-L324】【F:supabase/migrations/20251115090000_notification_fanout.sql†L1-L62】
- **Observability tables** such as `analytics_events` support end-to-end telemetry and feed into anomaly scans triggered by the analytics service.【F:supabase/migrations/20251201090000_analytics_events.sql†L1-L34】

## Flow summary

1. Clients invoke the gateway, which authenticates and routes requests to FastAPI or the RAG service while streaming analytics to the ingest service.【F:apps/gateway/server.js†L21-L68】
2. FastAPI coordinates domain logic, persists state in Supabase, and delegates to specialized services (RAG, analytics) when document intelligence or telemetry ingestion is required.【F:services/rag/index.ts†L52-L104】【F:services/analytics/app.py†L91-L133】
3. Background jobs and urgent notifications leverage Supabase queue tables and the fan-out workers inside `services/rag/notifications/`, ensuring delivery channels honour per-user preferences and emit alerting telemetry when backlogs grow.【F:services/rag/notifications/fanout.ts†L1-L120】【F:supabase/migrations/20251115090000_notification_fanout.sql†L1-L67】

These layers combine to deliver a secure, observable workflow that is ready for Vercel deployment and cross-service automation.
