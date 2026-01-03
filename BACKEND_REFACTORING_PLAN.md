# Backend Monolith Refactoring Plan
## P0-1: Split server/main.py (6,472 lines → <500 lines)

**Date:** January 2026  
**Status:** Planning Complete  
**Effort:** 3 weeks (120 hours)

---

## Executive Summary

**Current State:**
- `server/main.py`: 6,472 lines, ~233KB
- Contains all API routes, business logic, middleware
- Hard to test, maintain, and deploy

**Target State:**
- `server/main.py`: <500 lines (app setup only)
- Modular routers in `server/routers/`
- Business logic in `server/services/`
- Middleware in `server/middleware/`

---

## Refactoring Strategy

### Phase 1: Extract Routers (Week 1 - 40 hours)

**Goal:** Move all route handlers to separate router modules

#### 1.1 Create Router Structure
```
server/
├── routers/
│   ├── __init__.py
│   ├── documents.py      # Document management
│   ├── agents.py         # Agent operations
│   ├── knowledge.py      # Knowledge base
│   ├── analytics.py      # Analytics & metrics
│   ├── organizations.py  # Org management
│   ├── iam.py           # Identity & access
│   ├── rag.py           # RAG operations
│   ├── workflows.py     # Workflow management
│   └── health.py        # Health checks
```

#### 1.2 Extract Routes from main.py

**Documents Router** (`server/routers/documents.py`)
- Move document-related endpoints
- Estimated: 15 routes, ~800 lines

**Agents Router** (`server/routers/agents.py`)
- Move agent CRUD operations
- Estimated: 10 routes, ~600 lines

**Knowledge Router** (`server/routers/knowledge.py`)
- Move knowledge base endpoints
- Estimated: 12 routes, ~700 lines

**Analytics Router** (`server/routers/analytics.py`)
- Move analytics endpoints
- Estimated: 8 routes, ~500 lines

**Organizations Router** (`server/routers/organizations.py`)
- Move organization management
- Estimated: 6 routes, ~400 lines

**IAM Router** (`server/routers/iam.py`)
- Move identity & access endpoints
- Estimated: 8 routes, ~500 lines

**RAG Router** (`server/routers/rag.py`)
- Move RAG operations
- Estimated: 6 routes, ~400 lines

**Workflows Router** (`server/routers/workflows.py`)
- Move workflow endpoints
- Estimated: 10 routes, ~600 lines

**Health Router** (`server/routers/health.py`)
- Move health check endpoints
- Estimated: 3 routes, ~200 lines

**Total Routes to Extract:** ~78 routes

#### 1.3 Update main.py
```python
# server/main.py (after refactoring)
from fastapi import FastAPI
from server.routers import (
    documents, agents, knowledge, analytics,
    organizations, iam, rag, workflows, health
)

app = FastAPI(title="Prisma Glow API")

# Include routers
app.include_router(documents.router)
app.include_router(agents.router)
app.include_router(knowledge.router)
app.include_router(analytics.router)
app.include_router(organizations.router)
app.include_router(iam.router)
app.include_router(rag.router)
app.include_router(workflows.router)
app.include_router(health.router)

# Middleware setup
# ... (minimal middleware config)
```

---

### Phase 2: Extract Services (Week 2 - 40 hours)

**Goal:** Move business logic to service layer

#### 2.1 Create Service Structure
```
server/
├── services/
│   ├── __init__.py
│   ├── document_service.py
│   ├── agent_service.py
│   ├── rag_service.py
│   ├── analytics_service.py
│   ├── organization_service.py
│   └── workflow_service.py
```

#### 2.2 Extract Business Logic

**Document Service** (`server/services/document_service.py`)
- Document CRUD operations
- Document processing
- File upload handling
- Estimated: ~1,200 lines

**Agent Service** (`server/services/agent_service.py`)
- Agent execution logic
- Agent configuration
- Agent orchestration
- Estimated: ~1,500 lines

**RAG Service** (`server/services/rag_service.py`)
- RAG query processing
- Chunk retrieval
- Embedding operations
- Estimated: ~1,000 lines

**Analytics Service** (`server/services/analytics_service.py`)
- Analytics computation
- Metrics aggregation
- Reporting generation
- Estimated: ~800 lines

**Organization Service** (`server/services/organization_service.py`)
- Organization management
- Member management
- Permission management
- Estimated: ~600 lines

**Workflow Service** (`server/services/workflow_service.py`)
- Workflow execution
- Step management
- State transitions
- Estimated: ~700 lines

**Total Logic to Extract:** ~5,800 lines

---

### Phase 3: Extract Middleware (Week 2 - 10 hours)

**Goal:** Move middleware to separate modules

#### 3.1 Create Middleware Structure
```
server/
├── middleware/
│   ├── __init__.py
│   ├── auth.py          # Authentication
│   ├── rate_limit.py    # Rate limiting
│   ├── telemetry.py     # Telemetry
│   ├── security.py      # Security headers
│   └── error_handler.py # Error handling
```

#### 3.2 Extract Middleware

**Auth Middleware** (`server/middleware/auth.py`)
- JWT verification
- User context extraction
- Permission checks
- Estimated: ~300 lines

**Rate Limit Middleware** (`server/middleware/rate_limit.py`)
- Rate limiting logic
- Redis integration
- Limit enforcement
- Estimated: ~200 lines (already exists in `rate_limiter.py`)

**Telemetry Middleware** (`server/middleware/telemetry.py`)
- Request tracking
- Performance monitoring
- Distributed tracing
- Estimated: ~250 lines

**Security Middleware** (`server/middleware/security.py`)
- Security headers
- CORS configuration
- CSP headers
- Estimated: ~200 lines

**Error Handler Middleware** (`server/middleware/error_handler.py`)
- Error formatting
- Exception handling
- Error logging
- Estimated: ~150 lines

---

### Phase 4: Testing & Verification (Week 3 - 30 hours)

**Goal:** Ensure all functionality works after refactoring

#### 4.1 Unit Tests
- Test each router independently
- Test each service independently
- Test middleware in isolation
- Estimated: 20 hours

#### 4.2 Integration Tests
- Test router + service integration
- Test end-to-end flows
- Test error handling
- Estimated: 8 hours

#### 4.3 Manual Testing
- Test all API endpoints
- Verify functionality
- Check performance
- Estimated: 2 hours

---

## Detailed Implementation Steps

### Week 1: Extract Routers

**Day 1-2: Setup & Documents Router**
- Create router structure
- Extract document routes
- Update imports
- Test document endpoints

**Day 3-4: Agents & Knowledge Routers**
- Extract agent routes
- Extract knowledge routes
- Update dependencies
- Test endpoints

**Day 5: Remaining Routers**
- Extract analytics, organizations, IAM
- Extract RAG, workflows, health
- Update main.py
- Run full test suite

### Week 2: Extract Services & Middleware

**Day 1-2: Document & Agent Services**
- Extract document service
- Extract agent service
- Update routers to use services
- Test services

**Day 3: RAG & Analytics Services**
- Extract RAG service
- Extract analytics service
- Update routers
- Test services

**Day 4: Organization & Workflow Services**
- Extract organization service
- Extract workflow service
- Update routers
- Test services

**Day 5: Middleware Extraction**
- Extract all middleware
- Update main.py
- Test middleware
- Verify security

### Week 3: Testing & Cleanup

**Day 1-2: Unit Tests**
- Write unit tests for routers
- Write unit tests for services
- Write unit tests for middleware
- Achieve >80% coverage

**Day 3: Integration Tests**
- Test router + service integration
- Test end-to-end flows
- Test error scenarios
- Verify performance

**Day 4: Manual Testing & Documentation**
- Manual API testing
- Update API documentation
- Update architecture docs
- Code review

**Day 5: Deployment Preparation**
- Final testing
- Performance benchmarking
- Rollback plan
- Deployment

---

## File Size Targets

| File | Current | Target | Reduction |
|------|---------|--------|-----------|
| `main.py` | 6,472 lines | <500 lines | 92% |
| `routers/*.py` | 0 | ~400-800 lines each | - |
| `services/*.py` | 0 | ~600-1,500 lines each | - |
| `middleware/*.py` | 0 | ~150-300 lines each | - |

---

## Benefits

1. **Maintainability**
   - Easier to find code
   - Clear separation of concerns
   - Better code organization

2. **Testability**
   - Test routers independently
   - Test services independently
   - Test middleware independently

3. **Deployment**
   - Smaller files = faster builds
   - Easier to review changes
   - Reduced merge conflicts

4. **Performance**
   - Better code organization
   - Easier to optimize
   - Clearer dependencies

---

## Risks & Mitigation

### Risk 1: Breaking Changes
**Mitigation:**
- Comprehensive testing
- Gradual migration
- Feature flags

### Risk 2: Performance Impact
**Mitigation:**
- Benchmark before/after
- Monitor performance
- Optimize as needed

### Risk 3: Missing Dependencies
**Mitigation:**
- Careful dependency analysis
- Test all endpoints
- Integration tests

---

## Success Criteria

- [ ] `main.py` < 500 lines
- [ ] All routes in separate routers
- [ ] All business logic in services
- [ ] All middleware extracted
- [ ] All tests passing
- [ ] No performance regression
- [ ] API documentation updated

---

## Timeline

- **Week 1:** Router extraction (40 hours)
- **Week 2:** Service & middleware extraction (50 hours)
- **Week 3:** Testing & cleanup (30 hours)
- **Total:** 120 hours (3 weeks)

---

**Last Updated:** January 2026  
**Status:** Ready for Implementation

