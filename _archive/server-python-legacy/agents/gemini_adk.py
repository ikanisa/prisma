"""
Google Gemini ADK (Agent Development Kit) Provider Implementation

Implements the Google Agent Development Kit pattern for advanced agent
functionality including native tool definitions, multi-turn conversation
management, streaming responses, and Vertex AI integration.

Note: This module provides a compatibility layer that works whether or not
the google-adk package is installed. If not installed, it falls back to
using the standard google-generativeai SDK with similar patterns.
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

# Try to import Google ADK (Agent Development Kit)
try:
    from google.adk import Agent as ADKAgent, Runner as ADKRunner
    from google.adk.tools import FunctionTool
    ADK_AVAILABLE = True
except ImportError:
    ADK_AVAILABLE = False
    logger.info("google-adk package not available, using compatibility layer")

# Import standard Generative AI for fallback
import google.generativeai as genai


@dataclass
class GeminiADKConfig:
    """Configuration for a Gemini ADK agent"""
    name: str
    system_instruction: str
    model: str = "gemini-2.0-flash"
    tools: List[Any] = field(default_factory=list)
    handoffs: List[AgentHandoff] = field(default_factory=list)
    guardrails: List[Guardrail] = field(default_factory=list)
    temperature: float = 0.7
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    max_output_tokens: Optional[int] = None


class GeminiADKProvider(BaseAgentProvider):
    """
    Google Gemini ADK provider implementation.
    
    Provides native support for the Google Agent Development Kit with
    fallback to the standard google-generativeai SDK when ADK is not installed.
    
    Features:
    - ADK Agent creation with system instructions
    - Native tool definitions using ADK patterns
    - Multi-turn conversation management
    - Streaming response support
    - Context and memory management
    - Integration with Vertex AI for production
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-2.0-flash",
        vertex_project: Optional[str] = None,
        vertex_location: Optional[str] = None
    ):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.default_model = model
        self.vertex_project = vertex_project or os.getenv("VERTEX_AI_PROJECT")
        self.vertex_location = vertex_location or os.getenv("VERTEX_AI_LOCATION")
        
        # Configure Generative AI
        genai.configure(api_key=self.api_key)
        
        self.agents: Dict[str, GeminiADKConfig] = {}
        self.traces: Dict[str, List[AgentTrace]] = {}
        self.conversations: Dict[str, List[Dict[str, Any]]] = {}  # For multi-turn
        self._native_agents: Dict[str, Any] = {}
        self._model_instances: Dict[str, Any] = {}

    def _convert_tools_to_gemini_format(
        self, tools: List[AgentToolDefinition]
    ) -> List[genai.types.FunctionDeclaration]:
        """Convert internal tool definitions to Gemini FunctionDeclaration format"""
        declarations = []
        for tool in tools:
            declarations.append(
                genai.types.FunctionDeclaration(
                    name=tool.name,
                    description=tool.description,
                    parameters=tool.parameters
                )
            )
        return declarations

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

    async def _apply_guardrails(
        self,
        agent_id: str,
        text: str,
        guardrail_type: str
    ) -> tuple[bool, str]:
        """Apply guardrails of specified type"""
        agent = self.agents.get(agent_id)
        if not agent or not agent.guardrails:
            return True, text

        for guardrail in agent.guardrails:
            if guardrail.type == guardrail_type and guardrail.handler:
                try:
                    result = guardrail.handler(text)
                    if hasattr(result, '__await__'):
                        result = await result
                    if isinstance(result, dict):
                        if not result.get("allowed", True):
                            return False, result.get("message", f"Blocked by {guardrail_type} guardrail")
                        text = result.get(f"modified_{guardrail_type}", text)
                except Exception as e:
                    logger.warning(f"Guardrail {guardrail.name} failed: {e}")

        return True, text

    async def create_agent(
        self,
        name: str,
        instructions: str,
        tools: List[AgentToolDefinition],
        model: str = "gemini-2.0-flash",
        handoffs: Optional[List[AgentHandoff]] = None,
        guardrails: Optional[List[Guardrail]] = None
    ) -> str:
        """
        Create an agent using the Gemini ADK pattern.
        
        If native ADK is available, creates a proper Agent object.
        Otherwise, stores configuration for compatibility-mode execution.
        """
        agent_id = f"gemini_adk_agent_{len(self.agents) + 1}_{uuid.uuid4().hex[:8]}"
        
        config = GeminiADKConfig(
            name=name,
            system_instruction=instructions,
            model=model,
            tools=tools,
            handoffs=handoffs or [],
            guardrails=guardrails or []
        )
        
        self.agents[agent_id] = config
        
        # Store tool handlers
        config._tool_handlers = {t.name: t.handler for t in tools if t.handler}
        config._tool_definitions = tools
        
        # Create Gemini model instance
        tool_declarations = self._convert_tools_to_gemini_format(tools)
        
        if tool_declarations:
            gemini_tools = genai.types.Tool(function_declarations=tool_declarations)
            model_instance = genai.GenerativeModel(
                model_name=model,
                tools=[gemini_tools],
                system_instruction=instructions
            )
        else:
            model_instance = genai.GenerativeModel(
                model_name=model,
                system_instruction=instructions
            )
        
        self._model_instances[agent_id] = model_instance
        
        # If native ADK is available, create ADK Agent
        if ADK_AVAILABLE:
            try:
                adk_tools = []
                for tool in tools:
                    if tool.handler:
                        adk_tool = FunctionTool(
                            name=tool.name,
                            description=tool.description,
                            function=tool.handler
                        )
                        adk_tools.append(adk_tool)
                
                native_agent = ADKAgent(
                    name=name,
                    system_instruction=instructions,
                    tools=adk_tools,
                    model=model
                )
                self._native_agents[agent_id] = native_agent
            except Exception as e:
                logger.warning(f"Failed to create native ADK Agent: {e}")
        
        logger.info(f"Created Gemini ADK agent {agent_id} with {len(tools)} tools")
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

    def _get_conversation_history(self, agent_id: str, conversation_id: str) -> List[Dict[str, Any]]:
        """Get conversation history for multi-turn support"""
        key = f"{agent_id}:{conversation_id}"
        return self.conversations.get(key, [])

    def _add_to_conversation(
        self,
        agent_id: str,
        conversation_id: str,
        role: str,
        content: str
    ):
        """Add a message to conversation history"""
        key = f"{agent_id}:{conversation_id}"
        if key not in self.conversations:
            self.conversations[key] = []
        self.conversations[key].append({"role": role, "parts": [content]})

    async def run_agent(
        self,
        agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """
        Execute agent using ADK Runner pattern.
        
        Uses native ADK if available, otherwise uses compatibility layer.
        """
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        
        trace = self._create_trace(agent_id, "run_agent")
        
        try:
            # Apply input guardrails
            allowed, processed_input = await self._apply_guardrails(agent_id, input_text, "input")
            if not allowed:
                self._complete_trace(trace, "blocked", {"reason": "input_guardrail"})
                return AgentResponse(
                    content=processed_input,
                    tool_calls=[],
                    usage={},
                    provider=AgentProvider.GEMINI_ADK,
                    metadata={"blocked": True, "reason": "input_guardrail"},
                    trace=trace
                )
            
            # Try native ADK execution
            if ADK_AVAILABLE and agent_id in self._native_agents:
                try:
                    runner = ADKRunner(agent=self._native_agents[agent_id])
                    result = await runner.run(processed_input)
                    content = result.output if hasattr(result, 'output') else str(result)
                    
                    allowed, content = await self._apply_guardrails(agent_id, content, "output")
                    
                    self._complete_trace(trace, "completed", {"native_adk": True})
                    return AgentResponse(
                        content=content,
                        tool_calls=[],
                        usage={},
                        provider=AgentProvider.GEMINI_ADK,
                        metadata={"native_adk": True},
                        trace=trace
                    )
                except Exception as e:
                    logger.warning(f"Native ADK execution failed, falling back: {e}")
            
            # Compatibility layer execution
            model = self._model_instances.get(agent_id)
            if not model:
                raise ValueError(f"Model instance for agent {agent_id} not found")
            
            prompt = processed_input
            if context:
                prompt = f"Context: {json.dumps(context)}\n\n{processed_input}"
            
            # Get conversation history if conversation_id in context
            conversation_id = context.get("conversation_id") if context else None
            history = []
            if conversation_id:
                history = self._get_conversation_history(agent_id, conversation_id)
            
            generation_config = genai.types.GenerationConfig(
                temperature=agent.temperature,
                top_p=agent.top_p,
                top_k=agent.top_k,
                max_output_tokens=agent.max_output_tokens,
            )
            
            if history:
                # Multi-turn conversation
                chat = model.start_chat(history=history)
                response = await chat.send_message_async(prompt)
            else:
                response = await model.generate_content_async(
                    prompt,
                    generation_config=generation_config
                )
            
            # Extract tool calls if present
            tool_calls = []
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        if hasattr(part, 'function_call'):
                            fc = part.function_call
                            args = dict(fc.args) if hasattr(fc, 'args') else {}
                            result = await self._execute_tool(agent_id, fc.name, args)
                            tool_calls.append({
                                "name": fc.name,
                                "arguments": args,
                                "result": result
                            })
            
            # Extract grounding metadata
            grounding_metadata = {}
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'grounding_metadata'):
                    gm = candidate.grounding_metadata
                    grounding_metadata = {
                        "grounding_chunks": getattr(gm, 'grounding_chunks', []),
                        "web_search_queries": getattr(gm, 'web_search_queries', [])
                    }
            
            content = response.text if hasattr(response, 'text') else ""
            
            # Apply output guardrails
            allowed, content = await self._apply_guardrails(agent_id, content, "output")
            if not allowed:
                self._complete_trace(trace, "blocked", {"reason": "output_guardrail"})
                return AgentResponse(
                    content=content,
                    tool_calls=tool_calls,
                    usage=self._extract_usage(response),
                    provider=AgentProvider.GEMINI_ADK,
                    metadata={"blocked": True, "reason": "output_guardrail"},
                    trace=trace
                )
            
            # Update conversation history
            if conversation_id:
                self._add_to_conversation(agent_id, conversation_id, "user", processed_input)
                self._add_to_conversation(agent_id, conversation_id, "model", content)
            
            self._complete_trace(trace, "completed", {
                "model": agent.model,
                "tool_calls": len(tool_calls)
            })
            
            return AgentResponse(
                content=content,
                tool_calls=tool_calls,
                usage=self._extract_usage(response),
                provider=AgentProvider.GEMINI_ADK,
                metadata={
                    "model": agent.model,
                    "grounding_metadata": grounding_metadata
                },
                trace=trace
            )
            
        except Exception as e:
            self._complete_trace(trace, "error", {"error": str(e)})
            raise

    def _extract_usage(self, response) -> Dict[str, int]:
        """Extract token usage from Gemini response"""
        if hasattr(response, 'usage_metadata'):
            return {
                "input_tokens": getattr(response.usage_metadata, 'prompt_token_count', 0),
                "output_tokens": getattr(response.usage_metadata, 'candidates_token_count', 0),
                "total_tokens": getattr(response.usage_metadata, 'total_token_count', 0)
            }
        return {}

    async def stream_agent(
        self,
        agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[StreamingAgentEvent, None]:
        """
        Stream agent responses with real-time updates.
        """
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        
        trace = self._create_trace(agent_id, "stream_agent")
        
        try:
            # Apply input guardrails
            allowed, processed_input = await self._apply_guardrails(agent_id, input_text, "input")
            if not allowed:
                yield StreamingAgentEvent(
                    type=StreamingEventType.ERROR,
                    content=processed_input,
                    metadata={"blocked": True, "reason": "input_guardrail"}
                )
                return
            
            model = self._model_instances.get(agent_id)
            if not model:
                raise ValueError(f"Model instance for agent {agent_id} not found")
            
            prompt = processed_input
            if context:
                prompt = f"Context: {json.dumps(context)}\n\n{processed_input}"
            
            generation_config = genai.types.GenerationConfig(
                temperature=agent.temperature,
            )
            
            response = await model.generate_content_async(
                prompt,
                generation_config=generation_config,
                stream=True
            )
            
            accumulated_content = ""
            
            async for chunk in response:
                if hasattr(chunk, 'text') and chunk.text:
                    accumulated_content += chunk.text
                    yield StreamingAgentEvent(
                        type=StreamingEventType.TEXT,
                        content=chunk.text,
                        metadata={"accumulated": accumulated_content}
                    )
                
                # Handle function calls in stream
                if hasattr(chunk, 'candidates') and chunk.candidates:
                    candidate = chunk.candidates[0]
                    if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                        for part in candidate.content.parts:
                            if hasattr(part, 'function_call'):
                                fc = part.function_call
                                yield StreamingAgentEvent(
                                    type=StreamingEventType.TOOL_CALL,
                                    content=fc.name,
                                    tool_name=fc.name,
                                    tool_arguments=dict(fc.args) if hasattr(fc, 'args') else {},
                                    metadata={}
                                )
                                
                                # Execute tool
                                args = dict(fc.args) if hasattr(fc, 'args') else {}
                                result = await self._execute_tool(agent_id, fc.name, args)
                                yield StreamingAgentEvent(
                                    type=StreamingEventType.TOOL_RESULT,
                                    content=json.dumps(result),
                                    tool_name=fc.name,
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
        """Execute handoff from one agent to another"""
        source_agent = self.agents.get(agent_id)
        target_agent = self.agents.get(target_agent_id)
        
        if not source_agent:
            raise ValueError(f"Source agent {agent_id} not found")
        if not target_agent:
            raise ValueError(f"Target agent {target_agent_id} not found")
        
        allowed_handoffs = [h.target_agent_id for h in source_agent.handoffs]
        if target_agent_id not in allowed_handoffs:
            raise ValueError(f"Handoff from {agent_id} to {target_agent_id} not allowed")
        
        trace = self._create_trace(agent_id, "handoff")
        trace.metadata["target_agent"] = target_agent_id
        
        try:
            handoff_context = context or {}
            handoff_context["handoff_from"] = agent_id
            
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

    async def run_with_grounding(
        self,
        agent_id: str,
        input_text: str,
        enable_search: bool = True
    ) -> AgentResponse:
        """Execute with Google Search grounding enabled"""
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        
        trace = self._create_trace(agent_id, "run_with_grounding")
        
        try:
            model_with_grounding = genai.GenerativeModel(
                model_name=agent.model,
                system_instruction=agent.system_instruction,
                tools=[genai.types.Tool.from_google_search_retrieval(
                    genai.types.GoogleSearchRetrieval()
                )] if enable_search else None
            )
            
            response = await model_with_grounding.generate_content_async(
                input_text,
                generation_config=genai.types.GenerationConfig(
                    temperature=agent.temperature,
                )
            )
            
            grounding_metadata = {}
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'grounding_metadata'):
                    gm = candidate.grounding_metadata
                    grounding_chunks = []
                    for chunk in (getattr(gm, 'grounding_chunks', []) or []):
                        web_info = getattr(chunk, 'web', None)
                        if web_info:
                            grounding_chunks.append({
                                "web": {
                                    "uri": getattr(web_info, 'uri', None),
                                    "title": getattr(web_info, 'title', None)
                                }
                            })
                        else:
                            grounding_chunks.append({"web": {"uri": None, "title": None}})
                    
                    grounding_metadata = {
                        "grounding_chunks": grounding_chunks,
                        "web_search_queries": list(getattr(gm, 'web_search_queries', []) or [])
                    }
            
            self._complete_trace(trace, "completed", {"grounded": True})
            
            return AgentResponse(
                content=response.text if hasattr(response, 'text') else "",
                tool_calls=[],
                usage=self._extract_usage(response),
                provider=AgentProvider.GEMINI_ADK,
                metadata={
                    "model": agent.model,
                    "grounding_metadata": grounding_metadata,
                    "grounded": True
                },
                trace=trace
            )
            
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
