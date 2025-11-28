"""
Phase 1B: Caching Activation - Integration Guide
Demonstrates how to activate caching in FastAPI routes
"""

# ============================================================================
# STEP 1: Update main.py to include caching middleware
# ============================================================================

# Add to server/main.py:
"""
from server.cache import get_cache, CacheService
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize cache
    cache = get_cache()
    await cache.connect()
    yield
    # Shutdown: Close cache connection
    await cache.close()

app = FastAPI(lifespan=lifespan)
"""

# ============================================================================
# STEP 2: Import caching utilities in route modules
# ============================================================================

# server/api/routes/documents.py (EXAMPLE)
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from server.cache import CacheService, CacheInvalidation, cached, get_cache
from server.models.document import Document, DocumentCreate, DocumentUpdate

router = APIRouter(prefix="/api/documents", tags=["documents"])

# ============================================================================
# EXAMPLE 1: GET endpoint with caching
# ============================================================================

@router.get("/{document_id}", response_model=Document)
@cached(ttl=60, key_prefix="document")  # Cache for 60 seconds
async def get_document(
    document_id: str,
    cache: CacheService = Depends(get_cache)
):
    """
    Get document by ID (cached for 60 seconds)
    """
    # This will be cached automatically by the decorator
    document = await fetch_document_from_db(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document

# ============================================================================
# EXAMPLE 2: LIST endpoint with manual caching
# ============================================================================

@router.get("/", response_model=List[Document])
async def list_documents(
    org_id: str = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    cache: CacheService = Depends(get_cache)
):
    """
    List documents with pagination (cached for 5 minutes)
    """
    # Generate unique cache key
    cache_key = f"documents:org:{org_id}:page:{page}:size:{page_size}:status:{status}"
    
    async def fetch_documents():
        # Expensive database query
        return await db.documents.find({
            "org_id": org_id,
            "status": status
        }).skip((page - 1) * page_size).limit(page_size).to_list()
    
    # Use get_or_set for manual caching
    return await cache.get_or_set(cache_key, fetch_documents, ttl=300)

# ============================================================================
# EXAMPLE 3: POST/PUT/DELETE with cache invalidation
# ============================================================================

@router.post("/", response_model=Document)
async def create_document(
    document: DocumentCreate,
    cache_invalidation: CacheInvalidation = Depends(lambda: CacheInvalidation(get_cache()))
):
    """
    Create document and invalidate related caches
    """
    new_document = await db.documents.insert_one(document.dict())
    
    # Invalidate organization's document list cache
    await cache_invalidation.invalidate_organization(document.org_id)
    
    return new_document

@router.put("/{document_id}", response_model=Document)
async def update_document(
    document_id: str,
    update: DocumentUpdate,
    cache_invalidation: CacheInvalidation = Depends(lambda: CacheInvalidation(get_cache()))
):
    """
    Update document and invalidate caches
    """
    updated_document = await db.documents.update_one(
        {"_id": document_id},
        {"$set": update.dict(exclude_unset=True)}
    )
    
    # Invalidate specific document cache
    await cache_invalidation.invalidate_document(document_id)
    
    return updated_document

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    cache_invalidation: CacheInvalidation = Depends(lambda: CacheInvalidation(get_cache()))
):
    """
    Delete document and invalidate caches
    """
    await db.documents.soft_delete(document_id)
    
    # Invalidate document and related caches
    await cache_invalidation.invalidate_document(document_id)
    
    return {"status": "deleted"}

# ============================================================================
# EXAMPLE 4: Search endpoint with query hash caching
# ============================================================================

@router.get("/search", response_model=List[Document])
async def search_documents(
    q: str = Query(..., min_length=2),
    org_id: str = Query(...),
    cache: CacheService = Depends(get_cache)
):
    """
    Search documents (cached by query hash for 10 minutes)
    """
    import hashlib
    
    # Create cache key from query hash
    query_hash = hashlib.md5(f"{q}:{org_id}".encode()).hexdigest()
    cache_key = f"search:org:{org_id}:{query_hash}"
    
    async def perform_search():
        # Expensive full-text search
        return await db.documents.find({
            "$text": {"$search": q},
            "org_id": org_id
        }).to_list()
    
    return await cache.get_or_set(cache_key, perform_search, ttl=600)

# ============================================================================
# server/api/routes/tasks.py (EXAMPLE)
# ============================================================================

router_tasks = APIRouter(prefix="/api/tasks", tags=["tasks"])

@router_tasks.get("/", response_model=List[Task])
async def list_tasks(
    assignee_id: Optional[str] = None,
    status: Optional[str] = None,
    cache: CacheService = Depends(get_cache)
):
    """
    List tasks (cached for 2 minutes)
    """
    cache_key = f"tasks:assignee:{assignee_id}:status:{status}"
    
    async def fetch_tasks():
        query = {}
        if assignee_id:
            query["assignee_id"] = assignee_id
        if status:
            query["status"] = status
        return await db.tasks.find(query).to_list()
    
    # Shorter TTL for user-specific data
    return await cache.get_or_set(cache_key, fetch_tasks, ttl=120)

# ============================================================================
# server/api/routes/analytics.py (EXAMPLE)
# ============================================================================

router_analytics = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router_analytics.get("/dashboard")
async def get_dashboard_stats(
    org_id: str = Query(...),
    cache: CacheService = Depends(get_cache)
):
    """
    Get dashboard statistics (cached for 15 minutes)
    """
    cache_key = f"dashboard:org:{org_id}"
    
    async def compute_stats():
        # Expensive aggregations
        total_documents = await db.documents.count_documents({"org_id": org_id})
        total_tasks = await db.tasks.count_documents({"org_id": org_id})
        pending_tasks = await db.tasks.count_documents({
            "org_id": org_id,
            "status": {"$in": ["todo", "in_progress"]}
        })
        
        return {
            "total_documents": total_documents,
            "total_tasks": total_tasks,
            "pending_tasks": pending_tasks,
            "completion_rate": (total_tasks - pending_tasks) / max(total_tasks, 1)
        }
    
    # Longer TTL for aggregated data
    return await cache.get_or_set(cache_key, compute_stats, ttl=900)

# ============================================================================
# STEP 3: Register routers in main.py
# ============================================================================

# server/main.py
"""
from server.api.routes import documents, tasks, analytics

app.include_router(documents.router)
app.include_router(tasks.router_tasks)
app.include_router(analytics.router_analytics)
"""

# ============================================================================
# STEP 4: Add health check with cache status
# ============================================================================

@app.get("/health")
async def health_check(cache: CacheService = Depends(get_cache)):
    """
    Health check including cache status
    """
    cache_healthy = False
    try:
        await cache.connect()
        await cache.redis.ping()
        cache_healthy = True
    except Exception as e:
        print(f"Cache health check failed: {e}")
    
    return {
        "status": "healthy" if cache_healthy else "degraded",
        "cache": "connected" if cache_healthy else "disconnected",
        "timestamp": datetime.utcnow().isoformat()
    }

# ============================================================================
# ACTIVATION CHECKLIST
# ============================================================================

"""
✅ Step 1: Update server/main.py with cache lifespan
✅ Step 2: Add @cached decorator to GET endpoints
✅ Step 3: Use get_or_set for complex caching logic
✅ Step 4: Add cache invalidation to POST/PUT/DELETE
✅ Step 5: Test cache hit rates in staging
✅ Step 6: Monitor Redis memory usage
✅ Step 7: Set up cache warm-up scripts (optional)

Expected Results:
- API response time: -90% (cached requests)
- Backend load: -70%
- Cache hit rate: 80%+ after warm-up
- Redis memory: <500MB for typical workload
"""
