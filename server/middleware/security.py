"""
Security Middleware
Rate limiting, CORS, security headers, and input validation.
"""
from fastapi import Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# CORS configuration
# This is a reference configuration - actual CORS is configured in main.py
# using API_ALLOWED_ORIGINS environment variable
CORS_CONFIG = {
    "allow_origins": ["http://localhost:3000", "http://localhost:5173"],  # Development only
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Authorization", "Content-Type", "X-Request-ID"],
}

# Security headers
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
}

async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response

def validate_api_key(api_key: str) -> bool:
    """Validate API key (placeholder - use real validation)"""
    # In production, validate against database or environment variable
    return len(api_key) >= 32

async def require_api_key(request: Request):
    """Require valid API key for protected endpoints"""
    api_key = request.headers.get("X-API-Key")
    if not api_key or not validate_api_key(api_key):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return api_key
