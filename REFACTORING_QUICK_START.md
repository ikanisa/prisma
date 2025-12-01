# Backend Refactoring Quick Start Guide

## 🎯 Goal
Extract endpoints from the monolithic `server/main.py` (7,848 lines) into modular router files.

## ✅ Progress: 6 / ~80 endpoints (7.5%)

## 📁 Files Created So Far
```
server/
├── api_helpers.py           # Shared helper functions (336 lines)
└── routers/
    ├── __init__.py          # Package init
    ├── organization.py      # Org management (3 endpoints)
    └── ada.py               # ADA analytics (3 endpoints)
```

## 🔧 How to Add a New Router

### Step 1: Create the Router File
```bash
# Example: Creating IAM router
touch server/routers/iam.py
```

### Step 2: Basic Router Template
```python
"""IAM (Identity & Access Management) endpoints"""
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import structlog

from ..api_helpers import (
    ensure_org_access_by_id,
    ensure_permission_for_role,
    log_activity_event,
    require_auth,
    supabase_table_request,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


# Define Pydantic models
class YourRequestModel(BaseModel):
    field: str = Field(..., min_length=1)
    # Add more fields


# Define endpoints
@router.post("/your-endpoint")
async def your_endpoint(
    payload: YourRequestModel,
    auth: Dict[str, Any] = Depends(require_auth),
):
    """Your endpoint description"""
    # Implementation here
    pass
```

### Step 3: Find Endpoints in main.py
```bash
# Search for endpoints by prefix
grep -n "@app.get\|@app.post\|@app.put\|@app.delete" server/main.py | grep "/api/your-prefix"
```

### Step 4: Copy Endpoint Logic
1. Copy the `@app.xxx` decorator and function
2. Change `@app.xxx` to `@router.xxx`
3. Copy any Pydantic models used
4. Copy any helper functions (or add to api_helpers.py if reusable)

### Step 5: Import Router in main.py
```python
# Add to imports section (around line 85-89)
from .routers.your_router import router as your_router

# Add router include (around line 7826-7827)
app.include_router(your_router, prefix="/api/your-prefix", tags=["your-tag"])
```

### Step 6: Test Import
```bash
# This should fail with env var error (expected)
# But confirms no syntax errors
python3 -c "from server.routers import your_router"
```

## 🎯 Next Routers to Create

### Priority 1: IAM Router (`routers/iam.py`)
**Endpoints** (6 total):
- `/api/iam/invite` (POST) - Invite member
- `/api/iam/invite/accept` (POST) - Accept invite  
- `/api/iam/invite/revoke` (POST) - Revoke invite
- `/api/iam/member/role` (PATCH) - Update role
- `/api/iam/team/create` (POST) - Create team
- `/api/iam/team/member/add` (POST) - Add team member

**Find them**:
```bash
grep -n "@app.post\|@app.patch" server/main.py | grep -E "invite|member|team"
```

### Priority 2: Documents Router (`routers/documents.py`)
**Endpoints** (3 total):
- `/api/documents` (GET) - List documents
- `/api/documents/upload` (POST) - Upload document
- `/api/documents/{id}` (DELETE) - Delete document

**Find them**:
```bash
grep -n "@app" server/main.py | grep "/api/documents"
```

### Priority 3: Engagements Router (`routers/engagements.py`)
**Endpoints** (~5 total):
- `/api/engagements` (GET, POST)
- `/api/engagements/{id}` (GET, PATCH, DELETE)

**Find them**:
```bash
grep -n "@app" server/main.py | grep "/api/engagements"
```

## 🧪 Testing Checklist

After creating each router:

- [ ] Python import test passes (or fails with env var error only)
- [ ] All Pydantic models are defined
- [ ] All helper functions imported or defined
- [ ] Router included in main.py with correct prefix
- [ ] Endpoints follow async/await pattern
- [ ] Structured logging preserved
- [ ] Activity logging calls present
- [ ] Error handling with HTTPException
- [ ] Auth dependencies correct (`require_auth`, etc.)

## 📦 Available in api_helpers.py

### Authentication
- `require_auth(authorization: str)` - JWT validation + rate limiting
- `verify_supabase_jwt(token: str)` - Token parsing
- `guard_system_admin(actor_id: str)` - Admin check

### Authorization  
- `ensure_org_access_by_id(user_id, org_id)` - Check membership
- `ensure_permission_for_role(role, permission)` - Permission check
- `has_permission(role, permission)` - Boolean permission check

### Database
- `supabase_table_request(method, table, ...)` - Make Supabase API call
- `fetch_org_settings(org_id)` - Get org settings
- `is_system_admin_user(user_id)` - Check admin status

### Logging
- `log_activity_event(org_id, actor_id, action, ...)` - Activity log

### Utilities
- `iso_now()` - UTC timestamp string
- `normalise_role(value)` - Uppercase role
- `normalise_autonomy_level(value)` - Validate autonomy level

### Constants
- `AUTONOMY_LEVEL_RANK` - Level rankings
- `LEGACY_AUTONOMY_NUMERIC_MAP` - Legacy level mapping
- `SUPABASE_REST_URL` - Base URL
- `SUPABASE_HEADERS` - Auth headers

## 💡 Best Practices

1. **Keep routers focused** - One domain per router (IAM, Documents, etc.)
2. **Define models inline** - Pydantic models in same file as router
3. **Extract common helpers** - Add to api_helpers.py if used 3+ times
4. **Preserve logging** - Keep all `logger.info/error` calls
5. **Maintain async** - All endpoints should be `async def`
6. **Document endpoints** - Add docstrings
7. **Test incrementally** - Import test after each router

## �� Common Mistakes to Avoid

- ❌ Forgetting to change `@app.` to `@router.`
- ❌ Missing imports from api_helpers.py
- ❌ Not including router in main.py
- ❌ Copying only part of a function
- ❌ Breaking async/await chains
- ❌ Removing error handling
- ❌ Forgetting activity logging

## 📊 Track Your Progress

Update this after each router:
```
✅ organization.py - 3 endpoints (org management)
✅ ada.py - 3 endpoints (analytics)
⬜ iam.py - 6 endpoints (identity & access)
⬜ documents.py - 3 endpoints (document management)
⬜ engagements.py - 5 endpoints (engagement CRUD)
⬜ controls.py - ~8 endpoints (audit controls)
⬜ workflows.py - ~6 endpoints (workflow management)
⬜ auth.py - ~4 endpoints (authentication)
⬜ tasks.py - ~8 endpoints (task management)
⬜ ... (more to be determined)
```

## 🎉 Success Criteria

A router is complete when:
1. ✅ All endpoints extracted from main.py
2. ✅ Import test passes (structure valid)
3. ✅ Included in main.py with correct prefix
4. ✅ No duplicate code (shared helpers in api_helpers.py)
5. ✅ All Pydantic models defined
6. ✅ Logging preserved
7. ✅ Documentation updated

## 📞 Need Help?

- Review existing routers: `server/routers/organization.py`, `server/routers/ada.py`
- Check api_helpers.py for available functions
- See PHASE_1_2_PROGRESS_SUMMARY.md for detailed documentation
- Pattern: Copy endpoint → Change decorator → Import helpers → Test

---

**Current Status**: 6 / ~80 endpoints migrated (7.5%)
**Target**: 40 endpoints by end of week
**You got this!** 🚀
