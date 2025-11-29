"""
Workflow Orchestration API Endpoints
"""

from fastapi import APIRouter, HTTPException, status
from uuid import UUID
from typing import List, Optional, Dict, Any
from server.workflows import (
    workflow_orchestrator,
    WorkflowDefinition,
    WorkflowStepDefinition,
    WorkflowExecution,
    WorkflowStatus
)

router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])


@router.post("", response_model=WorkflowDefinition, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    name: str,
    organization_id: UUID,
    steps: List[WorkflowStepDefinition],
    start_step_id: str,
    created_by: UUID,
    description: Optional[str] = None
):
    """Create a new workflow definition."""
    workflow = await workflow_orchestrator.create_workflow(
        name=name,
        organization_id=organization_id,
        steps=steps,
        start_step_id=start_step_id,
        created_by=created_by,
        description=description
    )
    return workflow


@router.post("/{workflow_id}/execute", response_model=WorkflowExecution)
async def execute_workflow(
    workflow_id: UUID,
    initiated_by: UUID,
    context: Optional[Dict[str, Any]] = None
):
    """Execute a workflow."""
    try:
        execution = await workflow_orchestrator.execute_workflow(
            workflow_id=workflow_id,
            initiated_by=initiated_by,
            context=context
        )
        return execution
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/executions/{execution_id}", response_model=WorkflowExecution)
async def get_execution_status(execution_id: UUID):
    """Get workflow execution status."""
    try:
        execution = await workflow_orchestrator.get_execution_status(execution_id)
        return execution
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/approvals/{approval_id}/approve")
async def approve_workflow_step(
    approval_id: UUID,
    approver_id: UUID,
    approved: bool,
    comments: Optional[str] = None
):
    """Approve or reject a workflow approval step."""
    try:
        await workflow_orchestrator.approve_step(
            approval_id=approval_id,
            approver_id=approver_id,
            approved=approved,
            comments=comments
        )
        return {"status": "processed", "approved": approved}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
