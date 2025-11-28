"""
Tax Agent API Endpoints
FastAPI routes for tax specialist agents.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from server.agents.tax import get_tax_agent, list_tax_agents


router = APIRouter(prefix="/api/agents/tax", tags=["Tax Agents"])


class QueryRequest(BaseModel):
    """Tax agent query request"""
    query: str = Field(..., description="Tax question or query")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")


class QueryResponse(BaseModel):
    """Tax agent query response"""
    agent_id: str
    agent_name: str
    query: str
    guidance: str
    citations: List[Dict[str, str]]
    follow_up_actions: List[str]
    confidence: float
    timestamp: str


class AgentMetadata(BaseModel):
    """Tax agent metadata"""
    agent_id: str
    name: str
    category: str
    jurisdictions: List[str]


@router.get("/", response_model=List[AgentMetadata])
async def get_all_tax_agents():
    """
    List all available tax agents.
    
    Returns:
        List of tax agent metadata
    """
    agents = list_tax_agents()
    return agents


@router.get("/{agent_id}", response_model=Dict[str, Any])
async def get_agent_details(agent_id: str, org_id: str = "default"):
    """
    Get tax agent details including capabilities and tools.
    
    Args:
        agent_id: Tax agent identifier
        org_id: Organization ID
        
    Returns:
        Agent metadata, persona, and tools
    """
    try:
        agent = get_tax_agent(agent_id, org_id)
        return {
            "metadata": agent.get_metadata(),
            "persona": agent.get_persona(),
            "tools": agent.get_tools(),
            "jurisdictions": agent.get_jurisdictions()
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{agent_id}/query", response_model=QueryResponse)
async def query_tax_agent(
    agent_id: str,
    request: QueryRequest,
    org_id: str = "default"
):
    """
    Query a tax agent with a tax question.
    
    Args:
        agent_id: Tax agent identifier
        request: Query request with question and context
        org_id: Organization ID
        
    Returns:
        Tax guidance response with citations and follow-up actions
    """
    try:
        agent = get_tax_agent(agent_id, org_id)
        response = await agent.process_query(request.query, request.context)
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")


@router.get("/{agent_id}/tools", response_model=List[Dict[str, Any]])
async def get_agent_tools(agent_id: str, org_id: str = "default"):
    """
    Get available tools for a tax agent.
    
    Args:
        agent_id: Tax agent identifier
        org_id: Organization ID
        
    Returns:
        List of tool definitions
    """
    try:
        agent = get_tax_agent(agent_id, org_id)
        return agent.get_tools()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{agent_id}/tools/{tool_name}")
async def invoke_agent_tool(
    agent_id: str,
    tool_name: str,
    parameters: Dict[str, Any],
    org_id: str = "default"
):
    """
    Invoke a specific tool on a tax agent.
    
    Args:
        agent_id: Tax agent identifier
        tool_name: Tool function name
        parameters: Tool parameters
        org_id: Organization ID
        
    Returns:
        Tool execution result
    """
    try:
        agent = get_tax_agent(agent_id, org_id)
        tools = agent.get_tools()
        
        # Find the tool
        tool = next((t for t in tools if t["name"] == tool_name), None)
        if not tool:
            raise HTTPException(status_code=404, detail=f"Tool not found: {tool_name}")
        
        # In production, this would invoke the actual tool function
        return {
            "agent_id": agent_id,
            "tool_name": tool_name,
            "parameters": parameters,
            "result": f"Tool {tool_name} executed successfully (placeholder)",
            "status": "success"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error invoking tool: {str(e)}")
