"""
Unified Agent Orchestrator

Manages both OpenAI Agents SDK and Gemini ADK providers with:
- Provider fallback support
- A/B testing between providers
- Request routing
- Execution metrics logging
"""
import os
import time
import uuid
import logging
import random
from typing import Any, Dict, List, Optional, AsyncGenerator
from dataclasses import dataclass, field
from enum import Enum

from .base import (
    AgentProvider,
    BaseAgentProvider,
    AgentToolDefinition,
    AgentHandoff,
    Guardrail,
    AgentResponse,
    AgentTrace,
    StreamingAgentEvent,
    StreamingEventType,
)
from .openai_agents_sdk import OpenAIAgentsSDKProvider
from .gemini_adk import GeminiADKProvider

logger = logging.getLogger(__name__)


class ABTestVariant(Enum):
    """A/B test variant assignment"""
    CONTROL = "control"
    TREATMENT = "treatment"


@dataclass
class ExecutionMetrics:
    """Metrics for a single execution"""
    execution_id: str
    agent_id: str
    provider: AgentProvider
    start_time: float
    end_time: Optional[float] = None
    latency_ms: Optional[float] = None
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    success: bool = True
    error_message: Optional[str] = None
    ab_variant: Optional[ABTestVariant] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ABTestConfig:
    """Configuration for A/B testing between providers"""
    name: str
    control_provider: AgentProvider
    treatment_provider: AgentProvider
    treatment_percentage: float = 50.0  # 0-100
    is_active: bool = True
    metrics: List[str] = field(default_factory=lambda: ["latency", "tokens", "success_rate"])


class UnifiedAgentOrchestrator:
    """
    Unified orchestrator for multi-provider agent execution.
    
    Features:
    - Provider management and registration
    - Automatic fallback on failures
    - A/B testing between providers
    - Intelligent routing
    - Metrics collection and logging
    """

    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        google_api_key: Optional[str] = None,
        default_provider: AgentProvider = AgentProvider.OPENAI_AGENTS_SDK
    ):
        self.providers: Dict[AgentProvider, BaseAgentProvider] = {}
        self.default_provider = default_provider
        self.metrics: List[ExecutionMetrics] = []
        self.ab_tests: Dict[str, ABTestConfig] = {}
        self.agent_provider_mapping: Dict[str, AgentProvider] = {}
        
        # Initialize providers
        self._init_providers(openai_api_key, google_api_key)

    def _init_providers(
        self,
        openai_api_key: Optional[str] = None,
        google_api_key: Optional[str] = None
    ):
        """Initialize available providers"""
        # Initialize OpenAI Agents SDK provider
        try:
            openai_key = openai_api_key or os.getenv("OPENAI_API_KEY")
            if openai_key:
                self.providers[AgentProvider.OPENAI_AGENTS_SDK] = OpenAIAgentsSDKProvider(
                    api_key=openai_key
                )
                logger.info("OpenAI Agents SDK provider initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI Agents SDK provider: {e}")
        
        # Initialize Gemini ADK provider
        try:
            google_key = google_api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
            if google_key:
                self.providers[AgentProvider.GEMINI_ADK] = GeminiADKProvider(
                    api_key=google_key
                )
                logger.info("Gemini ADK provider initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini ADK provider: {e}")

    def register_provider(
        self,
        provider_type: AgentProvider,
        provider: BaseAgentProvider
    ):
        """Register a custom provider implementation"""
        self.providers[provider_type] = provider
        logger.info(f"Registered provider: {provider_type.value}")

    def get_provider(self, provider_type: AgentProvider) -> Optional[BaseAgentProvider]:
        """Get a registered provider"""
        return self.providers.get(provider_type)

    def _select_provider_for_ab_test(
        self,
        test_name: str
    ) -> tuple[AgentProvider, ABTestVariant]:
        """Select provider based on A/B test configuration"""
        test = self.ab_tests.get(test_name)
        if not test or not test.is_active:
            return self.default_provider, ABTestVariant.CONTROL
        
        if random.random() * 100 < test.treatment_percentage:
            return test.treatment_provider, ABTestVariant.TREATMENT
        return test.control_provider, ABTestVariant.CONTROL

    def configure_ab_test(
        self,
        name: str,
        control_provider: AgentProvider,
        treatment_provider: AgentProvider,
        treatment_percentage: float = 50.0
    ):
        """Configure an A/B test between two providers"""
        self.ab_tests[name] = ABTestConfig(
            name=name,
            control_provider=control_provider,
            treatment_provider=treatment_provider,
            treatment_percentage=treatment_percentage
        )
        logger.info(f"Configured A/B test '{name}': {control_provider.value} vs {treatment_provider.value}")

    def disable_ab_test(self, name: str):
        """Disable an A/B test"""
        if name in self.ab_tests:
            self.ab_tests[name].is_active = False
            logger.info(f"Disabled A/B test: {name}")

    def _log_metrics(self, metrics: ExecutionMetrics):
        """Log execution metrics"""
        self.metrics.append(metrics)
        
        # Keep only last 10000 metrics in memory
        if len(self.metrics) > 10000:
            self.metrics = self.metrics[-10000:]
        
        logger.debug(
            f"Execution {metrics.execution_id}: provider={metrics.provider.value}, "
            f"latency={metrics.latency_ms}ms, tokens={metrics.total_tokens}, "
            f"success={metrics.success}"
        )

    async def create_agent(
        self,
        name: str,
        instructions: str,
        tools: List[AgentToolDefinition],
        model: str,
        provider: Optional[AgentProvider] = None,
        handoffs: Optional[List[AgentHandoff]] = None,
        guardrails: Optional[List[Guardrail]] = None
    ) -> str:
        """
        Create an agent with the specified provider.
        
        Returns the agent ID and stores the provider mapping.
        """
        target_provider = provider or self.default_provider
        
        if target_provider not in self.providers:
            raise ValueError(f"Provider {target_provider.value} not registered")
        
        agent_id = await self.providers[target_provider].create_agent(
            name=name,
            instructions=instructions,
            tools=tools,
            model=model,
            handoffs=handoffs,
            guardrails=guardrails
        )
        
        self.agent_provider_mapping[agent_id] = target_provider
        logger.info(f"Created agent {agent_id} with provider {target_provider.value}")
        
        return agent_id

    async def execute(
        self,
        agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None,
        provider: Optional[AgentProvider] = None,
        fallback_providers: Optional[List[AgentProvider]] = None,
        ab_test_name: Optional[str] = None
    ) -> AgentResponse:
        """
        Execute an agent with automatic fallback support.
        
        Args:
            agent_id: ID of the agent to execute
            input_text: Input query/prompt
            context: Optional context dict
            provider: Override provider (otherwise uses stored mapping)
            fallback_providers: List of fallback providers to try on failure
            ab_test_name: Name of A/B test to use for provider selection
        """
        execution_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Determine provider
        ab_variant = None
        if ab_test_name:
            target_provider, ab_variant = self._select_provider_for_ab_test(ab_test_name)
        elif provider:
            target_provider = provider
        else:
            target_provider = self.agent_provider_mapping.get(agent_id, self.default_provider)
        
        providers_to_try = [target_provider]
        if fallback_providers:
            providers_to_try.extend(fallback_providers)
        
        last_error = None
        
        for current_provider in providers_to_try:
            if current_provider not in self.providers:
                continue
            
            try:
                result = await self.providers[current_provider].run_agent(
                    agent_id, input_text, context
                )
                
                # Log success metrics
                end_time = time.time()
                self._log_metrics(ExecutionMetrics(
                    execution_id=execution_id,
                    agent_id=agent_id,
                    provider=current_provider,
                    start_time=start_time,
                    end_time=end_time,
                    latency_ms=(end_time - start_time) * 1000,
                    input_tokens=result.usage.get("input_tokens", 0),
                    output_tokens=result.usage.get("output_tokens", 0),
                    total_tokens=result.usage.get("total_tokens", 0),
                    success=True,
                    ab_variant=ab_variant,
                    metadata={"fallback": current_provider != target_provider}
                ))
                
                return result
                
            except Exception as e:
                last_error = e
                logger.warning(
                    f"Provider {current_provider.value} failed for agent {agent_id}: {e}"
                )
                
                # Log failure metrics
                self._log_metrics(ExecutionMetrics(
                    execution_id=execution_id,
                    agent_id=agent_id,
                    provider=current_provider,
                    start_time=start_time,
                    end_time=time.time(),
                    success=False,
                    error_message=str(e),
                    ab_variant=ab_variant
                ))
        
        raise last_error or Exception("All providers failed")

    async def stream(
        self,
        agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None,
        provider: Optional[AgentProvider] = None
    ) -> AsyncGenerator[StreamingAgentEvent, None]:
        """Stream agent responses"""
        target_provider = provider or self.agent_provider_mapping.get(
            agent_id, self.default_provider
        )
        
        if target_provider not in self.providers:
            yield StreamingAgentEvent(
                type=StreamingEventType.ERROR,
                content=f"Provider {target_provider.value} not registered"
            )
            return
        
        execution_id = str(uuid.uuid4())
        start_time = time.time()
        total_content = ""
        
        try:
            async for event in self.providers[target_provider].stream_agent(
                agent_id, input_text, context
            ):
                if event.type == StreamingEventType.TEXT:
                    total_content += event.content
                yield event
            
            # Log streaming metrics
            self._log_metrics(ExecutionMetrics(
                execution_id=execution_id,
                agent_id=agent_id,
                provider=target_provider,
                start_time=start_time,
                end_time=time.time(),
                latency_ms=(time.time() - start_time) * 1000,
                success=True,
                metadata={"streaming": True, "content_length": len(total_content)}
            ))
            
        except Exception as e:
            self._log_metrics(ExecutionMetrics(
                execution_id=execution_id,
                agent_id=agent_id,
                provider=target_provider,
                start_time=start_time,
                end_time=time.time(),
                success=False,
                error_message=str(e),
                metadata={"streaming": True}
            ))
            yield StreamingAgentEvent(
                type=StreamingEventType.ERROR,
                content=str(e)
            )

    async def handoff(
        self,
        agent_id: str,
        target_agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None,
        provider: Optional[AgentProvider] = None
    ) -> AgentResponse:
        """Execute multi-agent handoff"""
        target_provider = provider or self.agent_provider_mapping.get(
            agent_id, self.default_provider
        )
        
        if target_provider not in self.providers:
            raise ValueError(f"Provider {target_provider.value} not registered")
        
        execution_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            result = await self.providers[target_provider].execute_handoff(
                agent_id, target_agent_id, input_text, context
            )
            
            self._log_metrics(ExecutionMetrics(
                execution_id=execution_id,
                agent_id=agent_id,
                provider=target_provider,
                start_time=start_time,
                end_time=time.time(),
                latency_ms=(time.time() - start_time) * 1000,
                success=True,
                metadata={"handoff": True, "target_agent": target_agent_id}
            ))
            
            return result
            
        except Exception as e:
            self._log_metrics(ExecutionMetrics(
                execution_id=execution_id,
                agent_id=agent_id,
                provider=target_provider,
                start_time=start_time,
                end_time=time.time(),
                success=False,
                error_message=str(e),
                metadata={"handoff": True, "target_agent": target_agent_id}
            ))
            raise

    async def get_traces(
        self,
        agent_id: str,
        provider: Optional[AgentProvider] = None,
        limit: int = 100
    ) -> List[AgentTrace]:
        """Get execution traces for an agent"""
        target_provider = provider or self.agent_provider_mapping.get(
            agent_id, self.default_provider
        )
        
        if target_provider not in self.providers:
            return []
        
        return await self.providers[target_provider].get_traces(agent_id, limit)

    def get_metrics_summary(
        self,
        agent_id: Optional[str] = None,
        provider: Optional[AgentProvider] = None,
        last_n: int = 100
    ) -> Dict[str, Any]:
        """Get summary of execution metrics"""
        filtered_metrics = self.metrics[-last_n:]
        
        if agent_id:
            filtered_metrics = [m for m in filtered_metrics if m.agent_id == agent_id]
        if provider:
            filtered_metrics = [m for m in filtered_metrics if m.provider == provider]
        
        if not filtered_metrics:
            return {
                "count": 0,
                "success_rate": 0,
                "avg_latency_ms": 0,
                "total_tokens": 0
            }
        
        successful = [m for m in filtered_metrics if m.success]
        latencies = [m.latency_ms for m in successful if m.latency_ms]
        
        return {
            "count": len(filtered_metrics),
            "success_rate": len(successful) / len(filtered_metrics) * 100,
            "avg_latency_ms": sum(latencies) / len(latencies) if latencies else 0,
            "total_tokens": sum(m.total_tokens for m in filtered_metrics),
            "by_provider": {
                p.value: len([m for m in filtered_metrics if m.provider == p])
                for p in set(m.provider for m in filtered_metrics)
            }
        }

    def get_ab_test_results(self, test_name: str) -> Dict[str, Any]:
        """Get A/B test results for a specific test"""
        test = self.ab_tests.get(test_name)
        if not test:
            return {"error": f"Test '{test_name}' not found"}
        
        control_metrics = [
            m for m in self.metrics
            if m.ab_variant == ABTestVariant.CONTROL
        ]
        treatment_metrics = [
            m for m in self.metrics
            if m.ab_variant == ABTestVariant.TREATMENT
        ]
        
        def calc_stats(metrics: List[ExecutionMetrics]) -> Dict[str, Any]:
            if not metrics:
                return {"count": 0}
            successful = [m for m in metrics if m.success]
            latencies = [m.latency_ms for m in successful if m.latency_ms]
            return {
                "count": len(metrics),
                "success_rate": len(successful) / len(metrics) * 100 if metrics else 0,
                "avg_latency_ms": sum(latencies) / len(latencies) if latencies else 0,
                "total_tokens": sum(m.total_tokens for m in metrics)
            }
        
        return {
            "test_name": test_name,
            "is_active": test.is_active,
            "control": {
                "provider": test.control_provider.value,
                "stats": calc_stats(control_metrics)
            },
            "treatment": {
                "provider": test.treatment_provider.value,
                "percentage": test.treatment_percentage,
                "stats": calc_stats(treatment_metrics)
            }
        }


# Global orchestrator instance
_orchestrator: Optional[UnifiedAgentOrchestrator] = None


def get_orchestrator() -> UnifiedAgentOrchestrator:
    """Get the global orchestrator instance"""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = UnifiedAgentOrchestrator()
    return _orchestrator


def init_orchestrator(
    openai_api_key: Optional[str] = None,
    google_api_key: Optional[str] = None,
    default_provider: AgentProvider = AgentProvider.OPENAI_AGENTS_SDK
) -> UnifiedAgentOrchestrator:
    """Initialize and return the global orchestrator"""
    global _orchestrator
    _orchestrator = UnifiedAgentOrchestrator(
        openai_api_key=openai_api_key,
        google_api_key=google_api_key,
        default_provider=default_provider
    )
    return _orchestrator
