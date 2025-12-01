"""
Google Gemini Provider Implementation with ADK

Implements agent functionality using Google's Generative AI SDK with
support for Gemini models, Google Search grounding, and Live API.

For the enhanced ADK integration with handoffs, guardrails, and tracing,
see the gemini_adk.py module.
"""
import os
from typing import Any, Dict, List, Optional, AsyncGenerator
import google.generativeai as genai

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


class GeminiAgentProvider(BaseAgentProvider):
    """Google Gemini provider implementation"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        genai.configure(api_key=self.api_key)
        self.agents: Dict[str, Dict[str, Any]] = {}

    def _convert_tools(self, tools: List[AgentToolDefinition]) -> List[genai.types.FunctionDeclaration]:
        """Convert internal tool definitions to Gemini format"""
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

    async def create_agent(
        self,
        name: str,
        instructions: str,
        tools: List[AgentToolDefinition],
        model: str = "gemini-2.0-flash-exp",
        handoffs: Optional[List[AgentHandoff]] = None,
        guardrails: Optional[List[Guardrail]] = None
    ) -> str:
        """Create a Gemini agent configuration"""
        agent_id = f"gemini_agent_{len(self.agents) + 1}"

        # Create tool declarations
        tool_declarations = self._convert_tools(tools)

        # Create model with tools
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

        self.agents[agent_id] = {
            "name": name,
            "instructions": instructions,
            "model": model_instance,
            "model_name": model,
            "tools": tools,
            "tool_handlers": {t.name: t.handler for t in tools if t.handler}
        }

        return agent_id

    async def run_agent(
        self,
        agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Execute Gemini agent"""
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")

        # Prepare prompt with context
        prompt = input_text
        if context:
            prompt = f"Context: {context}\n\n{input_text}"

        # Generate response
        response = await agent["model"].generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
            )
        )

        # Extract tool calls if present
        tool_calls = []
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                for part in candidate.content.parts:
                    if hasattr(part, 'function_call'):
                        fc = part.function_call
                        tool_calls.append({
                            "name": fc.name,
                            "arguments": dict(fc.args)
                        })

        # Extract grounding metadata if available
        grounding_metadata = {}
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'grounding_metadata'):
                grounding_metadata = {
                    "grounding_chunks": getattr(candidate.grounding_metadata, 'grounding_chunks', []),
                    "web_search_queries": getattr(candidate.grounding_metadata, 'web_search_queries', [])
                }

        return AgentResponse(
            content=response.text if hasattr(response, 'text') else "",
            tool_calls=tool_calls,
            usage={
                "input_tokens": response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else 0,
                "output_tokens": response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else 0,
                "total_tokens": response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else 0
            },
            provider=AgentProvider.GEMINI,
            metadata={
                "model": agent["model_name"],
                "grounding_metadata": grounding_metadata
            }
        )

    async def stream_agent(
        self,
        agent_id: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[StreamingAgentEvent, None]:
        """Stream Gemini agent responses"""
        agent = self.agents.get(agent_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")

        prompt = input_text
        if context:
            prompt = f"Context: {context}\n\n{input_text}"

        response = await agent["model"].generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
            ),
            stream=True
        )

        async for chunk in response:
            if hasattr(chunk, 'text') and chunk.text:
                yield StreamingAgentEvent(
                    type=StreamingEventType.TEXT,
                    content=chunk.text,
                    metadata={}
                )

        yield StreamingAgentEvent(
            type=StreamingEventType.DONE,
            content="",
            metadata={}
        )

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

        # Create model with grounding
        model_with_grounding = genai.GenerativeModel(
            model_name=agent["model_name"],
            system_instruction=agent["instructions"],
            tools=[genai.types.Tool.from_google_search_retrieval(
                genai.types.GoogleSearchRetrieval()
            )] if enable_search else None
        )

        response = await model_with_grounding.generate_content_async(
            input_text,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
            )
        )

        # Extract grounding metadata
        grounding_metadata = {}
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'grounding_metadata'):
                gm = candidate.grounding_metadata
                grounding_metadata = {
                    "grounding_chunks": [
                        {
                            "web": {
                                "uri": chunk.web.uri if hasattr(chunk, 'web') else None,
                                "title": chunk.web.title if hasattr(chunk, 'web') else None
                            }
                        }
                        for chunk in (gm.grounding_chunks or [])
                    ],
                    "web_search_queries": list(gm.web_search_queries or [])
                }

        return AgentResponse(
            content=response.text if hasattr(response, 'text') else "",
            tool_calls=[],
            usage={
                "input_tokens": response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else 0,
                "output_tokens": response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else 0,
                "total_tokens": response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else 0
            },
            provider=AgentProvider.GEMINI,
            metadata={
                "model": agent["model_name"],
                "grounding_metadata": grounding_metadata,
                "grounded": True
            }
        )
