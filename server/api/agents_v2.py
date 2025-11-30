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
from server.agents.registry import (
    get_agent_registry,
    AgentDomain,
    list_all_agents,
    discover_agents as discover_agents_fn,
)

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


# Agent Registry Endpoints

class DiscoverAgentsRequest(BaseModel):
    query: str
    jurisdiction: Optional[str] = None
    domain: Optional[str] = None


@router.get("/list")
async def list_agents(
    domain: Optional[str] = Query(None, description="Filter by domain (tax, accounting, audit, corporate)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction code"),
    capability: Optional[str] = Query(None, description="Filter by capability"),
    is_active: bool = Query(True, description="Filter by active status"),
):
    """
    List all registered agents with optional filters.
    
    Returns comprehensive agent metadata including capabilities,
    jurisdictions, and supported standards.
    """
    try:
        # Convert domain string to enum if provided
        domain_enum = None
        if domain:
            try:
                domain_enum = AgentDomain(domain.lower())
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid domain: {domain}. Valid values: tax, accounting, audit, corporate"
                )
        
        agents = list_all_agents(
            domain=domain_enum,
            category=category,
            jurisdiction=jurisdiction,
            capability=capability,
            is_active=is_active,
        )
        
        registry = get_agent_registry()
        
        return {
            "agents": agents,
            "total": len(agents),
            "summary": {
                "tax": registry.count_agents(AgentDomain.TAX),
                "accounting": registry.count_agents(AgentDomain.ACCOUNTING),
                "audit": registry.count_agents(AgentDomain.AUDIT),
                "corporate": registry.count_agents(AgentDomain.CORPORATE),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/discover")
async def discover_agents(request: DiscoverAgentsRequest):
    """
    Discover agents based on natural language query.
    
    Analyzes the query text and returns matching agents
    sorted by relevance. Supports optional jurisdiction
    and domain filters.
    """
    try:
        domain_enum = None
        if request.domain:
            try:
                domain_enum = AgentDomain(request.domain.lower())
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid domain: {request.domain}. Valid values: tax, accounting, audit, corporate"
                )
        
        agents = discover_agents_fn(
            query=request.query,
            jurisdiction=request.jurisdiction,
            domain=domain_enum,
        )
        
        return {
            "query": request.query,
            "agents": agents,
            "total": len(agents),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{agent_id}")
async def get_agent(agent_id: str):
    """
    Get detailed information about a specific agent.
    
    Returns complete agent metadata including capabilities,
    jurisdictions, and supported standards.
    """
    try:
        registry = get_agent_registry()
        agent = registry.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        return {"agent": agent.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/domain/{domain}")
async def list_agents_by_domain(domain: str):
    """
    List all agents in a specific domain.
    
    Valid domains: tax, accounting, audit, corporate
    """
    try:
        try:
            domain_enum = AgentDomain(domain.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid domain: {domain}. Valid values: tax, accounting, audit, corporate"
            )
        
        agents = list_all_agents(domain=domain_enum)
        
        return {
            "domain": domain,
            "agents": agents,
            "total": len(agents),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jurisdiction/{jurisdiction}")
async def list_agents_by_jurisdiction(jurisdiction: str):
    """
    List all agents that support a specific jurisdiction.
    
    Examples: US, UK, MT (Malta), RW (Rwanda), EU
    """
    try:
        agents = list_all_agents(jurisdiction=jurisdiction.upper())
        
        return {
            "jurisdiction": jurisdiction.upper(),
            "agents": agents,
            "total": len(agents),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
