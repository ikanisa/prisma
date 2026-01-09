# Definition of Done — Prisma Core Refactor

> **Version:** 1.0  
> **Date:** 2026-01-09

---

## Overview

This document defines the measurable acceptance criteria for the Prisma Core refactor. Each criterion must be verified before marking the refactor complete.

---

## 1. Scope Enforcement Criteria

### 1.1 Jurisdiction Enforcement

| Criterion | Verification Method | Status |
|-----------|---------------------|--------|
| Only RW, MT, CA jurisdiction codes exist in database | `SELECT DISTINCT jurisdiction_code FROM clients;` returns only RW, MT, CA | ☐ |
| Database constraint prevents other jurisdictions | `INSERT INTO clients (jurisdiction) VALUES ('KE')` fails | ☐ |
| `grep -r "KE\|UG\|TZ\|ZA\|US\|UK" src/ packages/` returns 0 results | CLI check | ☐ |
| Playbooks exist only for RW/MT/CA | `ls packages/config/playbooks/` shows only RW/, MT/, CA/ | ☐ |

### 1.2 Client Segment Enforcement

| Criterion | Verification Method | Status |
|-----------|---------------------|--------|
| `clients.is_financial_institution` column exists | Schema inspection | ☐ |
| Engagement creation blocked for financial institutions | Create client with `is_financial_institution=true`, attempt engagement → fails | ☐ |
| `eligibility_check(client_id)` function exists and works | Call function, verify blocking behavior | ☐ |
| UI shows clear error for ineligible clients | Manual test in browser | ☐ |

### 1.3 Engagement Type Enforcement

| Criterion | Verification Method | Status |
|-----------|---------------------|--------|
| Only `accounting`, `audit`, `tax` engagement types allowed | Database ENUM constraint | ☐ |
| No corporate services / advisory code remains | `grep -r "corporate.?service\|advisory" src/` returns 0 | ☐ |

---

## 2. Architecture Criteria

### 2.1 Folder Structure

| Criterion | Verification Method | Status |
|-----------|---------------------|--------|
| `apps/web/` exists and builds | `pnpm --filter @prisma/web build` succeeds | ☐ |
| `apps/api/` exists and starts | `pnpm --filter @prisma/api dev` returns 200 on `/health` | ☐ |
| `packages/db/` contains all migrations | `ls packages/db/migrations/` shows migration files | ☐ |
| `packages/agents/` contains orchestrator + agents | Files exist: orchestrator.ts, accounting.ts, audit.ts, tax.ts | ☐ |
| `packages/config/` contains jurisdiction playbooks | `ls packages/config/RW/ packages/config/MT/ packages/config/CA/` | ☐ |
| `packages/ui/` contains shared components | Directory exists with component files | ☐ |

### 2.2 API Endpoints

| Endpoint | Method | Verification | Status |
|----------|--------|--------------|--------|
| `/health` | GET | Returns 200 | ☐ |
| `/agent/run` | POST | Returns structured JSON, logs to `agent_runs` table | ☐ |
| `/engagements/autoplan` | POST | Creates tasks, workpapers, doc requests | ☐ |
| `/engagements/autopilot` | POST | Updates tasks on document ingestion | ☐ |
| `/documents/ingest` | POST | Stores document, triggers extraction | ☐ |

---

## 3. Database Criteria

### 3.1 Schema Completeness

| Table | Required Columns | Status |
|-------|------------------|--------|
| `firms` | id, name, created_at | ☐ |
| `users` | Uses auth.users or custom table | ☐ |
| `firm_memberships` | user_id, firm_id, role | ☐ |
| `clients` | firm_id, name, jurisdiction, client_segment, is_financial_institution, eligibility_status | ☐ |
| `engagements` | client_id, type (enum), period_start, period_end, status, phase | ☐ |
| `tasks` | engagement_id, title, status, assigned_to, due_date, template_key | ☐ |
| `documents` | engagement_id, storage_path, doc_type, status | ☐ |
| `extractions` | document_id, extracted_json, citations_json | ☐ |
| `workpapers` | engagement_id, wp_type, title, content_json, status | ☐ |
| `issues` | engagement_id, severity, title, description, status | ☐ |
| `agent_runs` | engagement_id, agent_type, trace_id, status, timestamps | ☐ |
| `agent_events` | run_id, event_type, payload_json, created_at | ☐ |
| `approvals` | resource_type, resource_id, decision, comment, approved_by | ☐ |
| `playbooks` | jurisdiction, engagement_type, version, config_json | ☐ |
| `task_templates` | playbook_id, tree_json | ☐ |
| `doc_request_templates` | playbook_id, config_json | ☐ |
| `jurisdictions` | code (only RW, MT, CA) | ☐ |
| `jurisdiction_rulesets` | jurisdiction_code, rules_json | ☐ |

### 3.2 RLS Policies

| Criterion | Verification Method | Status |
|-----------|---------------------|--------|
| All firm-owned tables have RLS enabled | `SELECT tablename FROM pg_tables WHERE NOT rowsecurity;` | ☐ |
| Users can only see their firm's data | Login as user A, verify no data from firm B visible | ☐ |
| RLS documented in `docs/rls-policies.md` | File exists and describes each policy | ☐ |

### 3.3 Seed Data

| Criterion | Verification Method | Status |
|-----------|---------------------|--------|
| Demo firm exists | `SELECT * FROM firms WHERE name LIKE '%demo%';` | ☐ |
| Demo user mapped to firm | Check `firm_memberships` | ☐ |
| 3 demo clients (one per jurisdiction) | `SELECT jurisdiction FROM clients;` returns RW, MT, CA | ☐ |
| All demo clients are SMEs | No `is_financial_institution = true` | ☐ |

---

## 4. Agent System Criteria

### 4.1 Orchestrator Routing

| Criterion | Verification Method | Status |
|-----------|---------------------|--------|
| Routes to AccountingAgent for accounting engagements | Send request, check `agent_type` in logs | ☐ |
| Routes to AuditAgent for audit engagements | Send request, check `agent_type` in logs | ☐ |
| Routes to TaxAgent for tax engagements | Send request, check `agent_type` in logs | ☐ |

### 4.2 Agent Tools

| Tool | Exists | Unit Test Passes | Status |
|------|--------|------------------|--------|
| `get_engagement_context` | ☐ | ☐ | ☐ |
| `list_documents` | ☐ | ☐ | ☐ |
| `read_extraction` | ☐ | ☐ | ☐ |
| `create_or_update_workpaper` | ☐ | ☐ | ☐ |
| `create_tasks` | ☐ | ☐ | ☐ |
| `request_documents` | ☐ | ☐ | ☐ |
| `compute_materiality` | ☐ | ☐ | ☐ |
| `compute_sampling_plan` | ☐ | ☐ | ☐ |
| `compute_vat_return` | ☐ | ☐ | ☐ |
| `eligibility_check` | ☐ | ☐ | ☐ |

### 4.3 Traceability

| Criterion | Verification Method | Status |
|-----------|---------------------|--------|
| Every `/agent/run` creates `agent_runs` record | Check database after API call | ☐ |
| Every tool call logs to `agent_events` | Check database | ☐ |
| `trace_id` links runs to events | Query join on trace_id | ☐ |

---

## 5. UI/UX Criteria

### 5.1 Pages

| Page | Route | Functionality | Status |
|------|-------|---------------|--------|
| Engagements List | `/engagements` | List, create engagement | ☐ |
| Engagement Workspace | `/engagements/:id` | Three-panel layout working | ☐ |
| Settings | `/settings` | Guarded by auth | ☐ |

### 5.2 Intake Form

| Criterion | Verification Method | Status |
|-----------|---------------------|--------|
| Jurisdiction dropdown shows only RW, MT, CA | Visual inspection | ☐ |
| Client segment dropdown shows self-employed/SME options | Visual inspection | ☐ |
| Financial institution screening question present | Visual inspection | ☐ |
| Creation blocked if ineligible | Attempt to create → shows error | ☐ |

### 5.3 Engagement Workspace

| Criterion | Verification Method | Status |
|-----------|---------------------|--------|
| Left panel shows phases and tasks | Visual inspection | ☐ |
| Center panel renders agent chat as widgets | Visual inspection | ☐ |
| Right panel shows documents and extractions | Visual inspection | ☐ |
| "Generate Plan" button calls autoplan | Click, verify tasks created | ☐ |
| "Run Autopilot" button calls autopilot | Click, verify updates | ☐ |
| Review gates enforce Manager/Partner approval | Attempt approval as Staff → blocked | ☐ |

---

## 6. Cleanup Criteria

### 6.1 Code Deletion

| Criterion | Verification Method | Status |
|-----------|---------------------|--------|
| No references to non-RW/MT/CA markets | `grep` returns 0 results | ☐ |
| No corporate services code | `grep` returns 0 results | ☐ |
| No unused dependencies | `pnpm why <package>` for each suspicious dep | ☐ |
| No mock/placeholder pages | Manual review | ☐ |

### 6.2 Build Verification

| Criterion | Verification Method | Status |
|-----------|---------------------|--------|
| `pnpm install` succeeds | CLI | ☐ |
| `pnpm build` succeeds | CLI | ☐ |
| `pnpm test` succeeds | CLI | ☐ |
| No TypeScript errors | `pnpm typecheck` | ☐ |

### 6.3 Size Reduction

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Total files | | | |
| Lines of code | | | |
| Dependencies | | | |
| Migrations | | | |

---

## 7. Documentation Criteria

| Document | Location | Status |
|----------|----------|--------|
| Refactor contract | `docs/refactor-contract.md` | ☐ |
| Definition of done | `docs/definition-of-done.md` | ☐ |
| Inventory | `docs/inventory.md` | ☐ |
| Markets cleanup | `docs/markets-cleanup.md` | ☐ |
| Deletion plan | `docs/deletion-plan.md` | ☐ |
| RLS policies | `docs/rls-policies.md` | ☐ |
| Playbooks | `docs/playbooks.md` | ☐ |
| Agents | `docs/agents.md` | ☐ |
| UI/UX | `docs/ui-ux.md` | ☐ |
| Architecture | `docs/architecture.md` | ☐ |
| QA checklist | `docs/qa.md` | ☐ |

---

## 8. Final Verification

| Criterion | Verification Method | Status |
|-----------|---------------------|--------|
| All unit tests pass | `pnpm test` | ☐ |
| Integration test for `/agent/run` passes | Automated test | ☐ |
| QA checklist completed | `docs/qa.md` all items checked | ☐ |
| Partner sign-off | Manual approval | ☐ |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | ☐ |
| Technical Lead | | | ☐ |
| Partner | | | ☐ |
