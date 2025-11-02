# Service/API Layer & Tool Proxy Review

**Job:** P3-API  
**Version:** 1.0.0  
**Last Updated:** 2025-11-02  
**Purpose:** Document API architecture, tool proxy implementation, and RBAC enforcement

---

## Overview

The Prisma Glow API layer consists of:
1. **FastAPI Backend** (`server/main.py`) - Python 3.11+ API with 285KB main file
2. **Express Gateway** (`apps/gateway/`) - Node.js API gateway with proxy and routing
3. **Service Layer** (`services/api/`) - TypeScript service abstractions

---

## Architecture Pattern

### Layered Architecture

```
┌─────────────────────────────────────────┐
│         Client Applications             │
│  (apps/web, apps/admin, apps/staff)    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│       Express Gateway (Node.js)         │
│  • Route handling                       │
│  • CORS/Auth middleware                 │
│  • Rate limiting                        │
│  • Request correlation                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│       FastAPI Backend (Python)          │
│  • Controllers (HTTP handlers)          │
│  • Services (business logic)            │
│  • Adapters (external integrations)     │
│  • Tool Proxy (/api/tools/*)            │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌───────────────┐    ┌──────────────┐
│   Supabase    │    │   OpenAI     │
│   PostgreSQL  │    │   Platform   │
└───────────────┘    └──────────────┘
```

---

## FastAPI Backend (server/main.py)

### Current State

**File Size:** 285,027 bytes (285KB)  
**Complexity:** Very high - single file with extensive logic

**Key Components:**
- HTTP endpoint handlers
- JWT verification
- RBAC enforcement
- CORS/CSP middleware
- Rate limiting
- Document processing
- Agent orchestration
- RAG operations
- Workflow management

### Concerns

⚠️ **Large Monolithic File:** `main.py` is extremely large (285KB)

**Recommendation:**
```
server/
├── main.py                    # FastAPI app + startup
├── api/
│   ├── v1/
│   │   ├── __init__.py
│   │   ├── auth.py            # Auth endpoints
│   │   ├── documents.py       # Document endpoints
│   │   ├── tasks.py           # Task endpoints
│   │   ├── accounting.py      # Accounting endpoints
│   │   ├── audit.py           # Audit endpoints
│   │   ├── tax.py             # Tax endpoints
│   │   └── tools.py           # Tool proxy endpoints
│   └── deps.py                # Shared dependencies
├── services/
│   ├── auth_service.py
│   ├── document_service.py
│   ├── task_service.py
│   └── ...
├── adapters/
│   ├── supabase_adapter.py
│   ├── openai_adapter.py
│   └── ...
└── middleware/
    ├── cors.py
    ├── rbac.py
    └── rate_limit.py
```

---

## Tool Proxy Implementation

### Purpose

The Tool Proxy enforces server-side tool whitelisting, preventing direct client→OpenAI tool calls and ensuring all tool invocations go through validated backend logic.

### Configuration

**Source:** `config/agents.yaml`

```yaml
tool_proxy:
  enabled: true
  namespace: "/api/tools"
  require_auth: true
  
  whitelist:
    # Document & Knowledge
    - "search_documents"
    - "get_document"
    - "upload_document"
    - "extract_document_data"
    - "search_knowledge_base"
    - "get_citations"
    
    # Task Management
    - "create_task"
    - "get_task"
    - "update_task"
    - "list_tasks"
    
    # Accounting
    - "get_trial_balance"
    - "get_journal_entries"
    - "create_journal_entry"
    - "validate_journal_entry"
    
    # Audit
    - "get_audit_plan"
    - "get_audit_procedures"
    - "record_audit_evidence"
    
    # Tax
    - "calculate_corporate_tax"
    - "calculate_vat"
    - "validate_tax_return"
    
    # Analytics
    - "get_financial_metrics"
    - "generate_report"
```

### Endpoint Structure

**Namespace:** `/api/tools/*`

**Example Endpoints:**
```
POST /api/tools/search_documents
POST /api/tools/create_task
POST /api/tools/get_trial_balance
POST /api/tools/calculate_vat
```

### Implementation Pattern

```python
# server/api/v1/tools.py
from fastapi import APIRouter, Depends, HTTPException
from ..deps import get_current_user, check_tool_permission

router = APIRouter(prefix="/api/tools", tags=["tools"])

TOOL_WHITELIST = [
    "search_documents",
    "get_document",
    # ... (load from config/agents.yaml)
]

@router.post("/{tool_name}")
async def invoke_tool(
    tool_name: str,
    payload: dict,
    user = Depends(get_current_user)
):
    # 1. Validate tool is whitelisted
    if tool_name not in TOOL_WHITELIST:
        raise HTTPException(
            status_code=403,
            detail=f"Tool '{tool_name}' is not whitelisted"
        )
    
    # 2. Check user permissions
    await check_tool_permission(user, tool_name)
    
    # 3. Rate limit check
    await check_rate_limit(user, tool_name)
    
    # 4. Invoke tool handler
    handler = get_tool_handler(tool_name)
    result = await handler(payload, user)
    
    # 5. Log tool invocation
    await log_tool_call(user, tool_name, payload, result)
    
    return result
```

### Tool Handler Registry

```python
# server/services/tools.py
from typing import Callable, Dict

ToolHandler = Callable[[dict, User], Awaitable[dict]]

TOOL_HANDLERS: Dict[str, ToolHandler] = {
    "search_documents": handle_search_documents,
    "create_task": handle_create_task,
    "get_trial_balance": handle_get_trial_balance,
    # ...
}

def get_tool_handler(tool_name: str) -> ToolHandler:
    if tool_name not in TOOL_HANDLERS:
        raise ValueError(f"No handler for tool: {tool_name}")
    return TOOL_HANDLERS[tool_name]
```

### Rate Limiting per Tool

```python
# From config/agents.yaml
TOOL_RATE_LIMITS = {
    "document_operations": {"limit": 12, "window": 300},
    "knowledge_operations": {"limit": 30, "window": 60},
    "task_operations": {"limit": 20, "window": 60},
    "finance_operations": {"limit": 40, "window": 60},
}

def get_tool_category(tool_name: str) -> str:
    """Map tool to rate limit category."""
    if tool_name in ["search_documents", "get_document", "upload_document"]:
        return "document_operations"
    elif tool_name in ["search_knowledge_base", "get_citations"]:
        return "knowledge_operations"
    # ...
```

---

## RBAC Enforcement

### Role Hierarchy

**Source:** `config/system.yaml`

```yaml
rbac:
  roles:
    - SYSTEM_ADMIN    # Precedence: 100
    - PARTNER         # Precedence: 90
    - EQR             # Precedence: 75
    - MANAGER         # Precedence: 70
    - EMPLOYEE        # Precedence: 50
    - CLIENT          # Precedence: 40
    - READONLY        # Precedence: 30
    - SERVICE_ACCOUNT # Precedence: 20
```

### Permission Matrix

```yaml
rbac:
  matrix:
    close.lock: PARTNER
    journal.post: MANAGER
    audit.plan.freeze: PARTNER
    audit.report.release: PARTNER
    eqr.signoff: EQR
    tax.return.submit: MANAGER
```

### RBAC Middleware

```python
# server/middleware/rbac.py
from functools import wraps

ROLE_PRECEDENCE = {
    "SYSTEM_ADMIN": 100,
    "PARTNER": 90,
    "EQR": 75,
    "MANAGER": 70,
    "EMPLOYEE": 50,
    "CLIENT": 40,
    "READONLY": 30,
    "SERVICE_ACCOUNT": 20,
}

def require_role(min_role: str):
    """Decorator to enforce minimum role requirement."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = kwargs.get('user') or args[0]
            if not user:
                raise HTTPException(401, "Authentication required")
            
            user_precedence = ROLE_PRECEDENCE.get(user.role, 0)
            required_precedence = ROLE_PRECEDENCE.get(min_role, 100)
            
            if user_precedence < required_precedence:
                raise HTTPException(
                    403,
                    f"Requires {min_role} role or higher"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Usage
@router.post("/journal/post")
@require_role("MANAGER")
async def post_journal_entry(entry: JournalEntry, user = Depends(get_current_user)):
    # Only MANAGER or higher can access
    pass
```

### Organization-Scoped Permissions

```python
def require_org_permission(org_id: str, action: str):
    """Check if user has permission for action in organization."""
    async def check(user = Depends(get_current_user)):
        # 1. Verify user is member of org
        membership = await get_membership(user.id, org_id)
        if not membership or membership.status != "active":
            raise HTTPException(403, "Not a member of organization")
        
        # 2. Check role has permission for action
        required_role = PERMISSION_MATRIX.get(action)
        if required_role:
            user_precedence = ROLE_PRECEDENCE[membership.role]
            required_precedence = ROLE_PRECEDENCE[required_role]
            
            if user_precedence < required_precedence:
                raise HTTPException(
                    403,
                    f"Action '{action}' requires {required_role} role"
                )
        
        return membership
    
    return check
```

---

## Structured Errors

### Error Response Schema

```python
# server/api/schemas.py
from pydantic import BaseModel
from typing import Optional, List

class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str
    code: str

class ErrorResponse(BaseModel):
    error: str
    message: str
    status_code: int
    details: Optional[List[ErrorDetail]] = None
    request_id: str
    timestamp: str
```

### Error Handling

```python
# server/main.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import structlog

logger = structlog.get_logger()

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = request.headers.get("x-request-id", "unknown")
    
    error_response = {
        "error": exc.__class__.__name__,
        "message": exc.detail,
        "status_code": exc.status_code,
        "request_id": request_id,
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    logger.error(
        "http_error",
        status_code=exc.status_code,
        message=exc.detail,
        request_id=request_id,
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response,
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    request_id = request.headers.get("x-request-id", "unknown")
    
    logger.exception(
        "unhandled_exception",
        error=str(exc),
        request_id=request_id,
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred",
            "status_code": 500,
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )
```

---

## Correlation IDs

### Request ID Middleware

```python
# server/middleware/correlation.py
from fastapi import Request
import uuid

async def correlation_id_middleware(request: Request, call_next):
    # Get or generate correlation ID
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    
    # Store in context for logging
    request.state.request_id = request_id
    
    # Call next middleware/handler
    response = await call_next(request)
    
    # Add to response headers
    response.headers["x-request-id"] = request_id
    
    return response

# Add to app
app.middleware("http")(correlation_id_middleware)
```

### Logging with Correlation IDs

```python
import structlog

logger = structlog.get_logger()

# In endpoint handler
@router.get("/documents/{doc_id}")
async def get_document(doc_id: str, request: Request):
    logger.info(
        "get_document",
        doc_id=doc_id,
        request_id=request.state.request_id,
    )
    
    # ... logic ...
```

---

## OpenAPI Documentation

### Current Status

**Location:** `openapi/fastapi.json`

**Generation:**
```bash
# Export OpenAPI schema
python3 server/export_openapi.py

# Generate TypeScript types
openapi-typescript openapi/fastapi.json -o packages/api-client/types.ts
```

### OpenAPI Configuration

```python
# server/main.py
app = FastAPI(
    title="Prisma Glow API",
    description="AI-powered operations suite API",
    version="1.0.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)
```

### Schema Export

```python
# server/export_openapi.py
import json
from pathlib import Path
from .main import app

def export_openapi():
    """Export OpenAPI schema to JSON file."""
    schema = app.openapi()
    
    output_path = Path(__file__).parent.parent / "openapi" / "fastapi.json"
    output_path.parent.mkdir(exist_ok=True)
    
    with open(output_path, "w") as f:
        json.dump(schema, f, indent=2)
    
    print(f"OpenAPI schema exported to {output_path}")

if __name__ == "__main__":
    export_openapi()
```

---

## Express Gateway (apps/gateway)

### Purpose

Node.js API gateway providing:
- Reverse proxy to FastAPI
- CORS handling
- Session management
- Rate limiting
- Request logging

### Structure

```
apps/gateway/
├── src/
│   ├── server.js          # Express app
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── cors.js
│   │   └── rateLimit.js
│   └── routes/
│       └── proxy.js
├── package.json
└── tsconfig.json
```

### Gateway Configuration

```javascript
// apps/gateway/src/server.js
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// CORS
app.use(cors({
  origin: process.env.API_ALLOWED_ORIGINS?.split(','),
  credentials: true,
}));

// Proxy to FastAPI
app.use('/api', createProxyMiddleware({
  target: process.env.FASTAPI_BASE_URL,
  changeOrigin: true,
  onProxyReq: (proxyReq, req) => {
    // Add correlation ID
    const requestId = req.headers['x-request-id'] || uuidv4();
    proxyReq.setHeader('x-request-id', requestId);
  },
}));
```

---

## Services Layer (services/api)

### Current State

**Location:** `services/api/src/`

**Files:**
- `index.ts` - Main exports
- `cookies.ts` - Cookie utilities

### Recommendation

Expand services layer to match backend structure:

```
services/api/
├── src/
│   ├── services/
│   │   ├── AuthService.ts
│   │   ├── DocumentService.ts
│   │   ├── TaskService.ts
│   │   └── ...
│   ├── adapters/
│   │   ├── SupabaseAdapter.ts
│   │   ├── OpenAIAdapter.ts
│   │   └── ...
│   ├── utils/
│   │   ├── cookies.ts
│   │   ├── validation.ts
│   │   └── ...
│   └── index.ts
└── package.json
```

---

## Action Items

### Priority 1: Refactor Large Files

- [ ] **Split server/main.py:** Break into api/v1/ modules
- [ ] Create separate service modules
- [ ] Create adapter modules
- [ ] Extract middleware to separate files

### Priority 2: Tool Proxy

- [ ] **Document current implementation:** Where are tool endpoints?
- [ ] **Implement whitelist enforcement:** Load from config/agents.yaml
- [ ] **Add rate limiting per tool category**
- [ ] **Add tool invocation logging**
- [ ] **Create tool handler registry**

### Priority 3: RBAC

- [ ] **Document RBAC implementation:** Current guards and checks
- [ ] **Consolidate RBAC logic:** Create reusable decorators
- [ ] **Add org-scoped permission checks**
- [ ] **Create permission matrix loader from config/system.yaml**

### Priority 4: API Documentation

- [ ] **Enhance OpenAPI schemas:** Add examples and descriptions
- [ ] **Document all endpoints:** Purpose, request/response schemas
- [ ] **Create API usage guide:** For frontend developers
- [ ] **Add Postman collection:** For API testing

### Priority 5: Error Handling

- [ ] **Standardize error responses:** Use ErrorResponse schema
- [ ] **Add error codes:** For client-side handling
- [ ] **Improve error messages:** User-friendly descriptions
- [ ] **Add error tracking:** Correlation with Sentry

---

## Testing Strategy

### Current Status

- **API smoke tests:** `tests/api/test_core_smoke.py`
- **Health checks:** `/health` endpoint

### Recommendations

1. **Unit Tests:** Test service and adapter logic
2. **Integration Tests:** Test API endpoints with test database
3. **Tool Proxy Tests:** Verify whitelist enforcement
4. **RBAC Tests:** Verify permission checks at all levels
5. **Load Tests:** Use k6 or Artillery for performance testing

---

## Security Considerations

### Current Measures

✅ **JWT Verification:** Token validation on protected endpoints  
✅ **CORS:** Configured allowed origins  
✅ **Rate Limiting:** Basic rate limits in place  
✅ **CSP/HSTS:** Security headers configured  

### Improvements Needed

🔄 **Input Validation:** Validate all request bodies with Pydantic/Zod  
🔄 **SQL Injection Prevention:** Use parameterized queries (already using SQLAlchemy)  
🔄 **XSS Prevention:** Sanitize outputs (HTML responses)  
🔄 **CSRF Protection:** Add CSRF tokens for state-changing operations  
🔄 **API Key Rotation:** Regular rotation schedule (see SECURITY/keys_rotation.md)  

---

## Monitoring & Observability

### Current Infrastructure

- **Correlation IDs:** `x-request-id` header propagation
- **Structured Logging:** `structlog` for JSON logs
- **Error Tracking:** Sentry integration
- **OpenTelemetry:** OTEL_* environment variables configured

### Recommendations

1. **API Metrics:** Track request count, latency, error rate per endpoint
2. **Tool Metrics:** Track tool invocations, success rate, latency
3. **RBAC Metrics:** Track permission denials (security alerts)
4. **Alerts:** Set up alerts for error rate spikes, high latency

---

## Summary

### Current State

✅ **Functional API:** FastAPI backend with comprehensive endpoints  
✅ **Gateway Layer:** Express gateway with proxy and middleware  
⚠️ **Large Monolith:** 285KB main.py needs refactoring  
⚠️ **Tool Proxy:** Needs explicit documentation and implementation  
✅ **RBAC:** Role hierarchy and permissions in place  
✅ **Error Handling:** Structured errors with correlation IDs  

### Key Improvements

1. **Refactor main.py** into modular API structure
2. **Document and enhance tool proxy** with whitelist enforcement
3. **Consolidate RBAC logic** into reusable guards
4. **Expand OpenAPI documentation** with examples
5. **Add comprehensive testing** for all layers

---

**Last Updated:** 2025-11-02  
**Maintainer:** API Team  
**Related:** `config/agents.yaml`, `config/system.yaml`, `REFACTOR/plan.md`
