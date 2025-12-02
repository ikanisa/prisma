"""
Agent Monitoring Module
Handles execution tracking and metrics recording
"""
import time
import structlog
from typing import Optional, Dict, Any
from contextlib import contextmanager
from server.agents.metrics import (
    AGENT_EXECUTIONS_TOTAL,
    AGENT_EXECUTION_DURATION_SECONDS,
    AGENT_TOKENS_TOTAL,
    AGENT_COST_USD_TOTAL,
    AGENT_TOOL_CALLS_TOTAL,
    AGENT_ERRORS_TOTAL,
    AGENT_ACTIVE_EXECUTIONS
)

logger = structlog.get_logger()

class AgentMonitor:
    """Monitor for tracking agent performance and usage"""

    def __init__(self):
        pass

    @contextmanager
    def track_execution(self, agent_id: str, domain: str = "general"):
        """Context manager to track execution time and status"""
        start_time = time.time()
        AGENT_ACTIVE_EXECUTIONS.labels(domain=domain).inc()

        try:
            yield
            status = "success"
        except Exception as e:
            status = "error"
            self.record_error(agent_id, type(e).__name__)
            raise
        finally:
            duration = time.time() - start_time
            AGENT_ACTIVE_EXECUTIONS.labels(domain=domain).dec()

            AGENT_EXECUTIONS_TOTAL.labels(
                agent_id=agent_id,
                domain=domain,
                status=status
            ).inc()

            AGENT_EXECUTION_DURATION_SECONDS.labels(
                agent_id=agent_id,
                domain=domain
            ).observe(duration)

            logger.info(
                "agent_execution_finished",
                agent_id=agent_id,
                duration=duration,
                status=status
            )

    def record_token_usage(
        self,
        agent_id: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cost_usd: Optional[float] = None
    ):
        """Record token usage and cost"""
        AGENT_TOKENS_TOTAL.labels(
            agent_id=agent_id,
            model=model,
            type="input"
        ).inc(input_tokens)

        AGENT_TOKENS_TOTAL.labels(
            agent_id=agent_id,
            model=model,
            type="output"
        ).inc(output_tokens)

        if cost_usd:
            AGENT_COST_USD_TOTAL.labels(
                agent_id=agent_id,
                model=model
            ).inc(cost_usd)

    def record_tool_call(
        self,
        agent_id: str,
        tool_name: str,
        status: str = "success"
    ):
        """Record tool execution"""
        AGENT_TOOL_CALLS_TOTAL.labels(
            agent_id=agent_id,
            tool_name=tool_name,
            status=status
        ).inc()

    def record_error(self, agent_id: str, error_type: str):
        """Record error occurrence"""
        AGENT_ERRORS_TOTAL.labels(
            agent_id=agent_id,
            error_type=error_type
        ).inc()

# Global monitor instance
monitor = AgentMonitor()
