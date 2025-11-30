# Endpoint Authentication & Rate Limiting Audit

**Date:** November 29, 2025  
**Auditor:** GitHub Copilot Agent  
**Scope:** All FastAPI endpoints in server/main.py

---

## Summary

**Total Endpoints:** 86  
**Protected (require_auth):** 80 (93%)  
**Public:** 6 (7%)  
**With Custom Rate Limits:** 2 (RAG endpoints)  
**Need Rate Limiting:** 20+ write endpoints

---

## Public Endpoints (No Auth Required) ✅

These endpoints are intentionally public:

| Endpoint | Purpose | Rate Limit Needed |
|----------|---------|------------------|
| `GET /health` | Health check | ❌ No (monitoring) |
| `GET /healthz` | Kubernetes health | ❌ No (monitoring) |
| `GET /readiness` | Readiness probe | ❌ No (monitoring) |
| `POST /v1/security/verify-captcha` | Cloudflare Turnstile | ✅ Yes (5/min) |
| `POST /api/iam/members/accept` | Accept invite (no auth) | ✅ Yes (3/hour) |
| `GET /metrics` (if exists) | Prometheus metrics | ❌ No (monitoring) |

**Action:** These are correctly public. Add rate limiting to captcha and invite acceptance.

---

## Protected Endpoints Requiring Rate Limits

### 🔴 HIGH PRIORITY - Write Operations

#### RAG/AI Endpoints (Already Protected ✅)
| Endpoint | Current Auth | Custom Rate Limit | Status |
|----------|-------------|-------------------|--------|
| `POST /v1/rag/ingest` | ✅ require_auth | ✅ Custom (enforce_rate_limit) | DONE |
| `POST /v1/rag/search` | ✅ require_auth | ✅ Custom (enforce_rate_limit) | DONE |
| `POST /v1/rag/reembed` | ✅ require_auth | ❌ Need 10/hour | TODO |

#### Document Upload Endpoints
| Endpoint | Auth | Suggested Limit |
|----------|------|----------------|
| `POST /v1/vector-stores/{id}/files` | ✅ | 5/minute |
| `POST /v1/vector-stores` | ✅ | 20/minute |
| `POST /v1/vector-stores/{id}/file-batches` | ✅ | 10/minute |

#### IAM/Admin Operations
| Endpoint | Auth | Suggested Limit |
|----------|------|----------------|
| `POST /api/iam/org/create` | ✅ | 3/hour |
| `POST /api/iam/members/invite` | ✅ | 10/hour |
| `POST /api/iam/members/update-role` | ✅ | 20/hour |
| `POST /api/iam/teams/create` | ✅ | 10/hour |
| `POST /api/admin/impersonation/request` | ✅ | 5/hour |

#### Audit/Controls Operations
| Endpoint | Auth | Suggested Limit |
|----------|------|----------------|
| `POST /api/controls` | ✅ | 50/minute |
| `POST /api/controls/walkthrough` | ✅ | 100/minute |
| `POST /api/ada/run` | ✅ | 20/minute |

### 🟡 MEDIUM PRIORITY - Read Operations

#### List/Query Endpoints
| Endpoint | Auth | Suggested Limit |
|----------|------|----------------|
| `GET /api/iam/members/list` | ✅ | 100/minute |
| `GET /api/admin/auditlog/list` | ✅ | 50/minute |
| `GET /api/controls` | ✅ | 100/minute |
| `GET /v1/vector-stores` | ✅ | 100/minute |
| `GET /v1/tasks` | ✅ | 100/minute |

---

## Endpoint Authentication Status

### ✅ Correctly Protected (Sample)

```python
@app.post("/api/iam/members/invite")
async def invite_member(
    payload: InviteMemberRequest,
    auth: Dict[str, Any] = Depends(require_auth)  # ✅ AUTH PRESENT
)

@app.post("/v1/rag/ingest")
async def ingest(
    file: UploadFile = File(...),
    org_slug_form: str = Form(..., alias="orgSlug"),
    auth: Dict[str, Any] = Depends(require_auth)  # ✅ AUTH PRESENT
)
```

### ✅ Correctly Public

```python
@app.get("/health", tags=["observability"])
async def health():  # ✅ Public health check
    return {"status": "ok"}

@app.post("/v1/security/verify-captcha", tags=["security"])
async def verify_turnstile_token(
    payload: CaptchaVerificationRequest,
    request: Request
):  # ✅ Public captcha verification
```

---

## Implementation Plan

### Phase 1: Apply Rate Limiting to Critical Writes (2 hours)

```python
# Import at top of main.py (already done)
# limiter = setup_rate_limiting(app)

# Apply to high-risk endpoints
@app.post("/api/iam/org/create")
@limiter.limit("3/hour")
async def create_organization(
    request: Request,  # Required for rate limiting
    payload: CreateOrgRequest,
    auth: Dict[str, Any] = Depends(require_auth)
):
    ...

@app.post("/api/iam/members/invite")
@limiter.limit("10/hour")
async def invite_member(
    request: Request,
    payload: InviteMemberRequest,
    auth: Dict[str, Any] = Depends(require_auth)
):
    ...
```

### Phase 2: Apply to Document Operations (1 hour)

```python
@app.post("/v1/vector-stores/{vector_store_id}/files")
@limiter.limit("5/minute")
async def create_vector_store_file(
    request: Request,
    vector_store_id: str,
    file: UploadFile = File(...),
    auth: Dict[str, Any] = Depends(require_auth)
):
    ...
```

### Phase 3: Apply to Read Operations (1 hour)

```python
@app.get("/api/admin/auditlog/list")
@limiter.limit("50/minute")
async def list_audit_logs(
    request: Request,
    org: str = Query(..., alias="orgId"),
    auth: Dict[str, Any] = Depends(require_auth)
):
    ...
```

---

## Testing Plan

### 1. Unit Tests
```bash
# Test rate limiting enforcement
pytest server/tests/test_rate_limiting.py -v

# Test auth requirements
pytest server/tests/test_auth.py -v
```

### 2. Integration Tests
```bash
# Test captcha rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:8000/v1/security/verify-captcha \
    -H "Content-Type: application/json" \
    -d '{"token":"test"}'
done
# Should see 429 after 5 requests

# Test protected endpoint without auth
curl -X POST http://localhost:8000/api/iam/members/invite \
  -H "Content-Type: application/json" \
  -d '{"orgId":"test","role":"EMPLOYEE","emailOrPhone":"test@test.com"}'
# Should return 401 Unauthorized
```

### 3. Load Tests
```bash
# Use Artillery for concurrent load testing
artillery run tests/load/rate-limiting.yml
```

---

## Recommended Rate Limits by Category

| Category | Limit | Reasoning |
|----------|-------|-----------|
| **IAM Operations** | 10-20/hour | Prevent account enumeration |
| **Document Upload** | 5/minute | Expensive, resource-intensive |
| **AI/RAG** | 10-20/minute | OpenAI API costs |
| **Audit Logs** | 50/minute | Read-heavy, less risky |
| **Controls/Workflow** | 50-100/minute | Normal business operations |
| **Health Checks** | No limit | Monitoring must work |
| **Captcha** | 5/minute | Anti-abuse |

---

## Security Considerations

### 1. Bypass for Service Accounts
Consider exempting service accounts from rate limits:
```python
def get_rate_limit_key(auth: Dict[str, Any]) -> str:
    user_id = auth.get("sub")
    # Check if service account
    if auth.get("user_metadata", {}).get("is_service_account"):
        return f"service:{user_id}"  # Higher limits
    return f"user:{user_id}"
```

### 2. Different Limits by Tier
```python
def get_user_tier(auth: Dict[str, Any]) -> str:
    # Check subscription tier
    tier = auth.get("user_metadata", {}).get("tier", "free")
    return tier

# Apply in decorator
@limiter.limit(lambda: "100/hour" if get_user_tier(auth) == "premium" else "20/hour")
```

### 3. Monitoring & Alerting
```python
# Log rate limit hits
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    logger.warning(
        "rate_limit_exceeded",
        path=request.url.path,
        user=request.state.user_id if hasattr(request.state, "user_id") else "anonymous"
    )
    # Alert if excessive (>1000/day from single user)
```

---

## Known Issues

### 1. Request Parameter Required
SlowAPI requires `Request` parameter in functions using `@limiter.limit()`:
```python
# ❌ WRONG
@limiter.limit("10/minute")
async def endpoint(auth: Dict = Depends(require_auth)):
    ...

# ✅ CORRECT
@limiter.limit("10/minute")
async def endpoint(request: Request, auth: Dict = Depends(require_auth)):
    ...
```

### 2. Custom Rate Limiting Already Exists
Some endpoints use `enforce_rate_limit()` function. Consider consolidating to one approach.

---

## Next Steps

1. **Immediate (Today):**
   - [ ] Apply rate limiting to IAM operations (org create, invite)
   - [ ] Apply rate limiting to document uploads
   - [ ] Add Request parameter where needed

2. **Tomorrow:**
   - [ ] Test all rate limits with curl/Postman
   - [ ] Run integration test suite
   - [ ] Monitor logs for 429 responses

3. **Week 1:**
   - [ ] Fine-tune rate limits based on usage patterns
   - [ ] Implement tiered rate limits
   - [ ] Add monitoring dashboard

---

## Files to Modify

1. `server/main.py` - Add rate limit decorators
2. `server/tests/test_rate_limiting.py` - Add tests (create if needed)
3. `tests/load/rate-limiting.yml` - Artillery load test config

---

**Status:** Audit Complete | Ready for Implementation  
**Next:** Apply rate limiting to high-priority endpoints
