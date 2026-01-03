"""
OpenAI Service for Agent Execution

Provides a comprehensive wrapper around OpenAI API for executing AI agents
with features like streaming, rate limiting, error handling, and cost tracking.
"""

import os
import time
import asyncio
from typing import Dict, Any, Optional, AsyncGenerator, List
from dataclasses import dataclass
from enum import Enum
import structlog

from openai import AsyncOpenAI, OpenAIError, RateLimitError, APITimeoutError
from openai.types.chat import ChatCompletion, ChatCompletionChunk

logger = structlog.get_logger(__name__)


class ModelType(str, Enum):
    """Supported OpenAI models"""
    GPT_4 = "gpt-4"
    GPT_4_TURBO = "gpt-4-turbo-preview"
    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"
    GPT_35_TURBO = "gpt-3.5-turbo"


@dataclass
class AgentExecutionConfig:
    """Configuration for agent execution"""
    model: str = ModelType.GPT_4O.value
    temperature: float = 0.7
    max_tokens: int = 2000
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    stream: bool = False
    timeout: int = 60


@dataclass
class ExecutionResult:
    """Result of agent execution"""
    answer: str
    model: str
    tokens_used: int
    cost_usd: float
    duration_ms: int
    finish_reason: str
    sources: Optional[List[str]] = None
    confidence: Optional[float] = None
    warnings: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None


class OpenAIService:
    """
    Service for executing AI agents using OpenAI API.
    
    Features:
    - Async execution
    - Streaming responses
    - Automatic retries with exponential backoff
    - Rate limiting
    - Cost tracking
    - Error handling
    """
    
    # Token pricing per 1K tokens (as of Nov 2024)
    TOKEN_PRICING = {
        ModelType.GPT_4.value: {"input": 0.03, "output": 0.06},
        ModelType.GPT_4_TURBO.value: {"input": 0.01, "output": 0.03},
        ModelType.GPT_4O.value: {"input": 0.005, "output": 0.015},
        ModelType.GPT_4O_MINI.value: {"input": 0.00015, "output": 0.0006},
        ModelType.GPT_35_TURBO.value: {"input": 0.0015, "output": 0.002},
    }
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        max_retries: int = 3,
        timeout: int = 60
    ):
        """
        Initialize OpenAI service.
        
        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
            max_retries: Maximum number of retries for failed requests
            timeout: Default timeout in seconds
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key not provided and OPENAI_API_KEY env var not set")
        
        self.client = AsyncOpenAI(api_key=self.api_key)
        self.max_retries = max_retries
        self.timeout = timeout
        
        logger.info("OpenAI service initialized", max_retries=max_retries, timeout=timeout)
    
    async def execute_agent(
        self,
        agent_slug: str,
        query: str,
        context: Optional[Dict[str, Any]] = None,
        config: Optional[AgentExecutionConfig] = None
    ) -> ExecutionResult:
        """
        Execute an AI agent with the given query.
        
        Args:
            agent_slug: Unique identifier of the agent
            query: User query/prompt
            context: Additional context data
            config: Execution configuration
            
        Returns:
            ExecutionResult with answer, tokens, cost, etc.
            
        Raises:
            OpenAIError: If execution fails after retries
        """
        config = config or AgentExecutionConfig()
        start_time = time.time()
        
        # Build system message based on agent
        system_message = self._get_agent_system_message(agent_slug)
        
        # Build user message with context
        user_message = self._build_user_message(query, context)
        
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]
        
        logger.info(
            "Executing agent",
            agent_slug=agent_slug,
            model=config.model,
            stream=config.stream
        )
        
        try:
            if config.stream:
                # Streaming not yet implemented in this method
                # Use execute_agent_streaming instead
                raise NotImplementedError("Use execute_agent_streaming for streaming responses")
            
            # Execute with retries
            response = await self._execute_with_retry(
                messages=messages,
                config=config
            )
            
            # Calculate metrics
            duration_ms = int((time.time() - start_time) * 1000)
            tokens_used = response.usage.total_tokens
            cost_usd = self._calculate_cost(
                model=config.model,
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens
            )
            
            # Extract answer
            answer = response.choices[0].message.content
            finish_reason = response.choices[0].finish_reason
            
            logger.info(
                "Agent execution completed",
                agent_slug=agent_slug,
                tokens=tokens_used,
                cost_usd=cost_usd,
                duration_ms=duration_ms
            )
            
            return ExecutionResult(
                answer=answer,
                model=config.model,
                tokens_used=tokens_used,
                cost_usd=cost_usd,
                duration_ms=duration_ms,
                finish_reason=finish_reason,
                sources=self._extract_sources(answer),
                confidence=self._estimate_confidence(answer),
                warnings=self._extract_warnings(answer),
                recommendations=self._extract_recommendations(answer)
            )
            
        except Exception as e:
            logger.error(
                "Agent execution failed",
                agent_slug=agent_slug,
                error=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
            )
            raise
    
    async def execute_agent_streaming(
        self,
        agent_slug: str,
        query: str,
        context: Optional[Dict[str, Any]] = None,
        config: Optional[AgentExecutionConfig] = None
    ) -> AsyncGenerator[str, None]:
        """
        Execute an AI agent with streaming response.
        
        Yields chunks of the response as they arrive.
        
        Args:
            agent_slug: Unique identifier of the agent
            query: User query/prompt
            context: Additional context data
            config: Execution configuration
            
        Yields:
            String chunks of the response
        """
        config = config or AgentExecutionConfig(stream=True)
        
        # Build messages
        system_message = self._get_agent_system_message(agent_slug)
        user_message = self._build_user_message(query, context)
        
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]
        
        logger.info(
            "Starting streaming execution",
            agent_slug=agent_slug,
            model=config.model
        )
        
        try:
            stream = await self.client.chat.completions.create(
                model=config.model,
                messages=messages,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                top_p=config.top_p,
                frequency_penalty=config.frequency_penalty,
                presence_penalty=config.presence_penalty,
                stream=True,
                timeout=config.timeout
            )
            
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(
                "Streaming execution failed",
                agent_slug=agent_slug,
                error=str(e)
            )
            raise
    
    async def _execute_with_retry(
        self,
        messages: List[Dict[str, str]],
        config: AgentExecutionConfig
    ) -> ChatCompletion:
        """
        Execute OpenAI API call with exponential backoff retry.
        
        Handles rate limits and transient errors.
        """
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                response = await self.client.chat.completions.create(
                    model=config.model,
                    messages=messages,
                    temperature=config.temperature,
                    max_tokens=config.max_tokens,
                    top_p=config.top_p,
                    frequency_penalty=config.frequency_penalty,
                    presence_penalty=config.presence_penalty,
                    timeout=config.timeout
                )
                return response
                
            except RateLimitError as e:
                last_error = e
                wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                logger.warning(
                    "Rate limit hit, retrying",
                    attempt=attempt + 1,
                    wait_time=wait_time
                )
                await asyncio.sleep(wait_time)
                
            except APITimeoutError as e:
                last_error = e
                logger.warning(
                    "API timeout, retrying",
                    attempt=attempt + 1
                )
                await asyncio.sleep(1)
                
            except OpenAIError as e:
                # Don't retry on client errors (4xx)
                if hasattr(e, 'status_code') and 400 <= e.status_code < 500:
                    raise
                last_error = e
                logger.warning(
                    "API error, retrying",
                    attempt=attempt + 1,
                    error=str(e)
                )
                await asyncio.sleep(1)
        
        # All retries exhausted
        logger.error("All retries exhausted", error=str(last_error))
        raise last_error
    
    def _get_agent_system_message(self, agent_slug: str) -> str:
        """
        Get the system message for a specific agent.
        
        In production, this would load from the TypeScript agent definition.
        For now, we use predefined messages.
        """
        agent_messages = {
            "tax-corp-eu-022": """You are an EU Corporate Tax Specialist AI agent.
            
You provide expert guidance on:
- EU-27 corporate tax rates and regulations
- ATAD I/II compliance
- DAC6 mandatory disclosure
- Transfer pricing within EU
- EU tax directive interpretation

Provide accurate, up-to-date tax guidance. Always cite specific directives or regulations.
Include warnings about jurisdiction-specific variations.
Recommend consulting with tax advisors for complex situations.""",
            
            "tax-corp-us-023": """You are a US Corporate Tax Specialist AI agent.
            
You provide expert guidance on:
- Federal corporate income tax (IRC)
- State corporate taxes (all 50 states)
- TCJA compliance and planning
- International tax (GILTI, FDII, Subpart F)
- Tax credits (R&D, foreign, energy)

Provide accurate, up-to-date US tax guidance. Always cite specific IRC sections.
Consider federal and state implications.
Recommend consulting with tax advisors for complex situations.""",
        }
        
        return agent_messages.get(
            agent_slug,
            f"You are a {agent_slug} AI agent. Provide expert tax guidance."
        )
    
    def _build_user_message(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build user message with context."""
        if not context:
            return query
        
        context_str = "\n\nContext:\n"
        for key, value in context.items():
            context_str += f"- {key}: {value}\n"
        
        return query + context_str
    
    def _calculate_cost(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int
    ) -> float:
        """Calculate cost in USD based on token usage."""
        pricing = self.TOKEN_PRICING.get(model)
        if not pricing:
            logger.warning(f"No pricing data for model {model}, using GPT-4 pricing")
            pricing = self.TOKEN_PRICING[ModelType.GPT_4.value]
        
        input_cost = (input_tokens / 1000) * pricing["input"]
        output_cost = (output_tokens / 1000) * pricing["output"]
        
        return round(input_cost + output_cost, 6)
    
    def _extract_sources(self, answer: str) -> Optional[List[str]]:
        """Extract cited sources from answer."""
        # Simple extraction - in production, use more sophisticated parsing
        sources = []
        if "IRC" in answer:
            sources.append("Internal Revenue Code")
        if "OECD" in answer:
            sources.append("OECD Guidelines")
        if "ATAD" in answer:
            sources.append("EU Anti-Tax Avoidance Directive")
        return sources if sources else None
    
    def _estimate_confidence(self, answer: str) -> Optional[float]:
        """
        Estimate confidence level based on answer characteristics.
        
        This is a simple heuristic. In production, you might:
        - Use model logprobs
        - Analyze certainty indicators in text
        - Use a separate confidence model
        """
        # Simple heuristic based on uncertainty markers
        uncertainty_markers = ["may", "might", "could", "possibly", "potentially"]
        
        marker_count = sum(1 for marker in uncertainty_markers if marker in answer.lower())
        
        if marker_count == 0:
            return 0.95
        elif marker_count <= 2:
            return 0.80
        else:
            return 0.65
    
    def _extract_warnings(self, answer: str) -> Optional[List[str]]:
        """Extract warnings from answer."""
        warnings = []
        if "consult" in answer.lower() or "advisor" in answer.lower():
            warnings.append("Recommend consulting with tax advisor")
        if "vary" in answer.lower() or "differs" in answer.lower():
            warnings.append("Rules may vary by jurisdiction")
        return warnings if warnings else None
    
    def _extract_recommendations(self, answer: str) -> Optional[List[str]]:
        """Extract recommendations from answer."""
        # This would be more sophisticated in production
        recommendations = []
        if "should" in answer.lower():
            recommendations.append("Review recommended actions with tax team")
        return recommendations if recommendations else None


# Singleton instance
_openai_service: Optional[OpenAIService] = None


def get_openai_service() -> OpenAIService:
    """Get or create OpenAI service singleton."""
    global _openai_service
    if _openai_service is None:
        _openai_service = OpenAIService()
    return _openai_service
