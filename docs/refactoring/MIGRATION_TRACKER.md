# Backend Refactoring Migration Tracker

**Last Updated**: Day 1 - 2025-01-28  
**Total Endpoints in main.py**: 86  
**Already Migrated (in separate routers)**: 0 (routers exist but need verification)  
**Remaining in main.py**: 86  
**Target**: < 10 endpoints in main.py (health checks, root routes)

---

## Migration Progress by Category

### ✅ Routers Already Included (Need Verification)

These routers are already included in `server/main.py`:

- [x] **Learning API** (`server/api/learning.py`) - Learning system endpoints
- [x] **Gemini Chat** (`server/api/gemini_chat.py`) - Gemini chat endpoints  
- [x] **Metrics** (`server/metrics.py`) - Metrics collection
- [x] **Agents** (`server/api/agents.py`) - Agent management
- [x] **Executions** (`server/api/executions.py`) - Execution tracking
- [x] **Personas** (router exists) - Persona management
- [x] **Tools** (router exists) - Tool management
- [x] **Knowledge** (router exists) - Knowledge base

**Status**: These routers are working but we need to verify they don't overlap with main.py endpoints.

---

### 🔴 Authentication & IAM (Priority: CRITICAL)

**Target Router**: `server/api/auth.py` (NEW - TO CREATE)  
**Endpoints**: 15  
**Dependencies**: JWT, Supabase, role validation  
**Assigned To**: TBD  
**Status**: Not Started  

| Line | Method | Path | Function | Status |
|------|--------|------|----------|--------|
| TBD | POST | /api/iam/org/create | create_organization | ⏳ Pending |
| TBD | GET | /api/iam/members/list | list_members | ⏳ Pending |
| TBD | POST | /api/iam/members/invite | invite_member | ⏳ Pending |
| TBD | POST | /api/iam/members/accept | accept_invitation | ⏳ Pending |
| TBD | POST | /api/iam/members/revoke-invite | revoke_invitation | ⏳ Pending |
| TBD | POST | /api/iam/members/update-role | update_member_role | ⏳ Pending |
| TBD | GET | /api/admin/impersonation/list | list_impersonations | ⏳ Pending |
| TBD | POST | /api/admin/impersonation/request | request_impersonation | ⏳ Pending |
| TBD | POST | /api/admin/impersonation/approve | approve_impersonation | ⏳ Pending |
| TBD | POST | /api/admin/impersonation/revoke | revoke_impersonation | ⏳ Pending |
| ... | ... | ... | ... | ... |

---

### 🟡 Documents/ADA (Priority: HIGH)

**Target Router**: `server/api/documents.py` (NEW - TO CREATE)  
**Endpoints**: 3  
**Dependencies**: RAG, document processing  
**Assigned To**: TBD  
**Status**: Not Started  

| Line | Method | Path | Function | Status |
|------|--------|------|----------|--------|
| TBD | GET | /api/ada/run | ada_run_get | ⏳ Pending |
| TBD | POST | /api/ada/run | ada_run_post | ⏳ Pending |
| TBD | POST | /api/ada/exception/update | ada_exception_update | ⏳ Pending |

---

### 🟡 Workflows/Controls (Priority: HIGH)

**Target Router**: `server/api/workflows.py` (NEW - TO CREATE)  
**Endpoints**: 5  
**Dependencies**: Control testing, workflow execution  
**Assigned To**: TBD  
**Status**: Not Started  

| Line | Method | Path | Function | Status |
|------|--------|------|----------|--------|
| TBD | GET | /api/controls | list_controls | ⏳ Pending |
| TBD | POST | /api/controls | create_control | ⏳ Pending |
| TBD | POST | /api/controls/test/run | run_control_test | ⏳ Pending |
| TBD | POST | /api/controls/walkthrough | control_walkthrough | ⏳ Pending |
| TBD | GET | /api/admin/auditlog/list | list_audit_logs | ⏳ Pending |

---

### 🟢 Organizations (Priority: MEDIUM)

**Target Router**: `server/api/organizations.py` (NEW - TO CREATE)  
**Endpoints**: 2  
**Dependencies**: Organization settings  
**Assigned To**: TBD  
**Status**: Not Started  

| Line | Method | Path | Function | Status |
|------|--------|------|----------|--------|
| TBD | GET | /api/admin/org/settings | get_org_settings | ⏳ Pending |
| TBD | POST | /api/admin/org/settings | update_org_settings | ⏳ Pending |

---

### 🟢 Health & Monitoring (Priority: LOW)

**Target Router**: `server/api/health.py` (NEW - TO CREATE)  
**Endpoints**: 2  
**Dependencies**: Database, cache  
**Assigned To**: TBD  
**Status**: Not Started  

| Line | Method | Path | Function | Status |
|------|--------|------|----------|--------|
| TBD | GET | /health | health_check | ⏳ Pending |
| TBD | GET | /readiness | readiness_check | ⏳ Pending |

---

### 🟢 Security (Priority: MEDIUM)

**Target Router**: `server/api/security.py` (NEW - TO CREATE)  
**Endpoints**: 1  
**Dependencies**: CAPTCHA  
**Assigned To**: TBD  
**Status**: Not Started  

| Line | Method | Path | Function | Status |
|------|--------|------|----------|--------|
| TBD | POST | /v1/security/verify-captcha | verify_captcha | ⏳ Pending |

---

### ❓ Unknown/Uncategorized (Priority: HIGH - NEEDS ANALYSIS)

**Endpoints**: 58 (!)  
**Status**: Needs categorization  

**Examples**:
- POST /api/release-controls/check
- POST /v1/rag/ingest
- POST /v1/rag/search
- ... and 55 more

**Action Required**: Manual review to categorize these endpoints properly.

---

## Daily Progress Log

### Day 1 (Today)
- [x] Endpoint inventory created (86 endpoints)
- [x] Categorization complete (partial - 58 unknown)
- [x] Migration tracker created
- [ ] Detailed line numbers extracted
- [ ] Unknown endpoints categorized
- [ ] Router skeletons created

### Day 2
- [ ] Unknown endpoints categorized
- [ ] Router skeletons created
- [ ] Service layer planning complete

### Day 3
- [ ] Helper functions extracted
- [ ] Auth endpoints migration started

---

## Endpoint Count Summary

```
Category          Count    Status
─────────────────────────────────────────
auth              15       ⏳ Pending
documents         3        ⏳ Pending
workflows         5        ⏳ Pending
organizations     2        ⏳ Pending
health            2        ⏳ Pending
security          1        ⏳ Pending
unknown           58       ❓ Needs Analysis
─────────────────────────────────────────
TOTAL             86
```

---

## Critical Next Steps

1. **URGENT**: Categorize the 58 "unknown" endpoints
   - Review each endpoint path
   - Determine logical grouping
   - Create new routers if needed

2. **Create Router Skeletons**:
   - `server/api/auth.py`
   - `server/api/documents.py`
   - `server/api/workflows.py`
   - `server/api/organizations.py`
   - `server/api/health.py`
   - `server/api/security.py`
   - ... and any needed for unknown endpoints

3. **Extract Line Numbers**:
   - Re-run extraction script with line numbers
   - Map each endpoint to exact location in main.py

---

## Blockers & Risks

| Issue | Impact | Mitigation | Owner | Status |
|-------|--------|------------|-------|--------|
| 58 uncategorized endpoints | High | Manual review needed | TBD | Open |
| Large endpoint count | High | Prioritize by business criticality | TBD | Open |

---

## Questions for Team

1. What are the "unknown" endpoints for? (RAG, release-controls, etc.)
2. Should we create new routers for these or group them?
3. Priority order for migration?
4. Who will own each router migration?

---

**Next Update**: After unknown endpoints are categorized (Day 1 afternoon)
