"""
Multi-provider Agent Abstraction Layer

Supports multiple AI agent providers including:
- OpenAI (standard SDK)
- OpenAI Agents SDK (official agents package)
- Google Gemini (generativeai)
- Google Gemini ADK (Agent Development Kit)
- Anthropic
"""
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional, AsyncGenerator, Union
from enum import Enum
from dataclasses import dataclass, field


class AgentProvider(Enum):
    """Supported AI agent providers"""
    OPENAI = "openai"
    OPENAI_AGENTS_SDK = "openai-agents"
    GEMINI = "gemini"
    GEMINI_ADK = "gemini-adk"
    ANTHROPIC = "anthropic"


class StreamingEventType(Enum):
    """Types of events in streaming agent responses"""
    TEXT = "text"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    HANDOFF = "handoff"
    GUARDRAIL = "guardrail"
    ERROR = "error"
    DONE = "done"


@dataclass
class AgentToolDefinition:
    """Definition of a tool that an agent can use"""
    name: str
    description: str
    parameters: Dict[str, Any]
    handler: Optional[Callable] = None


@dataclass
class AgentHandoff:
    """Definition of an agent handoff for multi-agent workflows"""
    target_agent_id: str
    name: str
    description: str
    condition: Optional[str] = None


@dataclass
class Guardrail:
    """Definition of a guardrail for agent safety"""
    name: str
    description: str
    type: str  # 'input', 'output', 'tool_call'
    handler: Optional[Callable] = None
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentTrace:
    """Trace record for agent execution observability"""
    trace_id: str
    span_id: str
    parent_span_id: Optional[str]
    operation: str
    start_time: float
    end_time: Optional[float]
    status: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    events: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class StreamingAgentEvent:
    """A single event in a streaming agent response"""
    type: StreamingEventType
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    tool_call_id: Optional[str] = None
    tool_name: Optional[str] = None
    tool_arguments: Optional[Dict[str, Any]] = None
    handoff_agent_id: Optional[str] = None


@dataclass
class AgentResponse:
    """Unified response from any agent provider"""
    content: str
    tool_calls: List[Dict[str, Any]]
    usage: Dict[str, int]
    provider: AgentProvider
    metadata: Dict[str, Any]
    trace: Optional[AgentTrace] = None
    handoff_result: Optional[Dict[str, Any]] = None


class BaseAgentProvider(ABC):
    """Abstract base class for all agent providers"""

    @abstractmethod
    async def create_agent(
        self,
        name: str,
        instructions: str,
        tools: List[AgentToolDefinition],
        model: str,
        handoffs: Optional[List[AgentHandoff]] = None,
        guardrails: Optional[List[Guardrail]] = None
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
    ) -> AsyncGenerator[StreamingAgentEvent, None]:
        """Stream agent responses as events"""
        pass

    async def execute_handoff(
        self,
        agent_id: str,
        target_agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Execute handoff from one agent to another"""
        raise NotImplementedError("Handoff not supported by this provider")

    async def get_traces(
        self,
        agent_id: str,
        limit: int = 100
    ) -> List[AgentTrace]:
        """Get execution traces for an agent"""
        raise NotImplementedError("Tracing not supported by this provider")


class AgentOrchestrator:
    """Unified orchestrator for multi-provider agents"""

    def __init__(self):
        self.providers: Dict[AgentProvider, BaseAgentProvider] = {}
        self.default_provider = AgentProvider.OPENAI_AGENTS_SDK

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
                    except Exception:
                        continue
            raise e

    async def stream(
        self,
        agent_id: str,
        input_text: str,
        provider: Optional[AgentProvider] = None
    ) -> AsyncGenerator[StreamingAgentEvent, None]:
        """Stream agent responses"""
        provider = provider or self.default_provider

        async for event in self.providers[provider].stream_agent(agent_id, input_text):
            yield event

    async def handoff(
        self,
        agent_id: str,
        target_agent_id: str,
        input_text: str,
        provider: Optional[AgentProvider] = None
    ) -> AgentResponse:
        """Execute multi-agent handoff"""
        provider = provider or self.default_provider
        return await self.providers[provider].execute_handoff(
            agent_id, target_agent_id, input_text
        )

    async def get_agent_traces(
        self,
        agent_id: str,
        provider: Optional[AgentProvider] = None,
        limit: int = 100
    ) -> List[AgentTrace]:
        """Get traces for an agent"""
        provider = provider or self.default_provider
        return await self.providers[provider].get_traces(agent_id, limit)
