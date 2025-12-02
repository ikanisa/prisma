"""
Resilience Module
Circuit Breaker and Retry implementations
"""
import time
import asyncio
from typing import Callable, Any, Optional, Type
from functools import wraps
import structlog

logger = structlog.get_logger()

class CircuitBreakerOpen(Exception):
    """Raised when circuit breaker is open"""
    pass

class CircuitBreaker:
    """
    Circuit Breaker pattern implementation.
    States: CLOSED (Normal) -> OPEN (Failing) -> HALF_OPEN (Testing)
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exceptions: tuple = (Exception,)
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exceptions = expected_exceptions

        self.failures = 0
        self.last_failure_time = 0
        self.state = "CLOSED"

    def _check_state(self):
        """Check and update state based on time"""
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
                logger.info("circuit_breaker_half_open")

    def __call__(self, func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            self._check_state()

            if self.state == "OPEN":
                raise CircuitBreakerOpen(f"Circuit breaker is OPEN. Retrying in {int(self.recovery_timeout - (time.time() - self.last_failure_time))}s")

            try:
                result = await func(*args, **kwargs)

                if self.state == "HALF_OPEN":
                    self.state = "CLOSED"
                    self.failures = 0
                    logger.info("circuit_breaker_closed")

                return result

            except self.expected_exceptions as e:
                self.failures += 1
                self.last_failure_time = time.time()

                if self.failures >= self.failure_threshold:
                    self.state = "OPEN"
                    logger.warning("circuit_breaker_opened", failures=self.failures)

                raise e

        return wrapper

def with_retry(
    max_retries: int = 3,
    backoff_factor: float = 1.5,
    exceptions: tuple = (Exception,)
):
    """Retry decorator with exponential backoff"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            delay = 1.0

            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt == max_retries:
                        break

                    logger.warning(
                        "retry_attempt",
                        attempt=attempt + 1,
                        error=str(e),
                        next_retry_in=delay
                    )

                    await asyncio.sleep(delay)
                    delay *= backoff_factor

            raise last_exception
        return wrapper
    return decorator
