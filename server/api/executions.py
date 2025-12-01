"""
Agent Execution API Endpoints

Handles execution of AI agents and retrieval of execution history.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum
import structlog

from server.repositories.agent_repository import get_agent_repository
from server.repositories.execution_repository import get_execution_repository

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/executions", tags=["executions"])


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExecuteAgentRequest(BaseModel):
    query: str = Field(..., description="User query/prompt for the agent")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context data")
    stream: bool = Field(False, description="Whether to stream the response")
    user_id: Optional[UUID] = Field(None, description="User making the request")


class ExecutionResponse(BaseModel):
    id: UUID
    agent_slug: str
    user_id: Optional[UUID]
    status: ExecutionStatus
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    tokens_used: Optional[int]
    cost_usd: Optional[float]
    duration_ms: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]
    error_message: Optional[str]


class ExecutionListResponse(BaseModel):
    executions: List[ExecutionResponse]
    total: int
    page: int
    page_size: int


class ExecutionFeedback(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating 1-5")
    feedback: Optional[str] = Field(None, description="Optional feedback text")


# Repository instances
agent_repo = get_agent_repository()
execution_repo = get_execution_repository()


@router.post("/{slug}/execute", response_model=ExecutionResponse, status_code=202)
async def execute_agent(
    slug: str,
    request: ExecuteAgentRequest,
    background_tasks: BackgroundTasks
):
    """
    Execute an AI agent with the given query.
    
    Process:
    1. Validate agent exists and is active
    2. Create execution record in database
    3. Execute agent asynchronously with real OpenAI
    4. Return execution ID immediately (202 Accepted)
    5. Client can poll for results or use streaming
    
    For synchronous execution, use stream=false and poll the
    GET /api/executions/{id} endpoint.
    
    For streaming, use stream=true and connect to the SSE endpoint.
    """
    # Validate agent exists in database
    agent = await agent_repo.get_agent_by_slug(slug)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {slug}")
    
    if not agent.get("is_active", True):
        raise HTTPException(status_code=400, detail=f"Agent is not active: {slug}")
    
    # Create execution record in database
    execution_data = {
        "agent_id": agent["id"],
        "query": request.query,
        "context": request.context or {},
        "status": ExecutionStatus.PENDING.value,
        "user_id": str(request.user_id) if request.user_id else None
    }
    
    execution = await execution_repo.create_execution(execution_data)
    execution_id = UUID(execution["id"])
    
    # Schedule async execution
    background_tasks.add_task(_execute_agent_async, execution_id, slug, request)
    
    # Return response
    return ExecutionResponse(
        id=execution_id,
        agent_slug=slug,
        user_id=request.user_id,
        status=ExecutionStatus.PENDING,
        input_data={"query": request.query, "context": request.context or {}},
        output_data=None,
        tokens_used=None,
        cost_usd=None,
        duration_ms=None,
        created_at=datetime.fromisoformat(execution["created_at"]),
        completed_at=None,
        error_message=None
    )


async def _execute_agent_async(execution_id: UUID, slug: str, request: ExecuteAgentRequest):
    """
    Background task to actually execute the agent with real OpenAI.
    
    This will:
    1. Update execution status to running
    2. Get OpenAI service
    3. Execute agent with real OpenAI API
    4. Store results in database
    5. Update execution record with results or error
    """
    from server.services.openai_service import get_openai_service, AgentExecutionConfig
    
    try:
        # Update status to running
        await execution_repo.update_execution_status(
            str(execution_id),
            status=ExecutionStatus.RUNNING.value
        )
        
        logger.info("execution_started", execution_id=str(execution_id), slug=slug)
        
        # Get OpenAI service
        openai_service = get_openai_service()
        
        # Configure execution
        config = AgentExecutionConfig(
            model="gpt-4o-mini",  # Use mini for cost efficiency
            temperature=0.7,
            max_tokens=2000,
            stream=request.stream
        )
        
        # Execute agent with real OpenAI
        result = await openai_service.execute_agent(
            agent_slug=slug,
            query=request.query,
            context=request.context,
            config=config
        )
        
        # Build output
        output = {
            "answer": result.answer,
            "sources": result.sources or [],
            "confidence": result.confidence or 0.0,
            "warnings": result.warnings or [],
            "recommendations": result.recommendations or [],
            "model": result.model,
            "finish_reason": result.finish_reason
        }
        
        # Update execution with real results in database
        await execution_repo.update_execution_status(
            str(execution_id),
            status=ExecutionStatus.COMPLETED.value,
            result=output,
            metrics={
                "tokens_used": result.tokens_used,
                "cost_usd": result.cost_usd,
                "duration_ms": result.duration_ms
            }
        )
        
        logger.info(
            "execution_completed",
            execution_id=str(execution_id),
            tokens=result.tokens_used,
            cost=result.cost_usd
        )
        
    except Exception as e:
        # Update execution with error in database
        await execution_repo.update_execution_status(
            str(execution_id),
            status=ExecutionStatus.FAILED.value,
            error=str(e)
        )
        
        logger.error(
            "execution_failed",
            execution_id=str(execution_id),
            error=str(e),
            exc_info=True
        )


@router.get("", response_model=ExecutionListResponse)
async def list_executions(
    agent_slug: Optional[str] = None,
    user_id: Optional[UUID] = None,
    status: Optional[ExecutionStatus] = None,
    page: int = 1,
    page_size: int = 50
):
    """
    List agent executions with optional filters.
    
    Supports filtering by:
    - Agent slug
    - User ID
    - Execution status
    
    Returns paginated results with total count.
    """
    # Get agent ID if slug provided
    agent_id = None
    if agent_slug:
        agent = await agent_repo.get_agent_by_slug(agent_slug)
        if agent:
            agent_id = agent["id"]
    
    # Calculate offset
    offset = (page - 1) * page_size
    
    # Fetch executions from database
    if agent_id:
        executions = await execution_repo.get_executions_by_agent(
            agent_id=agent_id,
            status=status.value if status else None,
            limit=page_size,
            offset=offset
        )
    else:
        executions = await execution_repo.get_recent_executions(
            limit=page_size,
            status=status.value if status else None
        )
    
    # Convert to response models
    execution_responses = []
    for exe in executions:
        # Get agent to get slug
        agent = await agent_repo.get_agent_by_id(exe["agent_id"])
        
        execution_responses.append(ExecutionResponse(
            id=UUID(exe["id"]),
            agent_slug=agent["slug"] if agent else "unknown",
            user_id=UUID(exe["user_id"]) if exe.get("user_id") else None,
            status=ExecutionStatus(exe["status"]),
            input_data={"query": exe["query"], "context": exe.get("context", {})},
            output_data=exe.get("result"),
            tokens_used=exe.get("tokens_used"),
            cost_usd=exe.get("cost_usd"),
            duration_ms=exe.get("duration_ms"),
            created_at=datetime.fromisoformat(exe["created_at"]),
            completed_at=datetime.fromisoformat(exe["completed_at"]) if exe.get("completed_at") else None,
            error_message=exe.get("error")
        ))
    
    return ExecutionListResponse(
        executions=execution_responses,
        total=len(execution_responses),  # TODO: Get actual total count
        page=page,
        page_size=page_size
    )


@router.get("/{execution_id}", response_model=ExecutionResponse)
async def get_execution(execution_id: UUID):
    """
    Get execution details by ID.
    
    Returns complete execution information including:
    - Input/output data
    - Status and timing
    - Token usage and cost
    - Error messages (if failed)
    
    Use for polling execution status after submitting via execute endpoint.
    """
    # Fetch from database
    execution = await execution_repo.get_execution_by_id(str(execution_id))
    
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # Get agent to get slug
    agent = await agent_repo.get_agent_by_id(execution["agent_id"])
    
    return ExecutionResponse(
        id=UUID(execution["id"]),
        agent_slug=agent["slug"] if agent else "unknown",
        user_id=UUID(execution["user_id"]) if execution.get("user_id") else None,
        status=ExecutionStatus(execution["status"]),
        input_data={"query": execution["query"], "context": execution.get("context", {})},
        output_data=execution.get("result"),
        tokens_used=execution.get("tokens_used"),
        cost_usd=execution.get("cost_usd"),
        duration_ms=execution.get("duration_ms"),
        created_at=datetime.fromisoformat(execution["created_at"]),
        completed_at=datetime.fromisoformat(execution["completed_at"]) if execution.get("completed_at") else None,
        error_message=execution.get("error")
    )


@router.post("/{execution_id}/cancel", status_code=200)
async def cancel_execution(execution_id: UUID):
    """
    Cancel a running or pending execution.
    
    Only executions in PENDING or RUNNING status can be cancelled.
    """
    # Get execution from database
    execution = await execution_repo.get_execution_by_id(str(execution_id))
    
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    if execution["status"] not in [ExecutionStatus.PENDING.value, ExecutionStatus.RUNNING.value]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel execution in {execution['status']} status"
        )
    
    # Update status to cancelled
    await execution_repo.update_execution_status(
        str(execution_id),
        status=ExecutionStatus.CANCELLED.value
    )
    
    return {"message": "Execution cancelled successfully"}


@router.post("/{execution_id}/feedback")
async def submit_feedback(
    execution_id: UUID,
    payload: ExecutionFeedback,
):
    """
    Submit user feedback for an execution.
    
    Used for:
    - Agent learning and improvement
    - Quality monitoring
    - User satisfaction tracking
    
    Feedback is stored in agent_learning_examples table.
    """
    # TODO: Insert into agent_learning_examples
    # INSERT INTO agent_learning_examples (execution_id, rating, feedback, ...)
    
    if execution_id not in _executions_db:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    return {
        "message": "Feedback submitted successfully",
        "execution_id": execution_id,
        "rating": payload.rating
    }


@router.get("/analytics/summary")
async def get_execution_analytics(
    agent_slug: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """
    Get execution analytics and statistics.
    
    Returns:
    - Total executions
    - Success rate
    - Average response time
    - Total cost
    - Token usage
    - Error breakdown
    
    Useful for monitoring agent performance and cost.
    """
    # TODO: Query from analytics views
    # SELECT * FROM agent_execution_analytics WHERE ...
    
    executions = list(_executions_db.values())
    
    if agent_slug:
        executions = [e for e in executions if e["agent_slug"] == agent_slug]
    
    total = len(executions)
    completed = len([e for e in executions if e["status"] == ExecutionStatus.COMPLETED])
    failed = len([e for e in executions if e["status"] == ExecutionStatus.FAILED])
    
    success_rate = (completed / total * 100) if total > 0 else 0
    
    avg_duration = sum(
        e.get("duration_ms", 0) for e in executions if e.get("duration_ms")
    ) / max(completed, 1)
    
    total_cost = sum(
        e.get("cost_usd", 0) for e in executions if e.get("cost_usd")
    )
    
    total_tokens = sum(
        e.get("tokens_used", 0) for e in executions if e.get("tokens_used")
    )
    
    return {
        "total_executions": total,
        "completed": completed,
        "failed": failed,
        "success_rate": round(success_rate, 2),
        "avg_duration_ms": round(avg_duration, 0),
        "total_cost_usd": round(total_cost, 4),
        "total_tokens": total_tokens,
        "agent_slug": agent_slug
    }


@router.post("/{slug}/execute/stream")
async def execute_agent_streaming(
    slug: str,
    request: ExecuteAgentRequest
):
    """
    Execute an AI agent with streaming response (Server-Sent Events).
    
    Returns a stream of response chunks as they arrive from OpenAI.
    Useful for real-time UI updates.
    
    Connect using EventSource in JavaScript:
    ```javascript
    const source = new EventSource('/api/executions/tax-corp-eu-022/execute/stream');
    source.onmessage = (event) => {
        console.log(event.data);
    };
    ```
    """
    from server.services.openai_service import get_openai_service, AgentExecutionConfig
    
    # Validate agent exists
    valid_agents = [
        "tax-corp-eu-022", "tax-corp-us-023", "tax-corp-uk-024",
        "tax-corp-ca-025", "tax-corp-mt-026", "tax-corp-rw-027",
        "tax-vat-028", "tax-tp-029", "tax-personal-030",
        "tax-provision-031", "tax-contro-032", "tax-research-033"
    ]
    
    if slug not in valid_agents:
        raise HTTPException(status_code=404, detail=f"Agent not found: {slug}")
    
    async def generate():
        """Generate SSE stream"""
        try:
            openai_service = get_openai_service()
            config = AgentExecutionConfig(
                model="gpt-4o-mini",
                temperature=0.7,
                max_tokens=2000,
                stream=True
            )
            
            async for chunk in openai_service.execute_agent_streaming(
                agent_slug=slug,
                query=request.query,
                context=request.context,
                config=config
            ):
                # Send as Server-Sent Event
                yield f"data: {chunk}\n\n"
            
            # Send completion marker
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
