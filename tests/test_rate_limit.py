"""Tests for simple rate limiting logic."""

from typing import List


class RateLimiter:
    def __init__(self, limit: int):
        self.limit = limit
        self.calls: List[float] = []

    def allow(self, timestamp: float) -> bool:
        self.calls = [t for t in self.calls if t > timestamp - 1]
        if len(self.calls) < self.limit:
            self.calls.append(timestamp)
            return True
        return False


def test_rate_limiting():
    rl = RateLimiter(limit=2)
    assert rl.allow(0)
    assert rl.allow(0.5)
    assert not rl.allow(0.75)
    assert rl.allow(1.5)
