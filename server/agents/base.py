"""
Multi-provider Agent Abstraction Layer
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, AsyncGenerator
from enum import Enum
from dataclasses import dataclass


class AgentProvider(Enum):
    """Supported AI agent providers"""
    OPENAI = "openai"
    GEMINI = "gemini"
    ANTHROPIC = "anthropic"


@dataclass
class AgentToolDefinition:
    """Definition of a tool that an agent can use"""
    name: str
    description: str
    parameters: Dict[str, Any]
    handler: Optional[callable] = None


@dataclass
class AgentResponse:
    """Unified response from any agent provider"""
    content: str
    tool_calls: List[Dict[str, Any]]
    usage: Dict[str, int]
    provider: AgentProvider
    metadata: Dict[str, Any]


class BaseAgentProvider(ABC):
    """Abstract base class for all agent providers"""

    @abstractmethod
    async def create_agent(
        self,
        name: str,
        instructions: str,
        tools: List[AgentToolDefinition],
        model: str
    ) -> str:
        """Create an agent and return its ID"""
        pass

    @abstractmethod
    async def run_agent(
        self,
        agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Execute an agent with input"""
        pass

    @abstractmethod
    async def stream_agent(
        self,
        agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[AgentResponse, None]:
        """Stream agent responses"""
        pass


class AgentOrchestrator:
    """Unified orchestrator for multi-provider agents"""

    def __init__(self):
        self.providers: Dict[AgentProvider, BaseAgentProvider] = {}
        self.default_provider = AgentProvider.OPENAI

    def register_provider(self, provider: AgentProvider, impl: BaseAgentProvider):
        """Register a provider implementation"""
        self.providers[provider] = impl

    async def execute(
        self,
        agent_id: str,
        input_text: str,
        provider: Optional[AgentProvider] = None,
        fallback_providers: Optional[List[AgentProvider]] = None
    ) -> AgentResponse:
        """Execute with automatic fallback"""
        provider = provider or self.default_provider

        try:
            return await self.providers[provider].run_agent(agent_id, input_text)
        except Exception as e:
            if fallback_providers:
                for fallback in fallback_providers:
                    try:
                        return await self.providers[fallback].run_agent(agent_id, input_text)
                    except:
                        continue
            raise e

    async def stream(
        self,
        agent_id: str,
        input_text: str,
        provider: Optional[AgentProvider] = None
    ) -> AsyncGenerator[AgentResponse, None]:
        """Stream agent responses"""
        provider = provider or self.default_provider

        async for response in self.providers[provider].stream_agent(agent_id, input_text):
            yield response
