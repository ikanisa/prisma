# P3: Service/API Layer & Tool Proxy

## Status
- **Version:** 1.0.0
- **Last Updated:** 2025-11-02
- **Owner:** Engineering Core Team & Gateway Guild
- **Phase:** P3 - API Architecture

## Executive Summary

Complete documentation of the API architecture covering layered design (Client → Gateway → FastAPI), tool proxy implementation with whitelist enforcement, RBAC with 8 roles, structured error handling, and OpenAPI schema generation.

**Architecture:**
- **3-tier:** Client → Express Gateway → FastAPI Backend
- **Tool Proxy:** Server-side enforcement with 30+ whitelisted tools
- **RBAC:** 8 roles with precedence-based permissions
- **Error Handling:** Structured responses with correlation IDs
- **API Contracts:** OpenAPI → TypeScript types (automated)

---

## Layered Architecture

### Overview
```
┌──────────────────────────────────────────────────────┐
│              Client Layer (Browser)                  │
│  Next.js App (apps/web) + Admin Portal (apps/admin) │
│  - React components                                  │
│  - TanStack Query for data fetching                  │
│  - Generated TypeScript API client                   │
└─────────────────┬────────────────────────────────────┘
                  │ HTTPS
                  │
┌─────────────────▼────────────────────────────────────┐
│           Gateway Layer (Node.js/Express)            │
│                 apps/gateway                         │
│  - Request routing & load balancing                  │
│  - Authentication & session management               │
│  - Tool proxy with whitelist enforcement             │
│  - RBAC permission checks                            │
│  - Rate limiting (Redis-backed)                      │
│  - OpenTelemetry tracing                             │
│  - Request/response logging                          │
└─────────────────┬────────────────────────────────────┘
                  │ HTTP (internal)
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼───┐   ┌─────▼──────┐  ┌──▼────┐
│FastAPI│   │    RAG     │  │Agents │
│Backend│   │  Service   │  │Service│
│server/│   │services/rag│  │svc/ag.│
└───────┘   └────────────┘  └───────┘
    │             │             │
    └─────────────┼─────────────┘
                  │
          ┌───────▼────────┐
          │   Supabase     │
          │ PostgreSQL 15  │
          │   + pgvector   │
          └────────────────┘
```

### Responsibilities by Layer

#### Client Layer
**Responsibilities:**
- Render UI components
- Handle user interactions
- Form validation (client-side)
- Optimistic UI updates
- Token management (localStorage)
- Route-based code splitting

**Technology:**
- Next.js 14 (App Router)
- React 18
- TanStack Query v5
- Supabase JS Client
- Generated API Client

**Example:**
```typescript
// apps/web/app/documents/page.tsx
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@prisma-glow/api-client';

export default function DocumentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['documents', orgId],
    queryFn: () => apiClient.documents.list({ orgId }),
  });
  
  return <DocumentTable documents={data} />;
}
```

---

#### Gateway Layer
**Responsibilities:**
- **Routing:** Forward requests to appropriate backend service
- **Auth:** Validate JWTs, manage sessions
- **RBAC:** Check user permissions before forwarding
- **Tool Proxy:** Enforce whitelist for agent tool calls
- **Rate Limiting:** Per-user, per-endpoint limits
- **Tracing:** Add correlation IDs, OpenTelemetry spans
- **Logging:** Request/response logs with PII masking
- **Error Translation:** Convert backend errors to API responses

**Technology:**
- Express.js
- express-session
- ioredis (rate limiting + cache)
- @opentelemetry/sdk-node
- @sentry/node

**Port:** 3001 (default)

**Example:**
```typescript
// apps/gateway/src/server.ts
import express from 'express';
import { authMiddleware, rbacMiddleware, rateLimitMiddleware } from './middleware';
import { toolProxyRouter } from './routers/tool-proxy';

const app = express();

app.use(authMiddleware);
app.use(rateLimitMiddleware);

app.use('/api/tools', rbacMiddleware, toolProxyRouter);
app.use('/api/documents', proxyToFastAPI('/documents'));
app.use('/api/rag', proxyToRAGService);

app.listen(3001);
```

---

#### Backend Layer (FastAPI)
**Responsibilities:**
- **Business Logic:** Accounting, audit, tax computations
- **Database Access:** Prisma-style ORM (SQLAlchemy)
- **Validation:** Pydantic v2 models
- **Background Jobs:** Celery tasks
- **OpenAPI Schema:** Auto-generated from Pydantic models
- **RLS Enforcement:** Row-level security via Supabase client

**Technology:**
- FastAPI
- Pydantic v2
- SQLAlchemy
- asyncpg
- Supabase Python Client

**Port:** 8000 (default)

**Example:**
```python
# server/api/documents.py
from fastapi import APIRouter, Depends
from server.models import Document, DocumentListRequest
from server.auth import get_current_user

router = APIRouter(prefix="/documents")

@router.post("/list")
async def list_documents(
    request: DocumentListRequest,
    user = Depends(get_current_user)
):
    # RLS enforced via Supabase
    documents = await supabase
        .from_("documents")
        .select("*")
        .eq("organization_id", request.org_id)
        .execute()
    
    return {"documents": documents.data}
```

---

## Tool Proxy Architecture

### Purpose
Prevent direct client→OpenAI tool calls. All tools must be server-side with explicit whitelist approval.

**Security Goals:**
1. Prevent unauthorized data access
2. Enforce approval gates (HITL)
3. Audit all tool invocations
4. Rate limit tool usage

### Implementation

**Endpoint:** `POST /api/tools/:toolName`

**Flow:**
```
Client Request
    │
    ▼
Gateway: Check whitelist
    │
    ├─ Not whitelisted? → 403 Forbidden
    │
    ▼ Whitelisted
Check RBAC permissions
    │
    ├─ No permission? → 403 Forbidden
    │
    ▼ Authorized
Check rate limit
    │
    ├─ Exceeded? → 429 Too Many Requests
    │
    ▼ Within limit
Check approval gate
    │
    ├─ Approval required? → 202 Pending Approval
    │
    ▼ No approval OR already approved
Execute tool (FastAPI/RAG/Agent service)
    │
    ▼
Log tool call (audit trail)
    │
    ▼
Return response
```

**Whitelist Configuration:**
See `config/agents.yaml` for full 30+ tool whitelist.

**Example:**
```typescript
// apps/gateway/src/routers/tool-proxy.ts
import { Router } from 'express';
import { loadConfig } from '@prisma-glow/system-config';

const router = Router();
const config = await loadConfig();
const whitelist = new Set(config.tool_proxy.whitelist.map(t => t.name));

router.post('/:toolName', async (req, res) => {
  const { toolName } = req.params;
  
  // 1. Whitelist check
  if (!whitelist.has(toolName)) {
    return res.status(403).json({
      error: 'Tool not whitelisted',
      tool: toolName,
      correlation_id: req.correlationId,
    });
  }
  
  // 2. RBAC check
  const toolConfig = config.tool_proxy.whitelist.find(t => t.name === toolName);
  if (!hasPermission(req.user, toolConfig)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      required_role: toolConfig.min_role,
      correlation_id: req.correlationId,
    });
  }
  
  // 3. Rate limit check
  const rateLimitKey = `tool:${toolName}:${req.user.id}`;
  const allowed = await checkRateLimit(rateLimitKey, toolConfig.rate_limit);
  if (!allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retry_after: await getRateLimitReset(rateLimitKey),
      correlation_id: req.correlationId,
    });
  }
  
  // 4. Approval gate check
  if (toolConfig.approval_required) {
    const approval = await getApproval(req.user, toolName, req.body);
    if (!approval) {
      return res.status(202).json({
        status: 'pending_approval',
        approval_id: await createApprovalRequest(req.user, toolName, req.body),
        correlation_id: req.correlationId,
      });
    }
  }
  
  // 5. Execute tool
  const result = await executeToolOnBackend(toolName, req.body);
  
  // 6. Audit log
  await logToolCall({
    tool: toolName,
    user: req.user.id,
    org: req.user.orgId,
    params: req.body,
    result: result,
    correlation_id: req.correlationId,
    timestamp: new Date(),
  });
  
  return res.json(result);
});

export default router;
```

---

## RBAC Implementation

### 8 Roles with Precedence

**Role Precedence (1 = highest):**
1. **SYSTEM_ADMIN** - All permissions
2. **PARTNER** - Can lock close, freeze audit plan, release reports
3. **EQR** - Can sign off on audit reports
4. **MANAGER** - Can post journals, assign tasks, submit tax returns
5. **EMPLOYEE** - Can create tasks, upload documents
6. **CLIENT** - Can view PBC folders, upload to PBC
7. **READONLY** - Can view internal documents, tasks
8. **SERVICE_ACCOUNT** - API access only

### Permission Matrix

| Permission | SYSTEM_ADMIN | PARTNER | EQR | MANAGER | EMPLOYEE | CLIENT | READONLY |
|------------|--------------|---------|-----|---------|----------|--------|----------|
| close.lock | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| journal.post | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| audit.plan.freeze | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| audit.report.release | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| eqr.signoff | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| tax.return.submit | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| tasks.create | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| tasks.assign | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| documents.upload | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (PBC only) | ❌ |
| documents.view_internal | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| documents.view_pbc | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

### Permission Check Implementation

```typescript
// apps/gateway/src/middleware/rbac.ts
import { loadConfig } from '@prisma-glow/system-config';

export function requirePermission(permission: string) {
  return async (req, res, next) => {
    const user = req.user;
    const config = await loadConfig();
    
    // Get user's role
    const membership = await getMembership(user.id, req.orgId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of organization' });
    }
    
    // Check permission
    const roleConfig = config.rbac.roles.find(r => r.id === membership.role);
    if (!roleConfig) {
      return res.status(500).json({ error: 'Invalid role configuration' });
    }
    
    // SYSTEM_ADMIN has all permissions
    if (roleConfig.permissions.includes('*')) {
      return next();
    }
    
    // Check specific permission
    if (!roleConfig.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
        role: membership.role,
        correlation_id: req.correlationId,
      });
    }
    
    next();
  };
}

// Usage
app.post('/api/close/lock', requirePermission('close.lock'), async (req, res) => {
  // Implementation
});
```

---

## Structured Error Handling

### Error Response Format

```typescript
interface ApiError {
  error: string;              // Human-readable error message
  error_code: string;         // Machine-readable error code
  correlation_id: string;     // Request correlation ID
  details?: Record<string, any>; // Optional error details
  stack?: string;             // Stack trace (development only)
  timestamp: string;          // ISO 8601 timestamp
}
```

**Example:**
```json
{
  "error": "Insufficient permissions to lock accounting close period",
  "error_code": "PERMISSION_DENIED",
  "correlation_id": "req_abc123def456",
  "details": {
    "required_permission": "close.lock",
    "user_role": "EMPLOYEE",
    "min_required_role": "PARTNER"
  },
  "timestamp": "2025-11-02T16:30:00.000Z"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | User not authenticated |
| `PERMISSION_DENIED` | 403 | User lacks required permission |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `TOOL_NOT_WHITELISTED` | 403 | Tool not in whitelist |
| `APPROVAL_REQUIRED` | 202 | Action requires approval |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Handler Implementation

```typescript
// apps/gateway/src/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public errorCode: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    correlation_id: req.correlationId,
    url: req.url,
    method: req.method,
  });
  
  // Send Sentry error (production)
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(err);
  }
  
  // Format response
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      error_code: err.errorCode,
      correlation_id: req.correlationId,
      details: err.details,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Unknown error
  return res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    error_code: 'INTERNAL_ERROR',
    correlation_id: req.correlationId,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  });
}
```

---

## OpenAPI Schema Generation

### Process

```
FastAPI (Python)
    │
    ▼
Generate OpenAPI JSON
    │ (server/export_openapi.py)
    ▼
openapi/fastapi.json
    │
    ▼ (openapi-typescript)
packages/api-client/types.ts
    │
    ▼
Gateway & Next.js (consume)
```

### Automation (CI Workflow)

**File:** `.github/workflows/openapi-client.yml`

```yaml
name: OpenAPI Client Generation

on:
  push:
    paths:
      - 'server/**/*.py'
      - 'server/export_openapi.py'
  pull_request:
    paths:
      - 'server/**/*.py'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r server/requirements.txt
      
      - name: Generate OpenAPI JSON
        run: python3 server/export_openapi.py
      
      - name: Generate TypeScript types
        run: |
          pnpm install
          pnpm run codegen:api
      
      - name: Check for drift
        run: |
          if ! git diff --exit-code packages/api-client/types.ts openapi/fastapi.json; then
            echo "ERROR: OpenAPI or types drift detected"
            echo "Run 'pnpm run codegen:api' and commit the changes"
            exit 1
          fi
```

### FastAPI OpenAPI Export

```python
# server/export_openapi.py
from fastapi.openapi.utils import get_openapi
from server.main import app
import json

def export_openapi():
    openapi_schema = get_openapi(
        title="Prisma Glow API",
        version="1.0.0",
        description="Autonomous Finance Suite Backend API",
        routes=app.routes,
    )
    
    with open("openapi/fastapi.json", "w") as f:
        json.dump(openapi_schema, f, indent=2)
    
    print("OpenAPI schema exported to openapi/fastapi.json")

if __name__ == "__main__":
    export_openapi()
```

### TypeScript Client Generation

```bash
# Generate types from OpenAPI
pnpm exec openapi-typescript openapi/fastapi.json -o packages/api-client/types.ts
```

**Generated types example:**
```typescript
// packages/api-client/types.ts (generated)
export interface paths {
  "/documents/list": {
    post: {
      requestBody: {
        content: {
          "application/json": {
            org_id: string;
            folder?: string;
            limit?: number;
          };
        };
      };
      responses: {
        200: {
          content: {
            "application/json": {
              documents: Document[];
            };
          };
        };
      };
    };
  };
}
```

---

## Rate Limiting

### Configuration

**Storage:** Redis  
**Strategy:** Token bucket per user per endpoint  
**Granularity:** Per-minute and per-hour windows

**Example Limits:**
- Global API: 60 req/min per user
- Document upload: 12 req/5min per user
- Assistant queries: 20 req/min per user
- RAG search: 40 req/min per user

### Implementation

```typescript
// apps/gateway/src/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}) {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rl:',
    }),
    windowMs: options.windowMs,
    max: options.max,
    keyGenerator: options.keyGenerator || ((req) => {
      return `${req.user?.id || req.ip}:${req.path}`;
    }),
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        error_code: 'RATE_LIMIT_EXCEEDED',
        retry_after: Math.ceil(options.windowMs / 1000),
        correlation_id: req.correlationId,
      });
    },
  });
}

// Apply to routes
app.use('/api/documents/upload', createRateLimiter({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: 12,
}));

app.use('/api/assistant', createRateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  max: 20,
}));
```

---

## OpenTelemetry Tracing

### Instrumentation

```typescript
// apps/gateway/src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
  serviceName: process.env.OTEL_SERVICE_NAME || 'gateway',
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
```

### Correlation IDs

```typescript
// apps/gateway/src/middleware/correlation-id.ts
import { v4 as uuidv4 } from 'uuid';

export function correlationIdMiddleware(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || `req_${uuidv4()}`;
  res.setHeader('x-correlation-id', req.correlationId);
  next();
}
```

---

## Related Documentation

- [REFACTOR/plan.md](./plan.md) - Overall refactor plan
- [REFACTOR/map.md](./map.md) - Architecture mapping
- [ENV_GUIDE.md](../ENV_GUIDE.md) - Environment variables
- [config/agents.yaml](../config/agents.yaml) - Tool proxy whitelist
- [SECURITY.md](../SECURITY.md) - Security policies

---

## Appendix

### API Endpoints Summary

**Gateway (apps/gateway):**
- `/api/tools/*` - Tool proxy (30+ tools)
- `/api/documents/*` - Document management
- `/api/tasks/*` - Task management
- `/api/close/*` - Accounting close
- `/api/audit/*` - Audit procedures
- `/api/tax/*` - Tax computations
- `/api/rag/*` - RAG search
- `/api/assistant/*` - Assistant queries

**FastAPI (server/):**
- `/docs` - Interactive API docs (Swagger UI)
- `/redoc` - Alternative API docs (ReDoc)
- `/openapi.json` - OpenAPI schema
- `/health` - Health check
- `/metrics` - Prometheus metrics

### Performance Targets

- **Gateway Response Time:** p50 < 50ms, p95 < 200ms, p99 < 500ms
- **Tool Proxy Latency:** +10-30ms overhead
- **Rate Limit Check:** < 5ms (Redis)
- **RBAC Check:** < 10ms (cached)

### Version History
- **v1.0.0** (2025-11-02): Initial API architecture documentation
