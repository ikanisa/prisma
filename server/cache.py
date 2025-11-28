"""
Redis Cache Service for FastAPI
Provides caching layer for API responses and database queries
"""

from redis import asyncio as aioredis
import json
import hashlib
from typing import Optional, Any, Callable
from functools import wraps
import logging
import os

logger = logging.getLogger(__name__)


class CacheService:
    """Redis-based caching service with async support"""
    
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis = None
    
    async def connect(self):
        """Initialize Redis connection"""
        if not self.redis:
            self.redis = await aioredis.from_url(
                self.redis_url, 
                encoding="utf-8", 
                decode_responses=True
            )
            logger.info("Redis cache connected successfully")
    
    async def close(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
            logger.info("Redis cache disconnected")
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            await self.connect()
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300):
        """Set value in cache with TTL (seconds)"""
        try:
            await self.connect()
            await self.redis.setex(
                key, 
                ttl, 
                json.dumps(value, default=str)
            )
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
    
    async def delete(self, key: str):
        """Delete key from cache"""
        try:
            await self.connect()
            await self.redis.delete(key)
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
    
    async def delete_pattern(self, pattern: str):
        """Delete all keys matching pattern"""
        try:
            await self.connect()
            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)
                logger.info(f"Deleted {len(keys)} keys matching {pattern}")
        except Exception as e:
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
    
    async def get_or_set(
        self, 
        key: str, 
        factory: Callable, 
        ttl: int = 300
    ) -> Any:
        """Get from cache or compute and store"""
        cached = await self.get(key)
        if cached is not None:
            logger.debug(f"Cache hit: {key}")
            return cached
        
        logger.debug(f"Cache miss: {key}")
        result = await factory()
        await self.set(key, result, ttl)
        return result
    
    def cache_key(self, *args, **kwargs) -> str:
        """Generate cache key from arguments"""
        key_data = json.dumps(
            {"args": args, "kwargs": kwargs}, 
            sort_keys=True,
            default=str
        )
        return hashlib.sha256(key_data.encode()).hexdigest()[:16]


class CacheInvalidation:
    """Cache invalidation strategies"""
    
    def __init__(self, cache: CacheService):
        self.cache = cache
    
    async def invalidate_document(self, doc_id: str):
        """Invalidate all caches related to a document"""
        patterns = [
            f"document:*{doc_id}*",
            f"documents:*",
            f"search:*"
        ]
        for pattern in patterns:
            await self.cache.delete_pattern(pattern)
    
    async def invalidate_organization(self, org_id: str):
        """Invalidate all caches for an organization"""
        await self.cache.delete_pattern(f"*:org:{org_id}:*")
    
    async def invalidate_user(self, user_id: str):
        """Invalidate all caches for a user"""
        await self.cache.delete_pattern(f"*:user:{user_id}:*")
    
    async def invalidate_all(self):
        """Clear all cache (use with caution)"""
        await self.cache.delete_pattern("*")


def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator for caching function results
    
    Usage:
        @cached(ttl=60, key_prefix="document")
        async def get_document(doc_id: str):
            return await db.get_document(doc_id)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get cache instance from kwargs or create new one
            cache = kwargs.get('cache')
            if not cache:
                cache = CacheService()
            
            # Generate cache key
            cache_key = f"{key_prefix}:{cache.cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            result = await cache.get(cache_key)
            if result is not None:
                return result
            
            # Compute and cache
            result = await func(*args, **kwargs)
            if result is not None:
                await cache.set(cache_key, result, ttl)
            return result
        
        return wrapper
    return decorator


# Singleton instance
_cache_instance = None


def get_cache() -> CacheService:
    """Get or create cache service instance"""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = CacheService()
    return _cache_instance
