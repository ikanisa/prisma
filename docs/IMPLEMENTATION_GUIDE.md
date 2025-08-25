# Autonomous Audit · Accounting · Tax Agent

This document summarizes the architecture and implementation plan for a multi‑tenant SaaS platform that automates audit, accounting, and tax workflows without relying on n8n.

## 0. Scope
- Multi‑tenant SaaS with agentic workflows for audit, accounting, and tax.
- RAG over regulated content, OCR ingestion, tool integrations, audit trail, approvals, and observability.
- Out of scope: jurisdiction‑specific e‑filing and full ERP replacement.

## 1. Architecture Overview
- **Web App**: Next.js/React PWA using Tailwind/shadcn.
- **Gateway API**: NestJS or FastAPI serving REST and WebSockets with auth, rate limiting, idempotency and tracing.
- **Agent Service**: Python (LangGraph/LangChain) workers providing tool calling, planning and streaming.
- **RAG Service**: Python ingestion and retrieval pipeline with OCR, chunking, embeddings and citation assembly.
- **Analytics Service**: Scheduled feature computation and policy checks via Airflow/Temporal.
- **Data platform**: PostgreSQL + pgvector, object storage, Redis, optional search index, and analytics warehouse.
- **Observability**: OpenTelemetry stack and Sentry.

## 2. Data Model
Core tables use UUID primary keys and are scoped by `org_id` with row‑level security when supported. Key domains include:
- Organizations, Users, Members, API Keys
- Documents, Chunks, Ingest Jobs
- Agent Sessions and Logs
- Audit‑specific entities (engagements, risks, controls, tests, materiality, etc.)
- Accounting transactions and policy rules
- Tax rules and return data

## 3. API Sketch
Versioned REST endpoints (`/v1`) cover authentication, RAG ingestion/search, agent interactions, analytics jobs, operational utilities, and client portal uploads. Mutating endpoints require idempotency keys and per‑org API keys.

## 4. Agentic Design
Supervisor graph (LangGraph) routes intents to specialized sub‑graphs for RAG‑QA, accounting, audit, and tax. Nodes include deterministic LLM prompts, tool calls (SQL/HTTP/Google APIs), policy checks, and memory components.

## 5. RAG Pipeline
Ingestion handles uploads, email, and web sources with OCR and parsing. Text is chunked (800–1,200 tokens with overlap) and embedded using `text-embedding-3-large`. Retrieval combines pgvector similarity with keyword search and optional re‑ranking.

## 6. Workflows
- **Audit**: Covers independence, planning, risk responses, sampling/testing, and reporting aligned with ISA/ISQM standards.
- **Accounting**: Supports IFRS topics such as revenue, leases, financial instruments, impairment, provisions, and more. All outputs require human approval before posting.
- **Tax**: Focus on EU/Malta VAT determination, returns, and corporate income tax computations with parameter tables for easy updates.

## 7. Security & Compliance
OIDC authentication, per‑org isolation, encryption, DLP/redaction, GDPR controls, immutable audit logs, and threat‑model mitigations (prompt injection, SSRF, AV scanning).

## 8. Observability & SRE
OpenTelemetry tracing, metrics (latency, token usage, error rates), structured logging with PII scrubbing, SLOs, alerts, and chaos testing.

## 9. DevOps & Infrastructure
GitHub Actions CI/CD, containerized deployment on Kubernetes or PaaS, managed Postgres and storage, migrations, secret management, feature flags, and canary releases with cost monitoring.

## 10. Evaluation & Governance
Golden datasets, accuracy metrics (groundedness, hallucination rate, cost), A/B experiments, red‑team tests, HITL approvals, and versioned prompt/model registry.

## 11. Frontend UX
PWA with dashboard, agent chat (streaming with citations and "show work"), engagement workspace, accounting and tax modules, and client portal with upload/status views. Accessibility and mobile support included.

## 12. Implementation Timeline (12 weeks)
1. Foundations: infra, auth, org isolation, CI/CD, telemetry.
2. RAG core: ingest API, OCR, embeddings, retrieval, evaluation harness.
3. Agent core: supervisor, RAG‑QA, tools, logging, multi‑model router.
4. Accounting: Autocat, anomaly detection, policy rules.
5. Audit: independence, planning, testing, reporting.
6. Tax: VAT determination and return worksheet.
7. Hardening: rate limits, perf, DR drills, docs.

## 13. Key Integrations
Google Workspace APIs, EU VIES validation, future accounting system adapters, LLM providers with streaming and structured outputs.

## 14. Minimal Code Examples
Includes org header guard in NestJS, FastAPI ingest endpoint, and LangGraph vector search tool skeleton.

## 15. Acceptance Criteria
Security, compliance, reliability, quality, operability, and documentation benchmarks define the go/no‑go gate for production.

