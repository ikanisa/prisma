"""
Rate Limiting Middleware for FastAPI
Implements rate limiting for write endpoints to prevent abuse.
"""

from fastapi import Request, HTTPException, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Callable
import logging

logger = logging.getLogger(__name__)


def get_rate_limit_key(request: Request) -> str:
    """
    Get rate limit key based on client IP and user identification.
    Uses IP address as the primary identifier.
    """
    return get_remote_address(request)


# Initialize rate limiter with sensible defaults
# 100 requests per minute for write endpoints (POST, PUT, PATCH, DELETE)
limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=["100/minute"],
    headers_enabled=True,
)


def apply_write_endpoint_rate_limits(limiter: Limiter):
    """
    Configure rate limits for write endpoints.
    
    Returns a decorator that can be applied to write endpoint routers.
    
    Usage in routes:
        from server.middleware.rate_limit import limiter
        
        @router.post("/create")
        @limiter.limit("10/minute")
        async def create_item(request: Request):
            pass
    """
    return limiter


# Custom error handler for rate limit exceeded
def rate_limit_error_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom error handler for rate limit exceeded errors.
    Returns 429 status with informative error message.
    """
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please try again later.",
            "retry_after": exc.detail,
        },
        headers={"Retry-After": str(exc.detail)}
    )
