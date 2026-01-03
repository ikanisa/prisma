"""
Rate Limiter Module
Token bucket implementation for rate limiting
"""
import time
from typing import Dict, Optional
import structlog

logger = structlog.get_logger()

class RateLimitExceeded(Exception):
    """Raised when rate limit is exceeded"""
    pass

class TokenBucket:
    """Token bucket algorithm for rate limiting"""

    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.last_update = time.time()

    def consume(self, tokens: int = 1) -> bool:
        """Consume tokens from bucket"""
        now = time.time()
        elapsed = now - self.last_update

        # Refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_update = now

        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False

class RateLimiter:
    """Global rate limiter for agents"""

    def __init__(self):
        # org_id -> bucket
        self.buckets: Dict[str, TokenBucket] = {}

        # Default limits (requests per minute)
        self.default_limit = 60

    def get_bucket(self, key: str) -> TokenBucket:
        if key not in self.buckets:
            # Convert RPM to tokens/sec
            rate = self.default_limit / 60.0
            self.buckets[key] = TokenBucket(capacity=self.default_limit, refill_rate=rate)
        return self.buckets[key]

    def check_limit(self, key: str, cost: int = 1):
        """Check if request is within limits"""
        bucket = self.get_bucket(key)
        if not bucket.consume(cost):
            logger.warning("rate_limit_exceeded", key=key)
            raise RateLimitExceeded(f"Rate limit exceeded for {key}")

# Global instance
rate_limiter = RateLimiter()
