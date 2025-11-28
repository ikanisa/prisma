"""
FastAPI endpoints for multi-provider agent system
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from fastapi.responses import StreamingResponse
import json

from server.agents.base import AgentProvider, AgentToolDefinition, AgentOrchestrator
from server.agents.openai_provider import OpenAIAgentProvider
from server.agents.gemini_provider import GeminiAgentProvider

router = APIRouter(prefix="/agents/v2", tags=["agents-v2"])

# Initialize orchestrator
orchestrator = AgentOrchestrator()
orchestrator.register_provider(AgentProvider.OPENAI, OpenAIAgentProvider())
orchestrator.register_provider(AgentProvider.GEMINI, GeminiAgentProvider())


class CreateAgentRequest(BaseModel):
    name: str
    instructions: str
    model: str
    tools: List[Dict[str, Any]] = []
    provider: str = "openai"


class ExecuteAgentRequest(BaseModel):
    agent_id: str
    input_text: str
    context: Optional[Dict[str, Any]] = None
    provider: Optional[str] = None


@router.post("/create")
async def create_agent(request: CreateAgentRequest):
    """Create a new agent"""
    try:
        provider = AgentProvider(request.provider)

        # Convert tools
        tools = [
            AgentToolDefinition(
                name=t["name"],
                description=t["description"],
                parameters=t["parameters"]
            )
            for t in request.tools
        ]

        agent_id = await orchestrator.providers[provider].create_agent(
            name=request.name,
            instructions=request.instructions,
            tools=tools,
            model=request.model
        )

        return {"agent_id": agent_id, "provider": provider.value}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute")
async def execute_agent(request: ExecuteAgentRequest):
    """Execute an agent"""
    try:
        provider = AgentProvider(request.provider) if request.provider else None

        response = await orchestrator.execute(
            agent_id=request.agent_id,
            input_text=request.input_text,
            provider=provider
        )

        return {
            "content": response.content,
            "tool_calls": response.tool_calls,
            "usage": response.usage,
            "provider": response.provider.value,
            "metadata": response.metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def stream_agent(request: ExecuteAgentRequest):
    """Stream agent responses"""
    async def generate():
        try:
            provider = AgentProvider(request.provider) if request.provider else None

            async for response in orchestrator.stream(
                agent_id=request.agent_id,
                input_text=request.input_text,
                provider=provider
            ):
                data = {
                    "content": response.content,
                    "tool_calls": response.tool_calls,
                    "usage": response.usage,
                    "provider": response.provider.value,
                    "metadata": response.metadata
                }
                yield f"{json.dumps(data)}\n"
        except Exception as e:
            error_data = {"error": str(e)}
            yield f"{json.dumps(error_data)}\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")
