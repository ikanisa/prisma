from typing import List
import time

class RateLimiter:
    """Simple fixed-window rate limiter."""

    def __init__(self, limit: int, window: float = 60.0):
        self.limit = limit
        self.window = window
        self.calls: List[float] = []

    def allow(self, timestamp: float | None = None) -> bool:
        now = timestamp or time.time()
        self.calls = [t for t in self.calls if t > now - self.window]
        if len(self.calls) < self.limit:
            self.calls.append(now)
            return True
        return False
