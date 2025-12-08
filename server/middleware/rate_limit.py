"""
Rate Limiting Middleware for FastAPI
Implements rate limiting for write endpoints to prevent abuse.

This module provides utilities for rate limiting. The actual rate limiter
implementation is in server/rate_limiter.py which uses Redis for distributed
rate limiting across multiple instances.
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded


# Custom error handler for slowapi rate limit exceeded (if slowapi is used elsewhere)
def rate_limit_error_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom error handler for rate limit exceeded errors.
    Returns 429 status with informative error message.
    
    Note: This is for slowapi integration if needed elsewhere in the app.
    The main rate limiting for write endpoints is handled by the middleware
    in server/main.py using server/rate_limiter.py
    """
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please try again later.",
            "retry_after": exc.detail,
        },
        headers={"Retry-After": str(exc.detail)}
    )
