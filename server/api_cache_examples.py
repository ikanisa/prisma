"""
Example: Integrating Cache Decorator into FastAPI Routes
Demonstrates how to use the caching service in API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from server.cache import CacheService, CacheInvalidation, cached, get_cache
from server.models import Document, Task, SearchResult
from server.repositories import DocumentRepository, TaskRepository

router = APIRouter(prefix="/api/v1", tags=["cached-examples"])

# Get cache instance
cache = get_cache()


# ============================================================================
# EXAMPLE 1: Basic Caching with Decorator
# ============================================================================

@router.get("/documents/{doc_id}")
@cached(ttl=60, key_prefix="document")
async def get_document(
    doc_id: str,
    cache: CacheService = Depends(get_cache)
):
    """
    Get document by ID with 60-second cache
    Cache key: document:{hash of args}
    """
    doc_repo = DocumentRepository()
    document = await doc_repo.get_by_id(doc_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document


# ============================================================================
# EXAMPLE 2: Manual Caching with get_or_set
# ============================================================================

@router.get("/documents")
async def list_documents(
    org_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    cache: CacheService = Depends(get_cache)
):
    """
    List documents with manual cache control
    """
    # Generate cache key with all parameters
    cache_key = f"documents:org:{org_id}:page:{page}:size:{page_size}:status:{status}"
    
    async def fetch_documents():
        doc_repo = DocumentRepository()
        return await doc_repo.list_paginated(
            org_id=org_id,
            page=page,
            page_size=page_size,
            status=status
        )
    
    # Cache for 5 minutes
    return await cache.get_or_set(cache_key, fetch_documents, ttl=300)


# ============================================================================
# EXAMPLE 3: Search with Caching
# ============================================================================

@router.get("/search")
async def search_documents(
    q: str,
    org_id: str,
    cache: CacheService = Depends(get_cache)
) -> SearchResult:
    """
    Search documents with query caching
    Uses hash of query for cache key
    """
    import hashlib
    
    # Create cache key from query hash
    query_hash = hashlib.md5(q.encode()).hexdigest()
    cache_key = f"search:org:{org_id}:{query_hash}"
    
    async def perform_search():
        # Expensive search operation
        from server.services.search import search_service
        return await search_service.search(q, org_id)
    
    # Cache search results for 10 minutes
    return await cache.get_or_set(cache_key, perform_search, ttl=600)


# ============================================================================
# EXAMPLE 4: Cache Invalidation on Updates
# ============================================================================

@router.put("/documents/{doc_id}")
async def update_document(
    doc_id: str,
    update_data: dict,
    cache_invalidation: CacheInvalidation = Depends(lambda: CacheInvalidation(get_cache()))
):
    """
    Update document and invalidate related caches
    """
    doc_repo = DocumentRepository()
    document = await doc_repo.update(doc_id, update_data)
    
    # Invalidate all caches related to this document
    await cache_invalidation.invalidate_document(doc_id)
    
    return document


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    cache_invalidation: CacheInvalidation = Depends(lambda: CacheInvalidation(get_cache()))
):
    """
    Delete document and invalidate caches
    """
    doc_repo = DocumentRepository()
    await doc_repo.soft_delete(doc_id)
    
    # Invalidate document and related caches
    await cache_invalidation.invalidate_document(doc_id)
    
    return {"status": "deleted"}


# ============================================================================
# EXAMPLE 5: Aggregate Data Caching
# ============================================================================

@router.get("/analytics/dashboard")
async def get_dashboard_stats(
    org_id: str,
    cache: CacheService = Depends(get_cache)
):
    """
    Cache expensive aggregations for dashboard
    """
    cache_key = f"dashboard:org:{org_id}"
    
    async def compute_stats():
        from server.services.analytics import analytics_service
        
        # Expensive operations
        stats = await analytics_service.compute_dashboard_stats(org_id)
        return stats
    
    # Cache dashboard stats for 15 minutes
    return await cache.get_or_set(cache_key, compute_stats, ttl=900)


# ============================================================================
# EXAMPLE 6: User-Specific Caching
# ============================================================================

@router.get("/tasks/mine")
async def get_my_tasks(
    user_id: str,
    cache: CacheService = Depends(get_cache)
):
    """
    Cache user-specific task list
    """
    cache_key = f"tasks:user:{user_id}"
    
    async def fetch_tasks():
        task_repo = TaskRepository()
        return await task_repo.get_by_assignee(user_id)
    
    # Cache for 2 minutes (shorter TTL for user-specific data)
    return await cache.get_or_set(cache_key, fetch_tasks, ttl=120)


# ============================================================================
# EXAMPLE 7: Conditional Caching
# ============================================================================

@router.get("/reports/{report_id}")
async def get_report(
    report_id: str,
    force_refresh: bool = Query(False),
    cache: CacheService = Depends(get_cache)
):
    """
    Get report with optional cache bypass
    """
    cache_key = f"report:{report_id}"
    
    # Bypass cache if force_refresh is True
    if force_refresh:
        await cache.delete(cache_key)
    
    async def generate_report():
        from server.services.reporting import report_service
        return await report_service.generate(report_id)
    
    return await cache.get_or_set(cache_key, generate_report, ttl=1800)


# ============================================================================
# EXAMPLE 8: Cache Warm-up
# ============================================================================

@router.post("/admin/cache/warmup")
async def warmup_cache(
    org_id: str,
    cache: CacheService = Depends(get_cache)
):
    """
    Pre-populate cache with frequently accessed data
    """
    from server.services.warmup import warmup_service
    
    # Warm up common caches
    await warmup_service.warmup_organization_data(org_id, cache)
    
    return {"status": "cache warmed up"}


# ============================================================================
# EXAMPLE 9: Cache Statistics
# ============================================================================

@router.get("/admin/cache/stats")
async def get_cache_stats(cache: CacheService = Depends(get_cache)):
    """
    Get cache statistics (requires Redis info command)
    """
    await cache.connect()
    info = await cache.redis.info("stats")
    
    return {
        "hits": info.get("keyspace_hits", 0),
        "misses": info.get("keyspace_misses", 0),
        "hit_rate": info.get("keyspace_hits", 0) / max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 1), 1),
    }


# ============================================================================
# EXAMPLE 10: Clear Cache by Pattern
# ============================================================================

@router.delete("/admin/cache/clear")
async def clear_cache_pattern(
    pattern: str = Query("*"),
    cache_invalidation: CacheInvalidation = Depends(lambda: CacheInvalidation(get_cache()))
):
    """
    Clear cache by pattern (admin only)
    Examples:
    - pattern=documents:* (all document caches)
    - pattern=search:* (all search caches)
    - pattern=* (all caches - use with caution)
    """
    cache = cache_invalidation.cache
    await cache.delete_pattern(pattern)
    
    return {"status": f"cleared caches matching {pattern}"}
