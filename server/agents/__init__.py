"""
Multi-provider AI Agent System

This package provides a unified abstraction layer for working with multiple
AI agent providers (OpenAI, Gemini, Anthropic) through a common interface.
"""

from .base import (
    AgentProvider,
    AgentToolDefinition,
    AgentResponse,
    BaseAgentProvider,
    AgentOrchestrator,
)
from .registry import (
    AgentRegistry,
    AgentMetadata,
    AgentDomain,
    AgentCapability,
    get_registry,
    get_agent_registry,
    list_all_agents,
    discover_agents,
)

__all__ = [
    # Base classes
    "AgentProvider",
    "AgentToolDefinition",
    "AgentResponse",
    "BaseAgentProvider",
    "AgentOrchestrator",
    "AgentRegistry",
    "AgentMetadata",
    "AgentDomain",
    "AgentCapability",
    "get_registry",
    # Registry
    "AgentRegistry",
    "AgentMetadata",
    "AgentDomain",
    "get_agent_registry",
    "list_all_agents",
    "discover_agents",
]
