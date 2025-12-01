"""
FastAPI Security Middleware
Implements CORS, rate limiting, and security headers
"""

import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time
from typing import Callable
import logging

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses
    """
    
    SECURITY_HEADERS = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        "X-DNS-Prefetch-Control": "off",
        "X-Download-Options": "noopen",
        "X-Permitted-Cross-Domain-Policies": "none",
    }
    
    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)
        
        # Add all security headers
        for header, value in self.SECURITY_HEADERS.items():
            response.headers[header] = value
        
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Log all requests for security monitoring
    """
    
    async def dispatch(self, request: Request, call_next: Callable):
        start_time = time.time()
        
        # Log request
        logger.info(
            f"[REQUEST] {request.method} {request.url.path}",
            extra={
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
            }
        )
        
        response = await call_next(request)
        
        # Log response
        process_time = time.time() - start_time
        logger.info(
            f"[RESPONSE] {request.method} {request.url.path} - {response.status_code} ({process_time:.3f}s)",
            extra={
                "status_code": response.status_code,
                "process_time": process_time,
            }
        )
        
        # Add processing time header
        response.headers["X-Process-Time"] = str(process_time)
        
        return response


def configure_security(app: FastAPI, allowed_origins: list[str] = None):
    """
    Configure all security middleware for FastAPI app
    
    Args:
        app: FastAPI application instance
        allowed_origins: List of allowed CORS origins (default: localhost only)
    """
    
    # Default allowed origins for development
    if allowed_origins is None:
        allowed_origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]
    
    # 1. Trusted Host Middleware (must be first)
    # Get allowed hosts from environment or use secure defaults
    allowed_hosts = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    allowed_hosts = [host.strip() for host in allowed_hosts if host.strip()]
    
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=allowed_hosts or ["localhost", "127.0.0.1"]
    )
    
    # 2. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
        max_age=86400,  # 24 hours
    )
    
    # 3. Security Headers Middleware
    app.add_middleware(SecurityHeadersMiddleware)
    
    # 4. Request Logging Middleware
    app.add_middleware(RequestLoggingMiddleware)
    
    logger.info("Security middleware configured successfully")


def setup_rate_limiting(app: FastAPI):
    """
    Configure rate limiting for FastAPI app
    
    Usage in routes:
        from slowapi import Limiter
        limiter = Limiter(key_func=get_remote_address)
        
        @app.get("/api/endpoint")
        @limiter.limit("10/minute")
        async def endpoint(request: Request):
            ...
    """
    
    # Initialize limiter
    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    
    # Add rate limit exceeded handler
    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        return JSONResponse(
            status_code=429,
            content={
                "error": "rate_limit_exceeded",
                "message": "Too many requests. Please try again later.",
                "retry_after": exc.detail,
            },
            headers={"Retry-After": str(exc.detail)}
        )
    
    logger.info("Rate limiting configured successfully")
    
    return limiter


# Example usage in main.py:
"""
from server.security_middleware import configure_security, setup_rate_limiting

app = FastAPI()

# Configure security
configure_security(
    app,
    allowed_origins=[
        "https://prisma-glow.com",
        "https://*.prisma-glow.com",
    ]
)

# Setup rate limiting
limiter = setup_rate_limiting(app)

# Use in routes
@app.post("/api/ai/generate")
@limiter.limit("10/minute")
async def generate_ai(request: Request):
    ...
"""
