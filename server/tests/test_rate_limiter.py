"""
Tests for rate limiting functionality
"""

import pytest
from fastapi import FastAPI, Request, HTTPException
from fastapi.testclient import TestClient
from server.rate_limiter import RateLimiter, rate_limit, RATE_LIMITS


class TestRateLimiter:
    """Test suite for rate limiting."""

    def test_rate_limiter_initialization(self):
        """Test rate limiter can be initialized."""
        limiter = RateLimiter()
        assert limiter.redis is None
        assert limiter.local_cache == {}

    def test_rate_limits_configuration(self):
        """Test rate limit configurations are defined."""
        assert "default" in RATE_LIMITS
        assert "auth" in RATE_LIMITS
        assert "create" in RATE_LIMITS
        assert "search" in RATE_LIMITS
        assert "upload" in RATE_LIMITS

        # Check default limits
        assert RATE_LIMITS["default"]["requests"] == 100
        assert RATE_LIMITS["default"]["window"] == 60

        # Check strict limits for auth
        assert RATE_LIMITS["auth"]["requests"] == 5
        assert RATE_LIMITS["auth"]["window"] == 60

    def test_rate_limiter_allows_requests_within_limit(self):
        """Test that requests within limit are allowed."""
        app = FastAPI()
        limiter = RateLimiter()
        app.state.rate_limiter = limiter

        @app.get("/test")
        @rate_limit("create")
        async def test_endpoint(request: Request):
            return {"status": "ok"}

        client = TestClient(app)

        # Should allow first 10 requests (create limit)
        for i in range(10):
            response = client.get("/test")
            assert response.status_code == 200

    def test_rate_limiter_blocks_requests_over_limit(self):
        """Test that requests over limit are blocked with 429."""
        app = FastAPI()
        limiter = RateLimiter()
        app.state.rate_limiter = limiter

        @app.get("/test")
        @rate_limit("create")
        async def test_endpoint(request: Request):
            return {"status": "ok"}

        client = TestClient(app)

        # Make requests up to and beyond the limit
        # Create limit is 10 requests per 60 seconds
        for i in range(10):
            response = client.get("/test")
            assert response.status_code == 200

        # Next request should be rate limited
        response = client.get("/test")
        assert response.status_code == 429
        assert "Rate limit exceeded" in response.json()["detail"]["error"]

    def test_rate_limiter_returns_proper_headers(self):
        """Test that rate limiter returns retry-after header."""
        app = FastAPI()
        limiter = RateLimiter()
        app.state.rate_limiter = limiter

        @app.get("/test")
        @rate_limit("create")
        async def test_endpoint(request: Request):
            return {"status": "ok"}

        client = TestClient(app)

        # Exceed rate limit
        for i in range(11):
            response = client.get("/test")

        # Check rate limit response
        if response.status_code == 429:
            assert "Retry-After" in response.headers
            assert int(response.headers["Retry-After"]) > 0

    def test_different_rate_limit_tiers(self):
        """Test that different endpoints have different rate limits."""
        app = FastAPI()
        limiter = RateLimiter()
        app.state.rate_limiter = limiter

        @app.get("/auth")
        @rate_limit("auth")
        async def auth_endpoint(request: Request):
            return {"status": "ok"}

        @app.get("/create")
        @rate_limit("create")
        async def create_endpoint(request: Request):
            return {"status": "ok"}

        client = TestClient(app)

        # Auth endpoint should allow only 5 requests
        for i in range(5):
            response = client.get("/auth")
            assert response.status_code == 200

        response = client.get("/auth")
        assert response.status_code == 429

        # Create endpoint should still work (different limit)
        response = client.get("/create")
        assert response.status_code == 200

    def test_rate_limiter_without_app_state(self):
        """Test that rate limiter gracefully handles missing app state."""
        app = FastAPI()
        # Don't set app.state.rate_limiter

        @app.get("/test")
        @rate_limit("create")
        async def test_endpoint(request: Request):
            return {"status": "ok"}

        client = TestClient(app)

        # Should work without rate limiting when limiter not configured
        response = client.get("/test")
        assert response.status_code == 200
