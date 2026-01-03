"""
Cost Tracker Module
Tracks and estimates costs for AI model usage
"""
from typing import Dict, Optional
from decimal import Decimal

# Cost per 1k tokens (approximate)
MODEL_COSTS = {
    "gpt-4o": {"input": 0.005, "output": 0.015},
    "gpt-4-turbo": {"input": 0.01, "output": 0.03},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
    "gemini-1.5-pro": {"input": 0.0035, "output": 0.0105},
    "gemini-1.5-flash": {"input": 0.00035, "output": 0.00105},
}

class CostTracker:
    """Calculates and tracks costs"""

    @staticmethod
    def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate cost in USD"""
        if model not in MODEL_COSTS:
            # Fallback to GPT-4o pricing if unknown
            pricing = MODEL_COSTS["gpt-4o"]
        else:
            pricing = MODEL_COSTS[model]

        input_cost = (input_tokens / 1000) * pricing["input"]
        output_cost = (output_tokens / 1000) * pricing["output"]

        return round(input_cost + output_cost, 6)

cost_tracker = CostTracker()
