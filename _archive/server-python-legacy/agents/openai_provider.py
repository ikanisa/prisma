"""
OpenAI Provider Implementation with Agents SDK

Note: This uses the standard OpenAI SDK. The official openai-agents package
is still in beta. This implementation provides the core functionality needed
for agent orchestration, tool calling, and streaming.

For the enhanced Agents SDK integration with handoffs, guardrails, and tracing,
see the openai_agents_sdk.py module.
"""
from typing import Any, Dict, List, Optional, AsyncGenerator
import os
from openai import AsyncOpenAI

from .base import (
    BaseAgentProvider,
    AgentToolDefinition,
    AgentResponse,
    AgentProvider,
    StreamingAgentEvent,
    StreamingEventType,
    AgentHandoff,
    Guardrail,
)


class OpenAIAgentProvider(BaseAgentProvider):
    """OpenAI provider implementation with Agents API support"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=self.api_key)
        self.agents: Dict[str, Dict[str, Any]] = {}

    def _convert_tools(self, tools: List[AgentToolDefinition]) -> List[Dict[str, Any]]:
        """Convert internal tool definitions to OpenAI format"""
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters
                }
            }
            for t in tools
        ]

    async def create_agent(
        self,
        name: str,
        instructions: str,
        tools: List[AgentToolDefinition],
        model: str = "gpt-4o",
        handoffs: Optional[List[AgentHandoff]] = None,
        guardrails: Optional[List[Guardrail]] = None
    ) -> str:
        """Create an agent configuration"""
        agent_id = f"agent_{len(self.agents) + 1}"

        self.agents[agent_id] = {
            "name": name,
            "instructions": instructions,
            "model": model,
            "tools": self._convert_tools(tools),
            "tool_handlers": {t.name: t.handler for t in tools if t.handler}
        }

        return agent_id

    async def _execute_tool(self, agent_id: str, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Execute a tool function"""
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")

        handler = agent["tool_handlers"].get(tool_name)
        if not handler:
            raise ValueError(f"Tool {tool_name} has no handler")

        return await handler(**arguments)

    async def run_agent(
        self,
        agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Execute agent with OpenAI API"""
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")

        messages = [
            {"role": "system", "content": agent["instructions"]},
            {"role": "user", "content": input_text}
        ]

        # Add context if provided
        if context:
            messages[0]["content"] += f"\n\nContext: {context}"

        response = await self.client.chat.completions.create(
            model=agent["model"],
            messages=messages,
            tools=agent["tools"] if agent["tools"] else None,
            temperature=0.7,
        )

        message = response.choices[0].message
        tool_calls = []

        # Handle tool calls if present
        if message.tool_calls:
            for tool_call in message.tool_calls:
                import json
                tool_calls.append({
                    "id": tool_call.id,
                    "name": tool_call.function.name,
                    "arguments": json.loads(tool_call.function.arguments)
                })

        return AgentResponse(
            content=message.content or "",
            tool_calls=tool_calls,
            usage={
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            },
            provider=AgentProvider.OPENAI,
            metadata={
                "model": agent["model"],
                "finish_reason": response.choices[0].finish_reason
            }
        )

    async def stream_agent(
        self,
        agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[StreamingAgentEvent, None]:
        """Stream agent responses using OpenAI streaming"""
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")

        messages = [
            {"role": "system", "content": agent["instructions"]},
            {"role": "user", "content": input_text}
        ]

        if context:
            messages[0]["content"] += f"\n\nContext: {context}"

        stream = await self.client.chat.completions.create(
            model=agent["model"],
            messages=messages,
            tools=agent["tools"] if agent["tools"] else None,
            temperature=0.7,
            stream=True
        )

        async for chunk in stream:
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta

                if delta.content:
                    yield StreamingAgentEvent(
                        type=StreamingEventType.TEXT,
                        content=delta.content,
                        metadata={}
                    )

                if delta.tool_calls:
                    for tool_call in delta.tool_calls:
                        if tool_call.function:
                            yield StreamingAgentEvent(
                                type=StreamingEventType.TOOL_CALL,
                                content=tool_call.function.name or "",
                                tool_call_id=tool_call.id,
                                tool_name=tool_call.function.name,
                                tool_arguments=None,  # Arguments streamed incrementally
                                metadata={}
                            )

                # Check for stream end
                if chunk.choices[0].finish_reason:
                    yield StreamingAgentEvent(
                        type=StreamingEventType.DONE,
                        content="",
                        metadata={"finish_reason": chunk.choices[0].finish_reason}
                    )
