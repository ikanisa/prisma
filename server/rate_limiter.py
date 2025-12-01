"""
Rate Limiting Middleware

Implements rate limiting for FastAPI endpoints using Redis backend.
Prevents abuse and ensures fair resource allocation.
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Optional, Callable
import time
import hashlib
from functools import wraps

# Rate limit configurations by endpoint category
RATE_LIMITS = {
    "default": {"requests": 100, "window": 60},  # 100 req/min
    "auth": {"requests": 5, "window": 60},  # 5 req/min (login, register)
    "create": {"requests": 10, "window": 60},  # 10 req/min (POST operations)
    "search": {"requests": 30, "window": 60},  # 30 req/min (search operations)
    "upload": {"requests": 5, "window": 300},  # 5 req/5min (file uploads)
}


class RateLimiter:
    """
    Rate limiter using sliding window algorithm with Redis.
    """

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.local_cache = {}  # Fallback when Redis unavailable

    def _get_client_id(self, request: Request) -> str:
        """
        Get unique identifier for client (IP + User-Agent hash).
        """
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        
        # Hash user agent to save space
        ua_hash = hashlib.md5(user_agent.encode()).hexdigest()[:8]
        
        return f"{client_ip}:{ua_hash}"

    def _get_key(self, client_id: str, endpoint: str) -> str:
        """
        Generate Redis key for rate limit tracking.
        """
        return f"ratelimit:{endpoint}:{client_id}"

    async def check_rate_limit(
        self,
        request: Request,
        endpoint: str,
        limit_type: str = "default"
    ) -> bool:
        """
        Check if request is within rate limits.
        
        Returns True if allowed, raises HTTPException if limit exceeded.
        """
        config = RATE_LIMITS.get(limit_type, RATE_LIMITS["default"])
        max_requests = config["requests"]
        window_seconds = config["window"]

        client_id = self._get_client_id(request)
        key = self._get_key(client_id, endpoint)
        
        now = time.time()
        window_start = now - window_seconds

        if self.redis:
            try:
                # Use Redis sorted set for sliding window
                # Remove old entries
                await self.redis.zremrangebyscore(key, 0, window_start)
                
                # Count requests in current window
                count = await self.redis.zcard(key)
                
                if count >= max_requests:
                    # Get oldest request time for retry-after header
                    oldest = await self.redis.zrange(key, 0, 0, withscores=True)
                    if oldest:
                        retry_after = int(oldest[0][1] + window_seconds - now)
                    else:
                        retry_after = window_seconds
                    
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            "error": "Rate limit exceeded",
                            "limit": max_requests,
                            "window": window_seconds,
                            "retry_after": retry_after
                        },
                        headers={"Retry-After": str(retry_after)}
                    )
                
                # Add current request
                await self.redis.zadd(key, {str(now): now})
                await self.redis.expire(key, window_seconds)
                
                return True
                
            except Exception as e:
                # Redis error - log and allow request (fail open)
                print(f"Rate limiter Redis error: {e}")
                return True
        else:
            # Fallback to local cache (memory-based)
            if key not in self.local_cache:
                self.local_cache[key] = []
            
            # Clean old entries
            self.local_cache[key] = [
                ts for ts in self.local_cache[key] 
                if ts > window_start
            ]
            
            if len(self.local_cache[key]) >= max_requests:
                retry_after = int(self.local_cache[key][0] + window_seconds - now)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "error": "Rate limit exceeded",
                        "limit": max_requests,
                        "window": window_seconds,
                        "retry_after": retry_after
                    },
                    headers={"Retry-After": str(retry_after)}
                )
            
            self.local_cache[key].append(now)
            
            return True


def rate_limit(limit_type: str = "default"):
    """
    Decorator for rate limiting endpoints.
    
    Usage:
        @router.post("/agents")
        @rate_limit("create")
        async def create_agent(...):
            pass
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request from kwargs
            request = kwargs.get("request")
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if request:
                # Get rate limiter from app state
                limiter = getattr(request.app.state, "rate_limiter", None)
                if limiter:
                    endpoint = f"{request.method}:{request.url.path}"
                    await limiter.check_rate_limit(request, endpoint, limit_type)
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


# Dependency for FastAPI routes
async def check_rate_limit_dependency(request: Request, limit_type: str = "default"):
    """
    FastAPI dependency for rate limiting.
    
    Usage:
        @router.post("/agents", dependencies=[Depends(check_rate_limit_dependency)])
        async def create_agent(...):
            pass
    """
    limiter = getattr(request.app.state, "rate_limiter", None)
    if limiter:
        endpoint = f"{request.method}:{request.url.path}"
        await limiter.check_rate_limit(request, endpoint, limit_type)
