# Phase 1: Day 1 - Backend Refactoring Quick Start

**Date**: Ready to Start  
**Duration**: 4-6 hours  
**Goal**: Complete endpoint audit and categorization  

---

## ✅ Prerequisites

Before starting, ensure you have:

```bash
# 1. Python environment activated
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Dependencies installed
pip install -r server/requirements.txt

# 3. Server can start (baseline test)
uvicorn server.main:app --reload --port 8000
# Should start without errors (Ctrl+C to stop)

# 4. Create feature branch
git checkout -b refactor/backend-modularization
```

---

## 🎯 Today's Objectives

1. ✅ Extract all endpoints from `main.py`
2. ✅ Categorize endpoints by domain
3. ✅ Create migration tracking spreadsheet
4. ✅ Identify dependencies for each endpoint

---

## 📋 Step-by-Step Guide

### Step 1: Extract Endpoint Inventory (15 minutes)

Run these commands to analyze `main.py`:

```bash
# Count total endpoints
echo "Total endpoints in main.py:"
grep -c "@app\.\(get\|post\|patch\|delete\)" server/main.py

# Extract all endpoint declarations
grep -n "@app\.\(get\|post\|patch\|delete\)" server/main.py > /tmp/endpoints_raw.txt

# Extract just the paths
grep "@app\.\(get\|post\|patch\|delete\)" server/main.py | \
  sed 's/.*@app\.\(get\|post\|patch\|delete\)("\([^"]*\)".*/\1 \2/' | \
  sort -k2 > /tmp/endpoints_sorted.txt

# View the results
cat /tmp/endpoints_sorted.txt
```

**Expected Output**:
```
delete /api/documents/{id}
get /api/agents
get /api/documents
post /api/auth/login
post /api/documents/upload
...
```

---

### Step 2: Categorize Endpoints (30 minutes)

Create categorization file:

```bash
# Create working directory
mkdir -p /tmp/refactor_workspace

# Create category file
cat > /tmp/refactor_workspace/endpoint_categories.md << 'EOF'
# Endpoint Categories

## Authentication & Authorization (/api/auth, /api/iam)
- [ ] POST /api/iam/org/create
- [ ] POST /api/auth/login
- [ ] POST /api/auth/verify
- [ ] GET /api/auth/me
- [ ] POST /v1/security/verify-captcha

## Documents (/api/documents, /v1/documents)
- [ ] POST /api/documents/upload
- [ ] GET /api/documents
- [ ] GET /api/documents/{id}
- [ ] PATCH /api/documents/{id}
- [ ] DELETE /api/documents/{id}
- [ ] POST /api/documents/search
- [ ] POST /api/documents/chunk

## Workflows (/api/workflows, /v1/workflows)
- [ ] GET /api/workflows
- [ ] POST /api/workflows
- [ ] GET /api/workflows/{id}
- [ ] POST /api/workflows/{id}/execute

## Members & Teams (/api/members, /api/teams)
- [ ] GET /api/members
- [ ] POST /api/members
- [ ] PATCH /api/members/{id}
- [ ] DELETE /api/members/{id}
- [ ] GET /api/teams
- [ ] POST /api/teams

## Organizations (/api/organizations, /api/org)
- [ ] GET /api/organizations
- [ ] POST /api/organizations
- [ ] PATCH /api/organizations/{id}

## Health & Monitoring (/health, /readiness, /metrics)
- [ ] GET /health
- [ ] GET /readiness
- [ ] GET /live

## Security (/v1/security)
- [ ] POST /v1/security/verify-captcha
- [ ] GET /v1/security/csp

## Agents (Already migrated to server/api/agents.py) ✅
## Executions (Already migrated to server/api/executions.py) ✅
## Learning (Already migrated to server/api/learning.py) ✅
## Analytics (Already migrated to server/api/analytics.py) ✅
## Gemini Chat (Already migrated to server/api/gemini_chat.py) ✅

EOF

cat /tmp/refactor_workspace/endpoint_categories.md
```

---

### Step 3: Create Detailed Endpoint Inventory (1 hour)

Create a Python script to extract detailed endpoint information:

```bash
cat > /tmp/refactor_workspace/extract_endpoints.py << 'EOF'
#!/usr/bin/env python3
"""
Extract detailed endpoint information from server/main.py
"""
import re
from pathlib import Path

def extract_endpoints(file_path):
    """Extract all endpoints with line numbers and metadata"""
    with open(file_path, 'r') as f:
        content = f.read()
        lines = content.split('\n')
    
    endpoints = []
    current_line = 0
    
    # Pattern to match @app.METHOD("path")
    pattern = r'@app\.(get|post|patch|delete|put)\("([^"]+)"'
    
    for i, line in enumerate(lines, 1):
        match = re.search(pattern, line)
        if match:
            method = match.group(1).upper()
            path = match.group(2)
            
            # Try to find function name on next line
            func_name = ""
            if i < len(lines):
                func_match = re.search(r'async def (\w+)\(', lines[i])
                if func_match:
                    func_name = func_match.group(1)
            
            # Categorize endpoint
            category = categorize_endpoint(path)
            
            endpoints.append({
                'line': i,
                'method': method,
                'path': path,
                'function': func_name,
                'category': category,
                'status': 'pending'
            })
    
    return endpoints

def categorize_endpoint(path):
    """Categorize endpoint by path"""
    if '/auth' in path or '/iam' in path:
        return 'auth'
    elif '/document' in path:
        return 'documents'
    elif '/workflow' in path:
        return 'workflows'
    elif '/member' in path or '/team' in path:
        return 'members'
    elif '/org' in path:
        return 'organizations'
    elif path in ['/health', '/readiness', '/live']:
        return 'health'
    elif '/security' in path:
        return 'security'
    elif '/agent' in path:
        return 'agents'  # Already migrated
    elif '/execution' in path:
        return 'executions'  # Already migrated
    elif '/learning' in path:
        return 'learning'  # Already migrated
    elif '/analytics' in path:
        return 'analytics'  # Already migrated
    else:
        return 'unknown'

def main():
    file_path = Path(__file__).parent.parent.parent / 'server' / 'main.py'
    endpoints = extract_endpoints(file_path)
    
    # Generate CSV
    print("Line,Method,Path,Function,Category,Status")
    for ep in endpoints:
        print(f"{ep['line']},{ep['method']},{ep['path']},{ep['function']},{ep['category']},{ep['status']}")
    
    # Generate summary
    print("\n\n=== SUMMARY ===")
    categories = {}
    for ep in endpoints:
        cat = ep['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\nEndpoints by Category:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        status = "✅ Migrated" if cat in ['agents', 'executions', 'learning', 'analytics'] else "⏳ Pending"
        print(f"  {cat:20s}: {count:3d} endpoints  {status}")
    
    print(f"\nTotal endpoints in main.py: {len(endpoints)}")

if __name__ == "__main__":
    main()
EOF

chmod +x /tmp/refactor_workspace/extract_endpoints.py
python /tmp/refactor_workspace/extract_endpoints.py > /tmp/refactor_workspace/endpoint_inventory.csv
```

**View the results**:
```bash
cat /tmp/refactor_workspace/endpoint_inventory.csv
```

---

### Step 4: Create Migration Tracker (30 minutes)

Create a detailed migration tracking spreadsheet:

```bash
cat > /tmp/refactor_workspace/MIGRATION_TRACKER.md << 'EOF'
# Backend Refactoring Migration Tracker

**Last Updated**: Day 1  
**Total Endpoints**: TBD  
**Migrated**: 0  
**Remaining**: TBD  

---

## Migration Progress by Category

### ✅ Already Migrated (No Action Needed)
- [x] Agents API (server/api/agents.py) - ~15 endpoints
- [x] Executions API (server/api/executions.py) - ~10 endpoints
- [x] Learning API (server/api/learning.py) - ~12 endpoints
- [x] Analytics API (server/api/analytics.py) - ~5 endpoints
- [x] Gemini Chat API (server/api/gemini_chat.py) - ~3 endpoints

**Subtotal**: ~45 endpoints already modularized ✅

---

### 🔴 Authentication & Authorization (Priority: CRITICAL)
**Target Router**: `server/api/auth.py`  
**Estimated Endpoints**: 15-20  
**Dependencies**: JWT, Supabase, role validation  
**Assigned To**: TBD  
**Status**: Not Started  

| Line | Method | Path | Function | Dependencies | Status |
|------|--------|------|----------|--------------|--------|
| TBD | POST | /api/iam/org/create | create_organization | DB, JWT | ⏳ Pending |
| TBD | POST | /api/auth/login | login | Supabase | ⏳ Pending |
| TBD | POST | /api/auth/verify | verify_token | JWT | ⏳ Pending |

**Migration Checklist**:
- [ ] Extract JWT validation functions to `server/services/auth_service.py`
- [ ] Extract role/permission functions to `server/services/auth_service.py`
- [ ] Create router skeleton
- [ ] Migrate endpoints
- [ ] Update tests
- [ ] Verify all endpoints work
- [ ] Delete from main.py

---

### 🟡 Documents (Priority: HIGH)
**Target Router**: `server/api/documents.py`  
**Estimated Endpoints**: 10-15  
**Dependencies**: RAG, chunking, embedding, Supabase storage  
**Assigned To**: TBD  
**Status**: Not Started  

| Line | Method | Path | Function | Dependencies | Status |
|------|--------|------|----------|--------------|--------|
| TBD | POST | /api/documents/upload | upload_document | RAG, Storage | ⏳ Pending |
| TBD | GET | /api/documents | list_documents | DB | ⏳ Pending |
| TBD | POST | /api/documents/search | search_documents | RAG | ⏳ Pending |

**Migration Checklist**:
- [ ] Extract RAG functions to `server/services/document_service.py`
- [ ] Extract chunking/embedding logic
- [ ] Create router skeleton
- [ ] Migrate endpoints
- [ ] Update tests
- [ ] Verify upload/download works
- [ ] Delete from main.py

---

### 🟡 Workflows (Priority: HIGH)
**Target Router**: `server/api/workflows.py`  
**Estimated Endpoints**: 8-12  
**Dependencies**: Workflow engine, orchestration  
**Assigned To**: TBD  
**Status**: Not Started  

| Line | Method | Path | Function | Dependencies | Status |
|------|--------|------|----------|--------------|--------|
| TBD | GET | /api/workflows | list_workflows | DB | ⏳ Pending |
| TBD | POST | /api/workflows | create_workflow | Orchestration | ⏳ Pending |

---

### 🟢 Members & Teams (Priority: MEDIUM)
**Target Router**: `server/api/members.py`  
**Estimated Endpoints**: 8-10  
**Dependencies**: Auth, permissions  
**Assigned To**: TBD  
**Status**: Not Started  

---

### 🟢 Organizations (Priority: MEDIUM)
**Target Router**: `server/api/organizations.py`  
**Estimated Endpoints**: 5-8  
**Dependencies**: Auth, DB  
**Assigned To**: TBD  
**Status**: Not Started  

---

### 🟢 Health & Monitoring (Priority: LOW)
**Target Router**: `server/api/health.py`  
**Estimated Endpoints**: 3-5  
**Dependencies**: DB, cache, external services  
**Assigned To**: TBD  
**Status**: Not Started  

---

### 🟢 Security (Priority: MEDIUM)
**Target Router**: `server/api/security.py`  
**Estimated Endpoints**: 2-4  
**Dependencies**: CAPTCHA, CSP  
**Assigned To**: TBD  
**Status**: Not Started  

---

## Daily Progress Log

### Day 1 (Today)
- [x] Endpoint inventory created
- [x] Categorization complete
- [x] Migration tracker created
- [ ] Dependencies identified
- [ ] Team assignments made

### Day 2
- [ ] Router skeletons created
- [ ] Service layer modules created
- [ ] Helper functions extracted

### Day 3
- [ ] Auth endpoints migration started
- [ ] Tests updated

---

## Blockers & Risks

| Issue | Impact | Mitigation | Owner | Status |
|-------|--------|------------|-------|--------|
| None yet | - | - | - | - |

---

## Questions for Team

1. Should we migrate endpoints by priority (auth first) or by complexity (easiest first)?
2. Who will be assigned to each router migration?
3. Do we need feature flags for gradual rollout?
4. What's the testing strategy for each migrated router?

---

**Next Steps**:
1. Review this tracker with team
2. Assign owners to each router
3. Schedule daily standups
4. Begin Day 2: Create router skeletons

EOF

cat /tmp/refactor_workspace/MIGRATION_TRACKER.md
```

---

### Step 5: Identify Dependencies (1 hour)

Create a dependency analysis:

```bash
cat > /tmp/refactor_workspace/analyze_dependencies.py << 'EOF'
#!/usr/bin/env python3
"""
Analyze dependencies in server/main.py
"""
import re
from pathlib import Path
from collections import defaultdict

def analyze_dependencies(file_path):
    """Extract import statements and function calls"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Extract imports
    imports = re.findall(r'^from (.+) import (.+)', content, re.MULTILINE)
    
    # Extract function calls
    functions = re.findall(r'def (\w+)\(', content)
    
    # Extract database queries
    db_queries = re.findall(r'(SELECT|INSERT|UPDATE|DELETE) .+ FROM', content, re.IGNORECASE)
    
    return {
        'imports': imports,
        'functions': functions,
        'db_queries': len(db_queries)
    }

def main():
    file_path = Path(__file__).parent.parent.parent / 'server' / 'main.py'
    deps = analyze_dependencies(file_path)
    
    print("=== DEPENDENCY ANALYSIS ===\n")
    
    print(f"Total imports: {len(deps['imports'])}")
    print(f"Total functions: {len(deps['functions'])}")
    print(f"Database queries: {deps['db_queries']}\n")
    
    print("Key Dependencies:")
    print("  - FastAPI (app instance)")
    print("  - SQLAlchemy/Supabase (database)")
    print("  - JWT/Auth (security)")
    print("  - RAG system (documents)")
    print("  - OpenAI (AI features)")
    print("  - Redis (cache)")
    print("  - RQ (job queue)")

if __name__ == "__main__":
    main()
EOF

chmod +x /tmp/refactor_workspace/analyze_dependencies.py
python /tmp/refactor_workspace/analyze_dependencies.py
```

---

## 📊 End of Day 1 Deliverables

You should have:

1. ✅ **Endpoint Inventory** (`/tmp/refactor_workspace/endpoint_inventory.csv`)
2. ✅ **Migration Tracker** (`/tmp/refactor_workspace/MIGRATION_TRACKER.md`)
3. ✅ **Dependency Analysis** (output from script)
4. ✅ **Categorized Endpoints** (`/tmp/refactor_workspace/endpoint_categories.md`)

---

## 📝 Copy Results to Repository

```bash
# Copy tracking documents to repo
cp /tmp/refactor_workspace/MIGRATION_TRACKER.md docs/refactoring/
cp /tmp/refactor_workspace/endpoint_inventory.csv docs/refactoring/
cp /tmp/refactor_workspace/endpoint_categories.md docs/refactoring/

# Create directory if it doesn't exist
mkdir -p docs/refactoring

# Commit Day 1 work
git add docs/refactoring/
git commit -m "docs(refactor): Add Day 1 backend refactoring tracking documents"
git push origin refactor/backend-modularization
```

---

## ✅ Day 1 Success Criteria

- [x] Complete understanding of endpoint distribution
- [x] Clear categorization by domain
- [x] Migration tracking system in place
- [x] Dependencies identified
- [x] Ready to start Day 2 (router skeleton creation)

---

## 🚀 Tomorrow (Day 2)

**Goal**: Create all router skeleton files

**Tasks**:
1. Create `server/api/auth.py` skeleton
2. Create `server/api/documents.py` skeleton
3. Create `server/api/workflows.py` skeleton
4. Create `server/api/members.py` skeleton
5. Create `server/api/organizations.py` skeleton
6. Create `server/api/health.py` skeleton
7. Create `server/api/security.py` skeleton
8. Update `server/api/__init__.py` to export all routers

---

## 📞 Need Help?

- **Stuck on categorization?** Review existing routers in `server/api/` for examples
- **Dependencies unclear?** Use `grep` to find where functions are called
- **Questions?** Post in #backend-refactoring Slack channel

---

**Status**: Day 1 Complete ✅  
**Next**: Day 2 - Create Router Skeletons  
**Updated**: 2025-01-28
