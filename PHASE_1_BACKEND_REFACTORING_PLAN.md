# Phase 1: Backend Refactoring Plan

**Status**: 🔴 CRITICAL - PRODUCTION BLOCKER  
**Current State**: `server/main.py` - 7,828 lines, 279KB  
**Target State**: Modular router architecture with `main.py` < 200 lines  
**Duration**: 2 weeks (10 working days)  
**Owner**: Backend Engineering Team

---

## 📊 Current State Analysis

### File Statistics
- **Lines**: 7,828
- **Size**: 279KB
- **Endpoints**: 90 total
  - POST: 53 endpoints
  - GET: 28 endpoints
  - DELETE: 3 endpoints
  - PATCH: 2 endpoints

### Existing Router Structure ✅
Good news! Some routers already exist:
```
server/api/
├── agents.py          # Agent management (10.5KB)
├── agents_v2.py       # Agent v2 API (3.5KB)
├── analytics.py       # Analytics endpoints (1.7KB)
├── executions.py      # Execution tracking (16KB)
├── gemini_chat.py     # Gemini chat API (5.8KB)
├── learning.py        # Learning system (11.5KB)
├── tax_agents.py      # Tax agent endpoints (4.5KB)
└── v1/                # Legacy v1 routes
```

### Already Imported in main.py ✅
```python
from .api.learning import router as learning_router
from .api.gemini_chat import router as gemini_chat_router
from .metrics import metrics_router, MetricsMiddleware
from .api.agents import router as agents_router
from .api.executions import router as executions_router

app.include_router(learning_router)
app.include_router(gemini_chat_router)
app.include_router(metrics_router)
app.include_router(agents_router)
app.include_router(executions_router)
```

**This is excellent!** The foundation is already in place. We just need to extract the remaining ~90 endpoints from `main.py`.

---

## 🎯 Refactoring Strategy

### Step 1: Endpoint Categorization (Day 1)
Analyze all 90 endpoints in `main.py` and categorize them into logical routers.

### Step 2: Create Missing Router Modules (Days 2-3)
Create new router files for endpoints still in `main.py`:
- `server/api/auth.py` - Authentication/authorization
- `server/api/documents.py` - Document operations
- `server/api/workflows.py` - Workflow management
- `server/api/members.py` - Team/member management
- `server/api/organizations.py` - Organization management
- `server/api/health.py` - Health/readiness checks
- `server/api/security.py` - Security endpoints

### Step 3: Extract Endpoints (Days 4-8)
Move endpoints from `main.py` to respective routers, one category at a time.

### Step 4: Extract Business Logic (Days 8-9)
Move business logic from `main.py` to `server/services/`:
- Keep routers thin (just request/response handling)
- Move complex logic to service layer
- Extract validation functions

### Step 5: Refactor main.py (Day 10)
Clean up `main.py` to be pure application initialization:
- App creation
- Middleware registration
- Router inclusion
- Lifespan management
- Global exception handlers

---

## 📋 Detailed Day-by-Day Plan

### Day 1: Endpoint Audit & Categorization

**Goal**: Create comprehensive endpoint inventory

**Tasks**:
1. Extract all endpoint paths from `main.py`
   ```bash
   grep "@app\.(get|post|patch|delete)" server/main.py > endpoints_inventory.txt
   ```

2. Categorize endpoints by domain:
   ```
   Authentication/IAM:
   - /api/iam/org/create
   - /v1/security/verify-captcha
   - /api/auth/*
   
   Documents:
   - /api/documents/*
   - /v1/documents/*
   
   Workflows:
   - /api/workflows/*
   - /v1/workflows/*
   
   Members/Teams:
   - /api/members/*
   - /api/teams/*
   
   Organizations:
   - /api/organizations/*
   - /api/org/*
   
   Health/Monitoring:
   - /health
   - /readiness
   - /metrics
   ```

3. Create tracking spreadsheet:
   ```
   | Endpoint | Method | Current Location | Target Router | Dependencies | Status |
   |----------|--------|------------------|---------------|--------------|--------|
   | /api/iam/org/create | POST | main.py:3365 | auth.py | db, jwt | Pending |
   ```

**Deliverable**: `ENDPOINT_MIGRATION_TRACKER.csv`

---

### Day 2: Create Router Skeletons

**Goal**: Set up all required router modules

**Tasks**:
1. Create `server/api/auth.py`:
   ```python
   """
   Authentication & Authorization API
   Handles user authentication, JWT validation, organization/team management
   """
   from fastapi import APIRouter, Depends, HTTPException, status
   from pydantic import BaseModel
   from typing import Dict, Any, List, Optional
   
   router = APIRouter(prefix="/api/auth", tags=["authentication"])
   
   # TODO: Migrate endpoints from main.py
   ```

2. Create `server/api/documents.py`:
   ```python
   """
   Document Management API
   Handles document upload, processing, RAG chunking, semantic search
   """
   from fastapi import APIRouter, Depends, File, UploadFile
   from pydantic import BaseModel
   from typing import List, Dict, Any
   
   router = APIRouter(prefix="/api/documents", tags=["documents"])
   
   # TODO: Migrate endpoints from main.py
   ```

3. Create remaining routers:
   - `server/api/workflows.py`
   - `server/api/members.py`
   - `server/api/organizations.py`
   - `server/api/health.py`
   - `server/api/security.py`

4. Create router index:
   ```python
   # server/api/__init__.py
   """
   API Router Registry
   All FastAPI routers for the Prisma Glow API
   """
   from .auth import router as auth_router
   from .documents import router as documents_router
   from .workflows import router as workflows_router
   from .members import router as members_router
   from .organizations import router as organizations_router
   from .health import router as health_router
   from .security import router as security_router
   from .agents import router as agents_router
   from .executions import router as executions_router
   from .learning import router as learning_router
   from .gemini_chat import router as gemini_chat_router
   from .analytics import router as analytics_router
   
   __all__ = [
       "auth_router",
       "documents_router",
       "workflows_router",
       "members_router",
       "organizations_router",
       "health_router",
       "security_router",
       "agents_router",
       "executions_router",
       "learning_router",
       "gemini_chat_router",
       "analytics_router",
   ]
   ```

**Deliverable**: Router skeleton files created, ready for migration

---

### Day 3: Extract Helper Functions to Services

**Goal**: Create service layer for business logic

**Tasks**:
1. Create service modules:
   ```
   server/services/
   ├── __init__.py
   ├── auth_service.py          # JWT, permissions, roles
   ├── document_service.py       # Document processing
   ├── workflow_service.py       # Workflow execution
   ├── member_service.py         # Member management
   ├── organization_service.py   # Org operations
   └── validation_service.py     # Input validation
   ```

2. Extract helper functions from `main.py`:
   ```python
   # Current: in main.py lines 580-700
   def verify_supabase_jwt(token: str) -> Dict[str, Any]:
       ...
   
   def normalise_role(value: Optional[str]) -> str:
       ...
   
   # Move to: server/services/auth_service.py
   class AuthService:
       @staticmethod
       def verify_supabase_jwt(token: str) -> Dict[str, Any]:
           ...
       
       @staticmethod
       def normalise_role(value: Optional[str]) -> str:
           ...
   ```

3. Identify all standalone functions in `main.py`:
   ```bash
   grep "^def " server/main.py | wc -l  # Count functions
   ```

4. Create migration plan for each function → service

**Deliverable**: Service layer modules created, function migration plan

---

### Days 4-5: Migrate Authentication Endpoints

**Goal**: Move all auth/IAM endpoints to `server/api/auth.py`

**Endpoints to Migrate**:
- `/api/iam/org/create` (POST)
- `/v1/security/verify-captcha` (POST)
- `/api/auth/login` (POST)
- `/api/auth/verify` (POST)
- `/api/members/*` (GET, POST, PATCH, DELETE)
- `/api/teams/*` (GET, POST)

**Migration Process** (per endpoint):

1. **Copy endpoint to router**:
   ```python
   # From main.py
   @app.post("/api/iam/org/create")
   async def create_organization(request: CreateOrgRequest):
       ...
   
   # To server/api/auth.py
   @router.post("/org/create")  # Note: prefix already set to /api/auth
   async def create_organization(request: CreateOrgRequest):
       ...
   ```

2. **Extract business logic to service**:
   ```python
   # server/services/auth_service.py
   class AuthService:
       async def create_organization(self, org_data: Dict) -> Dict:
           # Business logic here
           ...
   
   # server/api/auth.py
   @router.post("/org/create")
   async def create_organization(
       request: CreateOrgRequest,
       auth_service: AuthService = Depends(get_auth_service)
   ):
       result = await auth_service.create_organization(request.dict())
       return result
   ```

3. **Add router to main.py**:
   ```python
   # server/main.py
   from .api import auth_router
   
   app.include_router(auth_router)
   ```

4. **Test endpoint**:
   ```bash
   # Start server
   uvicorn server.main:app --reload --port 8000
   
   # Test endpoint (from another terminal)
   curl -X POST http://localhost:8000/api/auth/org/create \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Org"}'
   ```

5. **Delete from main.py** (only after confirming it works)

6. **Update tests** to import from new location

**Success Criteria**:
- [ ] All auth endpoints moved to `server/api/auth.py`
- [ ] All endpoints respond correctly
- [ ] Tests pass
- [ ] No duplicate code in `main.py`

---

### Days 6-7: Migrate Document Endpoints

**Goal**: Move all document operations to `server/api/documents.py`

**Endpoints to Migrate**:
- `/api/documents/upload` (POST)
- `/api/documents/{doc_id}` (GET, PATCH, DELETE)
- `/api/documents/search` (POST)
- `/api/documents/chunk` (POST)
- `/v1/documents/*` (all)

**Dependencies**:
- RAG system (`server/rag.py`)
- Chunking logic
- Embedding functions
- Supabase storage

**Migration Process**: Same as Days 4-5

**Success Criteria**:
- [ ] All document endpoints moved
- [ ] Upload/download working
- [ ] RAG search working
- [ ] Tests pass

---

### Day 8: Migrate Workflow & Organization Endpoints

**Goal**: Move workflows and organizations to respective routers

**Workflows** → `server/api/workflows.py`:
- `/api/workflows/*`
- `/v1/workflows/*`

**Organizations** → `server/api/organizations.py`:
- `/api/organizations/*`
- `/api/org/*`

**Migration Process**: Same pattern as previous days

---

### Day 9: Migrate Health & Security Endpoints

**Goal**: Move remaining endpoints

**Health** → `server/api/health.py`:
- `/health` (GET)
- `/readiness` (GET)
- `/live` (GET)

**Security** → `server/api/security.py`:
- `/v1/security/*`

**Cleanup**:
- Remove all migrated code from `main.py`
- Verify no orphaned functions remain

---

### Day 10: Refactor main.py & Final Testing

**Goal**: Clean up `main.py` to < 200 lines

**Final main.py Structure**:
```python
"""
Prisma Glow FastAPI Application
Main application initialization and configuration
"""
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import (
    auth_router,
    documents_router,
    workflows_router,
    members_router,
    organizations_router,
    health_router,
    security_router,
    agents_router,
    executions_router,
    learning_router,
    gemini_chat_router,
    analytics_router,
)
from .middleware import (
    RequestTelemetryMiddleware,
    MetricsMiddleware,
    SecurityMiddleware,
)
from .db import init_db
from .cache import get_cache
from .settings import get_system_settings

# Configure structured logging
logger = structlog.get_logger(__name__)

# Application lifespan management
@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown"""
    settings = get_system_settings()
    logger.info("Starting Prisma Glow API", version=settings.VERSION)
    
    # Startup
    await init_db()
    cache = get_cache()
    await cache.connect()
    
    yield
    
    # Shutdown
    await cache.close()
    logger.info("Prisma Glow API stopped")

# Create FastAPI application
app = FastAPI(
    title="Prisma Glow API",
    description="AI-Powered Operations Suite",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestTelemetryMiddleware)
app.add_middleware(MetricsMiddleware)

# Include all routers
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(workflows_router)
app.include_router(members_router)
app.include_router(organizations_router)
app.include_router(health_router)
app.include_router(security_router)
app.include_router(agents_router)
app.include_router(executions_router)
app.include_router(learning_router)
app.include_router(gemini_chat_router)
app.include_router(analytics_router)

# Global exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("Unhandled exception", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Target**: ~150-200 lines total

**Final Testing Checklist**:
- [ ] `pnpm run typecheck` passes
- [ ] `pytest` passes (all backend tests)
- [ ] `pnpm run test` passes (frontend tests)
- [ ] All API endpoints respond correctly
- [ ] OpenAPI docs generate correctly (`/docs`)
- [ ] No circular imports
- [ ] No duplicate code between routers
- [ ] Postman/Thunder Client collection works
- [ ] CI/CD pipeline passes

**Verification**:
```bash
# Check main.py size
wc -l server/main.py  # Should be < 200

# Check all routers are registered
grep "include_router" server/main.py | wc -l  # Should be 12

# Run full test suite
pytest server/tests/ -v

# Start server and test
uvicorn server.main:app --reload
curl http://localhost:8000/docs  # Should show all endpoints
```

---

## 🚨 Risk Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation**:
- Migrate one router at a time
- Test after each migration
- Keep `main.py` endpoints until new router is verified
- Use feature flags if needed

### Risk 2: Import Circular Dependencies
**Mitigation**:
- Use dependency injection pattern
- Keep routers independent
- Import from services, not other routers
- Use `from __future__ import annotations` for type hints

### Risk 3: Merge Conflicts During Migration
**Mitigation**:
- Create feature branch: `refactor/backend-modularization`
- Daily commits with descriptive messages
- Frequent rebases with main
- Communicate with team about ongoing refactoring

### Risk 4: Performance Regression
**Mitigation**:
- Benchmark before migration
- Benchmark after each router migration
- Monitor import times
- Use lazy loading where appropriate

---

## 📊 Success Metrics

### Code Quality
- **main.py size**: 7,828 lines → < 200 lines ✅
- **Average file size**: < 500 lines per router ✅
- **Cyclomatic complexity**: < 10 per function ✅
- **Test coverage**: Maintain 60%+ (no regression) ✅

### Maintainability
- **Time to find endpoint**: < 30 seconds ✅
- **New developer onboarding**: Understand structure in < 1 hour ✅
- **Code review time**: Reduce by 50% ✅

### Performance
- **Startup time**: No increase > 10% ✅
- **Import time**: No increase > 5% ✅
- **Request latency**: No regression ✅

---

## 📝 Refactoring Checklist

### Pre-Refactoring
- [ ] Create feature branch `refactor/backend-modularization`
- [ ] Run full test suite and document baseline
- [ ] Create endpoint inventory
- [ ] Set up monitoring/benchmarking
- [ ] Communicate plan to team

### During Refactoring (Per Router)
- [ ] Create router skeleton
- [ ] Extract helper functions to service layer
- [ ] Migrate endpoints one by one
- [ ] Test each endpoint after migration
- [ ] Update tests to import from new location
- [ ] Delete code from `main.py` after verification
- [ ] Commit with descriptive message

### Post-Refactoring
- [ ] Verify `main.py` < 200 lines
- [ ] Run full test suite
- [ ] Update OpenAPI export
- [ ] Update documentation
- [ ] Code review
- [ ] Merge to main
- [ ] Deploy to staging
- [ ] Smoke test in staging
- [ ] Deploy to production

---

## 🔄 Rollback Plan

If issues arise during refactoring:

1. **Immediate Rollback** (< 1 hour):
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Partial Rollback** (keep completed routers):
   ```bash
   git revert <specific-commit>
   # Manually restore specific endpoint to main.py
   ```

3. **Full Rollback** (catastrophic failure):
   ```bash
   git reset --hard <pre-refactor-commit>
   git push origin main --force  # Use with caution
   ```

**Rollback Criteria**:
- Test suite failure > 10% of tests
- Production incident caused by refactoring
- Performance degradation > 20%
- Critical bug introduced

---

## 📚 Documentation Updates Required

After refactoring:

1. **Update README.md**:
   - Document new router structure
   - Update architecture diagram

2. **Update API_DOCUMENTATION.md**:
   - Reflect new endpoint organization
   - Update code examples

3. **Update ARCHITECTURE.md**:
   - Add router architecture section
   - Document service layer pattern

4. **Create ADR**:
   - `docs/adr/007-backend-router-refactoring.md`
   - Document decision, rationale, consequences

5. **Update CONTRIBUTING.md**:
   - Guidelines for adding new endpoints
   - Router organization principles

---

## 🎯 Next Steps After Completion

Once refactoring is complete:

1. **Phase 2**: Enable TypeScript strict mode
2. **Phase 3**: Documentation consolidation
3. **Phase 4**: Test coverage improvement
4. **Phase 5**: Security hardening

---

## 📞 Support & Questions

**Technical Lead**: Backend Team  
**Slack Channel**: #backend-refactoring  
**Daily Standup**: 9:00 AM  
**Code Review**: Required before merging any router migration  

---

**Status**: Ready to Start  
**Start Date**: TBD  
**Target Completion**: 2 weeks from start  
**Last Updated**: 2025-01-28
