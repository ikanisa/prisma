"""
Agents SDK API Routes (v3)

FastAPI routes for the OpenAI Agents SDK and Gemini ADK integration.
Provides endpoints for creating, executing, streaming, and managing agents.
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4
import json
import asyncio

from server.agents.base import (
    AgentProvider,
    AgentToolDefinition,
    AgentHandoff,
    Guardrail,
    StreamingEventType,
)
from server.agents.orchestrator import get_orchestrator, UnifiedAgentOrchestrator

router = APIRouter(prefix="/api/v3/agents", tags=["agents-sdk"])


# ============================================
# Pydantic Models
# ============================================

class ToolDefinitionInput(BaseModel):
    """Tool definition for agent creation"""
    name: str = Field(..., description="Tool name")
    description: str = Field(..., description="Tool description")
    parameters: Dict[str, Any] = Field(..., description="JSON Schema for parameters")


class HandoffInput(BaseModel):
    """Handoff definition for multi-agent workflows"""
    target_agent_id: str = Field(..., description="Target agent ID for handoff")
    name: str = Field(..., description="Handoff name")
    description: str = Field(..., description="When to use this handoff")
    condition: Optional[str] = Field(None, description="Condition expression")


class GuardrailInput(BaseModel):
    """Guardrail definition for agent safety"""
    name: str = Field(..., description="Guardrail name")
    description: str = Field(..., description="Guardrail description")
    type: str = Field(..., description="Type: input, output, or tool_call")
    config: Optional[Dict[str, Any]] = Field(default_factory=dict)


class CreateAgentRequest(BaseModel):
    """Request body for creating an agent"""
    name: str = Field(..., description="Agent name")
    instructions: str = Field(..., description="System instructions/prompt")
    model: str = Field("gpt-4o", description="Model to use")
    provider: str = Field("openai-agents", description="Provider: openai-agents or gemini-adk")
    tools: List[ToolDefinitionInput] = Field(default_factory=list)
    handoffs: List[HandoffInput] = Field(default_factory=list)
    guardrails: List[GuardrailInput] = Field(default_factory=list)


class CreateAgentResponse(BaseModel):
    """Response from agent creation"""
    agent_id: str
    name: str
    provider: str
    model: str
    tools_count: int
    handoffs_count: int
    guardrails_count: int
    created_at: datetime


class RunAgentRequest(BaseModel):
    """Request body for running an agent"""
    input_text: str = Field(..., description="Input query/prompt")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")
    ab_test_name: Optional[str] = Field(None, description="A/B test name for provider selection")


class AgentResponseModel(BaseModel):
    """Agent execution response"""
    content: str
    tool_calls: List[Dict[str, Any]]
    usage: Dict[str, int]
    provider: str
    metadata: Dict[str, Any]
    trace_id: Optional[str] = None


class HandoffRequest(BaseModel):
    """Request body for agent handoff"""
    target_agent_id: str = Field(..., description="Target agent ID")
    input_text: str = Field(..., description="Input for the target agent")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")


class TraceResponse(BaseModel):
    """Execution trace response"""
    trace_id: str
    span_id: str
    parent_span_id: Optional[str]
    operation: str
    start_time: float
    end_time: Optional[float]
    status: str
    latency_ms: Optional[float] = None
    metadata: Dict[str, Any]
    events: List[Dict[str, Any]]


class MetricsSummary(BaseModel):
    """Metrics summary response"""
    count: int
    success_rate: float
    avg_latency_ms: float
    total_tokens: int
    by_provider: Dict[str, int]


# ============================================
# Helper Functions
# ============================================

def _get_provider_enum(provider_str: str) -> AgentProvider:
    """Convert string to AgentProvider enum"""
    provider_map = {
        "openai-agents": AgentProvider.OPENAI_AGENTS_SDK,
        "openai_agents_sdk": AgentProvider.OPENAI_AGENTS_SDK,
        "gemini-adk": AgentProvider.GEMINI_ADK,
        "gemini_adk": AgentProvider.GEMINI_ADK,
        "openai": AgentProvider.OPENAI,
        "gemini": AgentProvider.GEMINI,
    }
    provider = provider_map.get(provider_str.lower())
    if not provider:
        raise ValueError(f"Unknown provider: {provider_str}")
    return provider


def _convert_tools(tools: List[ToolDefinitionInput]) -> List[AgentToolDefinition]:
    """Convert input tools to internal format"""
    return [
        AgentToolDefinition(
            name=t.name,
            description=t.description,
            parameters=t.parameters,
            handler=None  # Handlers are set up separately
        )
        for t in tools
    ]


def _convert_handoffs(handoffs: List[HandoffInput]) -> List[AgentHandoff]:
    """Convert input handoffs to internal format"""
    return [
        AgentHandoff(
            target_agent_id=h.target_agent_id,
            name=h.name,
            description=h.description,
            condition=h.condition
        )
        for h in handoffs
    ]


def _convert_guardrails(guardrails: List[GuardrailInput]) -> List[Guardrail]:
    """Convert input guardrails to internal format"""
    return [
        Guardrail(
            name=g.name,
            description=g.description,
            type=g.type,
            handler=None,  # Handlers are set up separately
            config=g.config or {}
        )
        for g in guardrails
    ]


# ============================================
# API Endpoints
# ============================================

@router.post("/create", response_model=CreateAgentResponse, status_code=201)
async def create_agent(request: CreateAgentRequest):
    """
    Create a new agent with SDK configuration.
    
    Supports both OpenAI Agents SDK and Gemini ADK providers.
    """
    try:
        orchestrator = get_orchestrator()
        provider = _get_provider_enum(request.provider)
        
        tools = _convert_tools(request.tools)
        handoffs = _convert_handoffs(request.handoffs)
        guardrails = _convert_guardrails(request.guardrails)
        
        agent_id = await orchestrator.create_agent(
            name=request.name,
            instructions=request.instructions,
            tools=tools,
            model=request.model,
            provider=provider,
            handoffs=handoffs,
            guardrails=guardrails
        )
        
        return CreateAgentResponse(
            agent_id=agent_id,
            name=request.name,
            provider=request.provider,
            model=request.model,
            tools_count=len(tools),
            handoffs_count=len(handoffs),
            guardrails_count=len(guardrails),
            created_at=datetime.now()
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create agent: {str(e)}")


@router.post("/{agent_id}/run", response_model=AgentResponseModel)
async def run_agent(agent_id: str, request: RunAgentRequest):
    """
    Execute an agent with the given input.
    
    Uses the provider that was specified during agent creation.
    Optionally supports A/B testing between providers.
    """
    try:
        orchestrator = get_orchestrator()
        
        result = await orchestrator.execute(
            agent_id=agent_id,
            input_text=request.input_text,
            context=request.context,
            ab_test_name=request.ab_test_name
        )
        
        return AgentResponseModel(
            content=result.content,
            tool_calls=result.tool_calls,
            usage=result.usage,
            provider=result.provider.value,
            metadata=result.metadata,
            trace_id=result.trace.trace_id if result.trace else None
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


@router.post("/{agent_id}/stream")
async def stream_agent(agent_id: str, request: RunAgentRequest):
    """
    Stream agent responses using Server-Sent Events (SSE).
    
    Returns real-time streaming updates including:
    - text: Text content chunks
    - tool_call: Tool invocation notifications
    - tool_result: Tool execution results
    - handoff: Agent handoff notifications
    - done: Stream completion signal
    - error: Error notifications
    """
    async def generate_sse():
        try:
            orchestrator = get_orchestrator()
            
            async for event in orchestrator.stream(
                agent_id=agent_id,
                input_text=request.input_text,
                context=request.context
            ):
                event_data = {
                    "type": event.type.value,
                    "content": event.content,
                    "metadata": event.metadata
                }
                
                if event.tool_name:
                    event_data["tool_name"] = event.tool_name
                if event.tool_call_id:
                    event_data["tool_call_id"] = event.tool_call_id
                if event.tool_arguments:
                    event_data["tool_arguments"] = event.tool_arguments
                if event.handoff_agent_id:
                    event_data["handoff_agent_id"] = event.handoff_agent_id
                
                yield f"data: {json.dumps(event_data)}\n\n"
                
                if event.type == StreamingEventType.DONE:
                    break
                if event.type == StreamingEventType.ERROR:
                    break
                    
        except Exception as e:
            error_data = {
                "type": "error",
                "content": str(e),
                "metadata": {"error": True}
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/{agent_id}/handoff", response_model=AgentResponseModel)
async def agent_handoff(agent_id: str, request: HandoffRequest):
    """
    Execute a handoff from one agent to another.
    
    Multi-agent workflow where the source agent delegates to a target agent.
    The handoff must be pre-configured during agent creation.
    """
    try:
        orchestrator = get_orchestrator()
        
        result = await orchestrator.handoff(
            agent_id=agent_id,
            target_agent_id=request.target_agent_id,
            input_text=request.input_text,
            context=request.context
        )
        
        return AgentResponseModel(
            content=result.content,
            tool_calls=result.tool_calls,
            usage=result.usage,
            provider=result.provider.value,
            metadata={
                **result.metadata,
                "handoff_result": result.handoff_result
            },
            trace_id=result.trace.trace_id if result.trace else None
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Handoff failed: {str(e)}")


@router.get("/{agent_id}/traces", response_model=List[TraceResponse])
async def get_agent_traces(
    agent_id: str,
    limit: int = Query(100, ge=1, le=1000, description="Maximum traces to return")
):
    """
    Get execution traces for an agent.
    
    Returns observability data including:
    - Trace and span IDs for distributed tracing
    - Operation names and timing
    - Status and error information
    - Custom metadata and events
    """
    try:
        orchestrator = get_orchestrator()
        
        traces = await orchestrator.get_traces(agent_id=agent_id, limit=limit)
        
        return [
            TraceResponse(
                trace_id=t.trace_id,
                span_id=t.span_id,
                parent_span_id=t.parent_span_id,
                operation=t.operation,
                start_time=t.start_time,
                end_time=t.end_time,
                status=t.status,
                latency_ms=(t.end_time - t.start_time) * 1000 if t.end_time else None,
                metadata=t.metadata,
                events=t.events
            )
            for t in traces
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get traces: {str(e)}")


@router.get("/metrics/summary", response_model=MetricsSummary)
async def get_metrics_summary(
    agent_id: Optional[str] = Query(None, description="Filter by agent ID"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    last_n: int = Query(100, ge=1, le=10000, description="Number of recent executions")
):
    """
    Get execution metrics summary.
    
    Returns aggregate statistics including:
    - Total execution count
    - Success rate
    - Average latency
    - Token usage
    - Breakdown by provider
    """
    try:
        orchestrator = get_orchestrator()
        
        provider_enum = _get_provider_enum(provider) if provider else None
        
        summary = orchestrator.get_metrics_summary(
            agent_id=agent_id,
            provider=provider_enum,
            last_n=last_n
        )
        
        return MetricsSummary(**summary)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")


@router.get("/ab-test/{test_name}")
async def get_ab_test_results(test_name: str):
    """
    Get A/B test results for a specific test.
    
    Returns statistics for both control and treatment groups including
    success rates, latencies, and token usage.
    """
    try:
        orchestrator = get_orchestrator()
        results = orchestrator.get_ab_test_results(test_name)
        
        if "error" in results:
            raise HTTPException(status_code=404, detail=results["error"])
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get A/B test results: {str(e)}")


@router.post("/ab-test/configure")
async def configure_ab_test(
    name: str = Query(..., description="Test name"),
    control_provider: str = Query(..., description="Control provider"),
    treatment_provider: str = Query(..., description="Treatment provider"),
    treatment_percentage: float = Query(50.0, ge=0, le=100, description="Treatment percentage")
):
    """
    Configure an A/B test between two providers.
    
    Allows comparing performance between providers like openai-agents and gemini-adk.
    """
    try:
        orchestrator = get_orchestrator()
        
        control = _get_provider_enum(control_provider)
        treatment = _get_provider_enum(treatment_provider)
        
        orchestrator.configure_ab_test(
            name=name,
            control_provider=control,
            treatment_provider=treatment,
            treatment_percentage=treatment_percentage
        )
        
        return {
            "status": "configured",
            "test_name": name,
            "control_provider": control_provider,
            "treatment_provider": treatment_provider,
            "treatment_percentage": treatment_percentage
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to configure A/B test: {str(e)}")


@router.delete("/ab-test/{test_name}")
async def disable_ab_test(test_name: str):
    """Disable an A/B test"""
    try:
        orchestrator = get_orchestrator()
        orchestrator.disable_ab_test(test_name)
        return {"status": "disabled", "test_name": test_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to disable A/B test: {str(e)}")


@router.get("/providers")
async def list_providers():
    """
    List available agent providers.
    
    Returns information about which providers are configured and available.
    """
    orchestrator = get_orchestrator()
    
    providers = []
    for provider_type, provider in orchestrator.providers.items():
        providers.append({
            "name": provider_type.value,
            "type": provider.__class__.__name__,
            "available": True
        })
    
    return {
        "providers": providers,
        "default": orchestrator.default_provider.value
    }
