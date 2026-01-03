"""
Agent Metrics Module
Prometheus metrics for agent execution and performance
"""
from prometheus_client import Counter, Histogram, Gauge

# Execution Metrics
AGENT_EXECUTIONS_TOTAL = Counter(
    "agent_executions_total",
    "Total number of agent executions",
    ["agent_id", "domain", "status"]
)

AGENT_EXECUTION_DURATION_SECONDS = Histogram(
    "agent_execution_duration_seconds",
    "Time spent executing agent requests",
    ["agent_id", "domain"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0]
)

# Token Usage Metrics
AGENT_TOKENS_TOTAL = Counter(
    "agent_tokens_total",
    "Total tokens consumed by agents",
    ["agent_id", "model", "type"]  # type: input, output
)

AGENT_COST_USD_TOTAL = Counter(
    "agent_cost_usd_total",
    "Total estimated cost in USD",
    ["agent_id", "model"]
)

# Tool Usage Metrics
AGENT_TOOL_CALLS_TOTAL = Counter(
    "agent_tool_calls_total",
    "Total number of tool calls",
    ["agent_id", "tool_name", "status"]
)

# Error Metrics
AGENT_ERRORS_TOTAL = Counter(
    "agent_errors_total",
    "Total number of agent errors",
    ["agent_id", "error_type"]
)

# Active Executions
AGENT_ACTIVE_EXECUTIONS = Gauge(
    "agent_active_executions",
    "Number of currently running agent executions",
    ["domain"]
)
