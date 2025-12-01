"""
OpenAI Agents SDK Provider Implementation

Implements the official OpenAI Agents SDK (openai-agents) for advanced agent
functionality including native Agent class, Runner execution, function tools,
agent handoffs, guardrails, and tracing.

Note: This module provides a compatibility layer that works whether or not
the openai-agents package is installed. If not installed, it falls back to
using the standard OpenAI SDK with similar patterns.
"""
import os
import time
import uuid
import json
import logging
from typing import Any, Callable, Dict, List, Optional, AsyncGenerator
from dataclasses import dataclass, field

from .base import (
    BaseAgentProvider,
    AgentToolDefinition,
    AgentHandoff,
    Guardrail,
    AgentResponse,
    AgentTrace,
    AgentProvider,
    StreamingAgentEvent,
    StreamingEventType,
)

logger = logging.getLogger(__name__)

# Try to import the official openai-agents package
try:
    from agents import Agent, Runner, function_tool, handoff
    AGENTS_SDK_AVAILABLE = True
except ImportError:
    AGENTS_SDK_AVAILABLE = False
    logger.info("openai-agents package not available, using compatibility layer")

# Import standard OpenAI for fallback
from openai import AsyncOpenAI


def create_function_tool(
    name: str,
    description: str,
    parameters: Dict[str, Any],
    handler: Optional[Callable] = None
) -> Callable:
    """
    Create a function tool compatible with the Agents SDK pattern.
    
    This decorator-style function creates tools that can be used with both
    the native SDK and our compatibility layer.
    """
    async def tool_wrapper(**kwargs) -> Any:
        if handler:
            result = handler(**kwargs)
            if hasattr(result, '__await__'):
                return await result
            return result
        return {"error": f"No handler defined for tool {name}"}
    
    tool_wrapper.__name__ = name
    tool_wrapper.__doc__ = description
    tool_wrapper._tool_parameters = parameters
    tool_wrapper._is_function_tool = True
    
    return tool_wrapper


@dataclass
class AgentSDKConfig:
    """Configuration for an Agents SDK agent"""
    name: str
    instructions: str
    model: str = "gpt-4o"
    tools: List[Any] = field(default_factory=list)
    handoffs: List[AgentHandoff] = field(default_factory=list)
    guardrails: List[Guardrail] = field(default_factory=list)
    temperature: float = 0.7
    max_tokens: Optional[int] = None


class OpenAIAgentsSDKProvider(BaseAgentProvider):
    """
    OpenAI Agents SDK provider implementation.
    
    Provides native support for the official openai-agents package with
    fallback to the standard OpenAI SDK when the agents package is not installed.
    
    Features:
    - Native Agent() class usage
    - Runner execution with run() and run_streamed()
    - @function_tool decorator for tool definitions
    - Agent handoffs for multi-agent workflows
    - Guardrails integration
    - Tracing and observability
    - Async streaming support
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o"):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.default_model = model
        self.client = AsyncOpenAI(api_key=self.api_key)
        self.agents: Dict[str, AgentSDKConfig] = {}
        self.traces: Dict[str, List[AgentTrace]] = {}
        self._native_agents: Dict[str, Any] = {}  # Store native Agent objects if SDK available

    def _convert_tools_to_openai_format(
        self, tools: List[AgentToolDefinition]
    ) -> List[Dict[str, Any]]:
        """Convert internal tool definitions to OpenAI function calling format"""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters
                }
            }
            for tool in tools
        ]

    def _create_trace(
        self,
        agent_id: str,
        operation: str,
        parent_span_id: Optional[str] = None
    ) -> AgentTrace:
        """Create a new trace for observability"""
        trace = AgentTrace(
            trace_id=str(uuid.uuid4()),
            span_id=str(uuid.uuid4()),
            parent_span_id=parent_span_id,
            operation=operation,
            start_time=time.time(),
            end_time=None,
            status="in_progress"
        )
        if agent_id not in self.traces:
            self.traces[agent_id] = []
        self.traces[agent_id].append(trace)
        return trace

    def _complete_trace(
        self,
        trace: AgentTrace,
        status: str = "completed",
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Complete a trace with final status"""
        trace.end_time = time.time()
        trace.status = status
        if metadata:
            trace.metadata.update(metadata)

    async def _apply_input_guardrails(
        self,
        agent_id: str,
        input_text: str
    ) -> tuple[bool, str]:
        """Apply input guardrails before agent execution"""
        agent = self.agents.get(agent_id)
        if not agent or not agent.guardrails:
            return True, input_text

        for guardrail in agent.guardrails:
            if guardrail.type == "input" and guardrail.handler:
                try:
                    result = guardrail.handler(input_text)
                    if hasattr(result, '__await__'):
                        result = await result
                    if isinstance(result, dict):
                        if not result.get("allowed", True):
                            return False, result.get("message", "Input blocked by guardrail")
                        input_text = result.get("modified_input", input_text)
                except Exception as e:
                    logger.warning(f"Guardrail {guardrail.name} failed: {e}")

        return True, input_text

    async def _apply_output_guardrails(
        self,
        agent_id: str,
        output: str
    ) -> tuple[bool, str]:
        """Apply output guardrails after agent execution"""
        agent = self.agents.get(agent_id)
        if not agent or not agent.guardrails:
            return True, output

        for guardrail in agent.guardrails:
            if guardrail.type == "output" and guardrail.handler:
                try:
                    result = guardrail.handler(output)
                    if hasattr(result, '__await__'):
                        result = await result
                    if isinstance(result, dict):
                        if not result.get("allowed", True):
                            return False, result.get("message", "Output blocked by guardrail")
                        output = result.get("modified_output", output)
                except Exception as e:
                    logger.warning(f"Guardrail {guardrail.name} failed: {e}")

        return True, output

    async def create_agent(
        self,
        name: str,
        instructions: str,
        tools: List[AgentToolDefinition],
        model: str = "gpt-4o",
        handoffs: Optional[List[AgentHandoff]] = None,
        guardrails: Optional[List[Guardrail]] = None
    ) -> str:
        """
        Create an agent using the Agents SDK pattern.
        
        If the native SDK is available, creates a proper Agent object.
        Otherwise, stores configuration for compatibility-mode execution.
        """
        agent_id = f"openai_sdk_agent_{len(self.agents) + 1}_{uuid.uuid4().hex[:8]}"
        
        config = AgentSDKConfig(
            name=name,
            instructions=instructions,
            model=model,
            tools=[create_function_tool(t.name, t.description, t.parameters, t.handler) for t in tools],
            handoffs=handoffs or [],
            guardrails=guardrails or []
        )
        
        self.agents[agent_id] = config
        
        # Store tool handlers separately for execution
        self.agents[agent_id]._tool_handlers = {t.name: t.handler for t in tools if t.handler}
        self.agents[agent_id]._tool_definitions = tools
        
        # If native SDK is available, create a proper Agent object
        if AGENTS_SDK_AVAILABLE:
            try:
                native_tools = []
                for tool in tools:
                    if tool.handler:
                        # Wrap the handler with function_tool decorator
                        @function_tool
                        async def tool_func(**kwargs):
                            return await tool.handler(**kwargs) if hasattr(tool.handler, '__await__') else tool.handler(**kwargs)
                        tool_func.__name__ = tool.name
                        tool_func.__doc__ = tool.description
                        native_tools.append(tool_func)
                
                native_agent = Agent(
                    name=name,
                    instructions=instructions,
                    model=model,
                    tools=native_tools
                )
                self._native_agents[agent_id] = native_agent
            except Exception as e:
                logger.warning(f"Failed to create native Agent, using compatibility mode: {e}")
        
        logger.info(f"Created agent {agent_id} with {len(tools)} tools")
        return agent_id

    async def _execute_tool(
        self,
        agent_id: str,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> Any:
        """Execute a tool function by name"""
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        
        handler = agent._tool_handlers.get(tool_name)
        if not handler:
            return {"error": f"Tool {tool_name} has no handler"}
        
        try:
            result = handler(**arguments)
            if hasattr(result, '__await__'):
                result = await result
            return result
        except Exception as e:
            logger.error(f"Tool execution failed: {e}")
            return {"error": str(e)}

    async def run_agent(
        self,
        agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """
        Execute agent using Runner.run() pattern.
        
        Uses native SDK if available, otherwise uses compatibility layer.
        """
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        
        trace = self._create_trace(agent_id, "run_agent")
        
        try:
            # Apply input guardrails
            allowed, processed_input = await self._apply_input_guardrails(agent_id, input_text)
            if not allowed:
                self._complete_trace(trace, "blocked", {"reason": "input_guardrail"})
                return AgentResponse(
                    content=processed_input,
                    tool_calls=[],
                    usage={},
                    provider=AgentProvider.OPENAI_AGENTS_SDK,
                    metadata={"blocked": True, "reason": "input_guardrail"},
                    trace=trace
                )
            
            # Try native SDK execution first
            if AGENTS_SDK_AVAILABLE and agent_id in self._native_agents:
                try:
                    result = await Runner.run(
                        self._native_agents[agent_id],
                        processed_input
                    )
                    content = result.final_output if hasattr(result, 'final_output') else str(result)
                    
                    # Apply output guardrails
                    allowed, content = await self._apply_output_guardrails(agent_id, content)
                    
                    self._complete_trace(trace, "completed", {"native_sdk": True})
                    return AgentResponse(
                        content=content,
                        tool_calls=[],
                        usage={},
                        provider=AgentProvider.OPENAI_AGENTS_SDK,
                        metadata={"native_sdk": True},
                        trace=trace
                    )
                except Exception as e:
                    logger.warning(f"Native SDK execution failed, falling back: {e}")
            
            # Compatibility layer execution
            messages = [
                {"role": "system", "content": agent.instructions},
                {"role": "user", "content": processed_input}
            ]
            
            if context:
                messages[0]["content"] += f"\n\nContext: {json.dumps(context)}"
            
            # Get tool definitions for OpenAI format
            openai_tools = self._convert_tools_to_openai_format(agent._tool_definitions) if agent._tool_definitions else None
            
            response = await self.client.chat.completions.create(
                model=agent.model,
                messages=messages,
                tools=openai_tools if openai_tools else None,
                temperature=agent.temperature,
                max_tokens=agent.max_tokens,
            )
            
            message = response.choices[0].message
            tool_calls = []
            
            # Handle tool calls if present
            if message.tool_calls:
                for tool_call in message.tool_calls:
                    args = json.loads(tool_call.function.arguments)
                    tool_result = await self._execute_tool(agent_id, tool_call.function.name, args)
                    tool_calls.append({
                        "id": tool_call.id,
                        "name": tool_call.function.name,
                        "arguments": args,
                        "result": tool_result
                    })
            
            content = message.content or ""
            
            # Apply output guardrails
            allowed, content = await self._apply_output_guardrails(agent_id, content)
            if not allowed:
                self._complete_trace(trace, "blocked", {"reason": "output_guardrail"})
                return AgentResponse(
                    content=content,
                    tool_calls=tool_calls,
                    usage={
                        "input_tokens": response.usage.prompt_tokens,
                        "output_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens
                    },
                    provider=AgentProvider.OPENAI_AGENTS_SDK,
                    metadata={"blocked": True, "reason": "output_guardrail"},
                    trace=trace
                )
            
            self._complete_trace(trace, "completed", {
                "model": agent.model,
                "tool_calls": len(tool_calls)
            })
            
            return AgentResponse(
                content=content,
                tool_calls=tool_calls,
                usage={
                    "input_tokens": response.usage.prompt_tokens,
                    "output_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                provider=AgentProvider.OPENAI_AGENTS_SDK,
                metadata={
                    "model": agent.model,
                    "finish_reason": response.choices[0].finish_reason
                },
                trace=trace
            )
            
        except Exception as e:
            self._complete_trace(trace, "error", {"error": str(e)})
            raise

    async def stream_agent(
        self,
        agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[StreamingAgentEvent, None]:
        """
        Stream agent responses using Runner.run_streamed() pattern.
        """
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        
        trace = self._create_trace(agent_id, "stream_agent")
        
        try:
            # Apply input guardrails
            allowed, processed_input = await self._apply_input_guardrails(agent_id, input_text)
            if not allowed:
                yield StreamingAgentEvent(
                    type=StreamingEventType.ERROR,
                    content=processed_input,
                    metadata={"blocked": True, "reason": "input_guardrail"}
                )
                return
            
            messages = [
                {"role": "system", "content": agent.instructions},
                {"role": "user", "content": processed_input}
            ]
            
            if context:
                messages[0]["content"] += f"\n\nContext: {json.dumps(context)}"
            
            openai_tools = self._convert_tools_to_openai_format(agent._tool_definitions) if agent._tool_definitions else None
            
            stream = await self.client.chat.completions.create(
                model=agent.model,
                messages=messages,
                tools=openai_tools if openai_tools else None,
                temperature=agent.temperature,
                stream=True
            )
            
            current_tool_call = None
            accumulated_content = ""
            
            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    
                    # Handle content streaming
                    if delta.content:
                        accumulated_content += delta.content
                        yield StreamingAgentEvent(
                            type=StreamingEventType.TEXT,
                            content=delta.content,
                            metadata={"accumulated": accumulated_content}
                        )
                    
                    # Handle tool calls
                    if delta.tool_calls:
                        for tool_call in delta.tool_calls:
                            if tool_call.function:
                                if current_tool_call is None or tool_call.index != current_tool_call.get("index"):
                                    if current_tool_call:
                                        # Execute previous tool call
                                        args = json.loads(current_tool_call.get("arguments", "{}"))
                                        result = await self._execute_tool(
                                            agent_id,
                                            current_tool_call.get("name", ""),
                                            args
                                        )
                                        yield StreamingAgentEvent(
                                            type=StreamingEventType.TOOL_RESULT,
                                            content=json.dumps(result),
                                            tool_call_id=current_tool_call.get("id"),
                                            tool_name=current_tool_call.get("name"),
                                            metadata={"result": result}
                                        )
                                    
                                    current_tool_call = {
                                        "index": tool_call.index,
                                        "id": tool_call.id,
                                        "name": tool_call.function.name,
                                        "arguments": tool_call.function.arguments or ""
                                    }
                                    
                                    yield StreamingAgentEvent(
                                        type=StreamingEventType.TOOL_CALL,
                                        content=tool_call.function.name,
                                        tool_call_id=tool_call.id,
                                        tool_name=tool_call.function.name,
                                        metadata={}
                                    )
                                else:
                                    current_tool_call["arguments"] += tool_call.function.arguments or ""
                    
                    # Handle stream end
                    if chunk.choices[0].finish_reason:
                        if current_tool_call:
                            # Execute final tool call
                            args = json.loads(current_tool_call.get("arguments", "{}"))
                            result = await self._execute_tool(
                                agent_id,
                                current_tool_call.get("name", ""),
                                args
                            )
                            yield StreamingAgentEvent(
                                type=StreamingEventType.TOOL_RESULT,
                                content=json.dumps(result),
                                tool_call_id=current_tool_call.get("id"),
                                tool_name=current_tool_call.get("name"),
                                metadata={"result": result}
                            )
            
            self._complete_trace(trace, "completed")
            yield StreamingAgentEvent(
                type=StreamingEventType.DONE,
                content="",
                metadata={"total_content": accumulated_content}
            )
            
        except Exception as e:
            self._complete_trace(trace, "error", {"error": str(e)})
            yield StreamingAgentEvent(
                type=StreamingEventType.ERROR,
                content=str(e),
                metadata={"error": True}
            )

    async def execute_handoff(
        self,
        agent_id: str,
        target_agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """
        Execute handoff from one agent to another.
        
        Supports multi-agent workflows where one agent delegates to another.
        """
        source_agent = self.agents.get(agent_id)
        target_agent = self.agents.get(target_agent_id)
        
        if not source_agent:
            raise ValueError(f"Source agent {agent_id} not found")
        if not target_agent:
            raise ValueError(f"Target agent {target_agent_id} not found")
        
        # Verify handoff is allowed
        allowed_handoffs = [h.target_agent_id for h in source_agent.handoffs]
        if target_agent_id not in allowed_handoffs:
            raise ValueError(f"Handoff from {agent_id} to {target_agent_id} not allowed")
        
        trace = self._create_trace(agent_id, "handoff", parent_span_id=None)
        trace.metadata["target_agent"] = target_agent_id
        
        try:
            # Execute on target agent with handoff context
            handoff_context = context or {}
            handoff_context["handoff_from"] = agent_id
            handoff_context["handoff_reason"] = next(
                (h.description for h in source_agent.handoffs if h.target_agent_id == target_agent_id),
                "Agent handoff"
            )
            
            result = await self.run_agent(target_agent_id, input_text, handoff_context)
            result.handoff_result = {
                "source_agent": agent_id,
                "target_agent": target_agent_id,
                "success": True
            }
            
            self._complete_trace(trace, "completed")
            return result
            
        except Exception as e:
            self._complete_trace(trace, "error", {"error": str(e)})
            raise

    async def get_traces(
        self,
        agent_id: str,
        limit: int = 100
    ) -> List[AgentTrace]:
        """Get execution traces for an agent"""
        agent_traces = self.traces.get(agent_id, [])
        return sorted(
            agent_traces[-limit:],
            key=lambda t: t.start_time,
            reverse=True
        )
