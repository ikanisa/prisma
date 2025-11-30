"""
FastAPI endpoints for multi-provider agent system
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from fastapi.responses import StreamingResponse
import json

from server.agents.base import AgentProvider, AgentToolDefinition, AgentOrchestrator
from server.agents.openai_provider import OpenAIAgentProvider
from server.agents.gemini_provider import GeminiAgentProvider
from server.agents.registry import get_registry, AgentDomain, AgentCapability

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


@router.get("/list")
async def list_agents(
    domain: Optional[str] = Query(None, description="Filter by domain: tax, audit, accounting, corporate-services"),
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction code: MT, RW, etc."),
    capability: Optional[str] = Query(None, description="Filter by capability"),
    active_only: bool = Query(True, description="Only return active agents")
):
    """List all registered agents with optional filters"""
    try:
        registry = get_registry()

        # Parse filters
        domain_filter = AgentDomain(domain) if domain else None
        capability_filter = AgentCapability(capability) if capability else None

        # Search agents
        agents = registry.search(
            domain=domain_filter,
            jurisdiction=jurisdiction,
            capability=capability_filter,
            active_only=active_only
        )

        # Format response
        return {
            "agents": [
                {
                    "agent_id": a.agent_id,
                    "name": a.name,
                    "domain": a.domain.value,
                    "category": a.category,
                    "description": a.description,
                    "capabilities": [c.value for c in a.capabilities],
                    "jurisdictions": a.jurisdictions,
                    "provider": a.provider,
                    "model": a.model,
                    "is_active": a.is_active
                }
                for a in agents
            ],
            "total": len(agents)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid filter value: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/discover/{agent_id}")
async def discover_agent(agent_id: str):
    """Get detailed information about a specific agent"""
    try:
        registry = get_registry()
        agent = registry.get(agent_id)

        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

        return {
            "agent_id": agent.agent_id,
            "name": agent.name,
            "domain": agent.domain.value,
            "category": agent.category,
            "description": agent.description,
            "capabilities": [c.value for c in agent.capabilities],
            "jurisdictions": agent.jurisdictions,
            "provider": agent.provider,
            "model": agent.model,
            "system_prompt": agent.system_prompt,
            "tools": agent.tools,
            "is_active": agent.is_active,
            "requires_org_context": agent.requires_org_context
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/domains")
async def list_domains():
    """List all available agent domains"""
    return {
        "domains": [
            {"value": d.value, "name": d.name}
            for d in AgentDomain
        ]
    }


@router.get("/capabilities")
async def list_capabilities():
    """List all available agent capabilities"""
    return {
        "capabilities": [
            {"value": c.value, "name": c.name}
            for c in AgentCapability
        ]
    }


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
