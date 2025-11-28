import hashlib
import json
from functools import wraps
from typing import Any, Callable, Optional
import structlog

logger = structlog.get_logger(__name__)

def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache endpoint responses in Redis
    
    Args:
        ttl: Time to live in seconds (default 5 min)
        key_prefix: Optional prefix for cache keys
    
    Usage:
        @router.get("/agents")
        @cached(ttl=300, key_prefix="agents_list")
        async def list_agents(request: Request, ...):
            return agents
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get request from kwargs (FastAPI injects it)
            request = kwargs.get('request')
            if not request or not hasattr(request.app.state, 'redis'):
                # No request or no Redis = no caching
                return await func(*args, **kwargs)
            
            # Generate cache key
            cache_key = _generate_cache_key(
                key_prefix or func.__name__,
                request.url.path,
                dict(request.query_params)
            )
            
            # Try to get from cache
            redis = request.app.state.redis
            try:
                cached_value = await redis.get(cache_key)
                
                if cached_value:
                    logger.info("cache_hit", key=cache_key, ttl=ttl)
                    return json.loads(cached_value)
            except Exception as e:
                logger.warning("cache_get_failed", error=str(e), key=cache_key)
            
            # Cache miss - execute function
            logger.info("cache_miss", key=cache_key)
            result = await func(*args, **kwargs)
            
            # Store in cache (fire and forget - don't fail request if cache fails)
            try:
                await redis.setex(
                    cache_key,
                    ttl,
                    json.dumps(result, default=str)
                )
                logger.info("cache_set", key=cache_key, ttl=ttl)
            except Exception as e:
                logger.warning("cache_set_failed", error=str(e), key=cache_key)
            
            return result
        
        return wrapper
    return decorator


def _generate_cache_key(prefix: str, path: str, params: dict) -> str:
    """Generate deterministic cache key from request parameters"""
    # Sort params for consistent key generation
    params_str = json.dumps(dict(sorted(params.items())), sort_keys=True)
    hash_input = f"{prefix}:{path}:{params_str}"
    key_hash = hashlib.md5(hash_input.encode()).hexdigest()[:12]
    return f"cache:{prefix}:{key_hash}"


async def invalidate_cache_pattern(redis, pattern: str) -> int:
    """
    Invalidate all cache keys matching pattern
    
    Args:
        redis: Redis client
        pattern: Pattern to match (e.g., "cache:agents_list:*")
    
    Returns:
        Number of keys invalidated
    """
    keys = []
    try:
        async for key in redis.scan_iter(match=pattern):
            keys.append(key)
        
        if keys:
            await redis.delete(*keys)
            logger.info("cache_invalidated", pattern=pattern, count=len(keys))
            return len(keys)
    except Exception as e:
        logger.error("cache_invalidation_failed", error=str(e), pattern=pattern)
    
    return 0


async def get_cache_stats(redis) -> dict:
    """
    Get cache statistics
    
    Returns:
        Dictionary with cache stats (keys, memory, hit rate)
    """
    try:
        info = await redis.info("stats")
        keyspace = await redis.info("keyspace")
        
        # Count cache keys
        cache_keys = 0
        async for _ in redis.scan_iter(match="cache:*"):
            cache_keys += 1
        
        return {
            "total_keys": cache_keys,
            "hits": info.get("keyspace_hits", 0),
            "misses": info.get("keyspace_misses", 0),
            "hit_rate": (
                info["keyspace_hits"] / (info["keyspace_hits"] + info["keyspace_misses"])
                if (info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0)) > 0
                else 0
            ),
            "used_memory_human": info.get("used_memory_human", "unknown"),
        }
    except Exception as e:
        logger.error("cache_stats_failed", error=str(e))
        return {"error": str(e)}
