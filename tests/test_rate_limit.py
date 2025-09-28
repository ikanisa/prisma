"""Tests for simple rate limiting logic."""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from server.rate_limit import RateLimiter


def test_rate_limiting():
    rl = RateLimiter(limit=2, window=1)
    assert rl.allow(0)
    assert rl.allow(0.5)
    assert not rl.allow(0.75)
    assert rl.allow(1.5)
