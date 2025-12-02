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
)

__all__ = [
    # Base classes
    "AgentProvider",
    "AgentToolDefinition",
    "AgentResponse",
    "BaseAgentProvider",
    "AgentOrchestrator",
    # Registry
    "AgentRegistry",
    "AgentMetadata",
    "AgentDomain",
    "AgentCapability",
    "get_registry",
]
