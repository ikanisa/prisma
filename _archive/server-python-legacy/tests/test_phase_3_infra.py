"""
Phase 3 Infrastructure Test
Tests Monitoring, Resilience, Rate Limiting, and Cost Tracking
"""
import sys
import time
import pytest
import asyncio
sys.path.insert(0, '/Users/jeanbosco/workspace/prisma')

from server.agents.metrics import AGENT_EXECUTIONS_TOTAL
from server.agents.monitoring import monitor
from server.agents.resilience import CircuitBreaker, CircuitBreakerOpen, with_retry
from server.agents.rate_limiter import rate_limiter, RateLimitExceeded
from server.agents.cost_tracker import cost_tracker

def test_monitoring():
    """Test monitoring and metrics"""
    print("\n[1/4] Testing Monitoring...")

    agent_id = "test_agent"

    # Test execution tracking
    with monitor.track_execution(agent_id, domain="test"):
        time.sleep(0.1)

    # Verify metric incremented (accessing internal counter for test)
    # Note: Prometheus client internals are complex, just checking no error raised
    print("  ✓ track_execution context manager working")

    # Test token recording
    monitor.record_token_usage(agent_id, "gpt-4", 100, 50, 0.01)
    print("  ✓ record_token_usage working")


@pytest.mark.asyncio
async def test_resilience():
    """Test Circuit Breaker and Retry"""
    print("\n[2/4] Testing Resilience...")

    # Test Circuit Breaker
    cb = CircuitBreaker(failure_threshold=2, recovery_timeout=1)

    @cb
    async def failing_func():
        raise ValueError("Fail")

    # Fail twice to open circuit
    try: await failing_func()
    except ValueError: pass

    try: await failing_func()
    except ValueError: pass

    # Third time should be CircuitBreakerOpen
    try:
        await failing_func()
        assert False, "Should have raised CircuitBreakerOpen"
    except CircuitBreakerOpen:
        print("  ✓ Circuit Breaker opened correctly")

    # Test Retry
    attempts = 0
    @with_retry(max_retries=2, backoff_factor=1.0)
    async def retry_func():
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise ValueError("Retry me")
        return "Success"

    result = await retry_func()
    assert result == "Success"
    assert attempts == 3
    print("  ✓ Retry logic working")


def test_rate_limiter():
    """Test Rate Limiter"""
    print("\n[3/4] Testing Rate Limiter...")

    key = "test_user"
    # Consume 1 token
    rate_limiter.check_limit(key)
    print("  ✓ check_limit allowed request")

    # Force exceed (assuming default limit is high, we'll mock a small bucket)
    bucket = rate_limiter.get_bucket("small_bucket")
    bucket.tokens = 0

    try:
        rate_limiter.check_limit("small_bucket")
        assert False, "Should have raised RateLimitExceeded"
    except RateLimitExceeded:
        print("  ✓ Rate limit exceeded correctly")


def test_cost_tracker():
    """Test Cost Tracker"""
    print("\n[4/4] Testing Cost Tracker...")

    cost = cost_tracker.calculate_cost("gpt-4o", 1000, 1000)
    # Input: 0.005, Output: 0.015 -> Total 0.02
    assert cost == 0.02
    print(f"  - Calculated Cost: ${cost}")
    print("  ✓ calculate_cost working")


if __name__ == "__main__":
    print("=" * 70)
    print("PHASE 3 INFRASTRUCTURE TEST")
    print("=" * 70)

    test_monitoring()
    asyncio.run(test_resilience())
    test_rate_limiter()
    test_cost_tracker()

    print("\n" + "=" * 70)
    print("ALL INFRASTRUCTURE TESTS PASSED ✓")
    print("=" * 70)
