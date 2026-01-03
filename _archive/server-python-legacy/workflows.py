"""
Workflow Orchestration Engine

Enables multi-step workflows with conditional branching, parallel execution,
and human-in-the-loop (HITL) approval steps.
"""

from typing import List, Dict, Optional, Any, Callable
from datetime import datetime
from uuid import UUID, uuid4
from pydantic import BaseModel, Field
from enum import Enum
import asyncio


class WorkflowStepType(str, Enum):
    """Types of workflow steps."""
    AGENT = "agent"  # Execute an agent
    CONDITION = "condition"  # Conditional branch
    PARALLEL = "parallel"  # Parallel execution
    APPROVAL = "approval"  # Human approval required
    TRANSFORM = "transform"  # Data transformation
    API_CALL = "api_call"  # External API call


class WorkflowStatus(str, Enum):
    """Workflow execution status."""
    DRAFT = "draft"
    RUNNING = "running"
    WAITING_APPROVAL = "waiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class WorkflowStepDefinition(BaseModel):
    """Definition of a workflow step."""
    id: str
    name: str
    type: WorkflowStepType
    config: Dict[str, Any] = Field(default_factory=dict)
    next_step_id: Optional[str] = None
    condition: Optional[str] = None  # For conditional branching
    parallel_steps: List[str] = Field(default_factory=list)  # For parallel execution
    timeout_seconds: int = 300
    retry_count: int = 3


class WorkflowDefinition(BaseModel):
    """Complete workflow definition."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: Optional[str] = None
    organization_id: UUID
    steps: List[WorkflowStepDefinition]
    start_step_id: str
    created_by: UUID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    tags: List[str] = Field(default_factory=list)


class WorkflowStepExecution(BaseModel):
    """Record of a step execution."""
    id: UUID = Field(default_factory=uuid4)
    workflow_execution_id: UUID
    step_id: str
    status: str = "pending"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    input_data: Dict[str, Any] = Field(default_factory=dict)
    output_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    retry_count: int = 0


class WorkflowExecution(BaseModel):
    """Record of a workflow execution."""
    id: UUID = Field(default_factory=uuid4)
    workflow_id: UUID
    status: WorkflowStatus = WorkflowStatus.RUNNING
    current_step_id: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    initiated_by: UUID
    context: Dict[str, Any] = Field(default_factory=dict)
    step_executions: List[WorkflowStepExecution] = Field(default_factory=list)


class ApprovalRequest(BaseModel):
    """Human approval request."""
    id: UUID = Field(default_factory=uuid4)
    workflow_execution_id: UUID
    step_id: str
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    approver_id: Optional[UUID] = None
    approved: Optional[bool] = None
    comments: Optional[str] = None
    data_to_approve: Dict[str, Any] = Field(default_factory=dict)


class WorkflowOrchestrator:
    """
    Workflow orchestration engine.
    
    Features:
    - Multi-step execution
    - Conditional branching
    - Parallel execution
    - HITL approvals
    - Error handling & retries
    """
    
    def __init__(self):
        self.workflows: Dict[str, WorkflowDefinition] = {}
        self.executions: Dict[str, WorkflowExecution] = {}
        self.approvals: Dict[str, ApprovalRequest] = {}
        self.step_handlers: Dict[WorkflowStepType, Callable] = {}
        
        # Register default step handlers
        self._register_default_handlers()
    
    def _register_default_handlers(self):
        """Register default step execution handlers."""
        self.step_handlers[WorkflowStepType.AGENT] = self._execute_agent_step
        self.step_handlers[WorkflowStepType.TRANSFORM] = self._execute_transform_step
        self.step_handlers[WorkflowStepType.APPROVAL] = self._execute_approval_step
        self.step_handlers[WorkflowStepType.CONDITION] = self._execute_condition_step
        self.step_handlers[WorkflowStepType.PARALLEL] = self._execute_parallel_step
    
    async def create_workflow(
        self,
        name: str,
        organization_id: UUID,
        steps: List[WorkflowStepDefinition],
        start_step_id: str,
        created_by: UUID,
        description: Optional[str] = None
    ) -> WorkflowDefinition:
        """
        Create a new workflow definition.
        
        Args:
            name: Workflow name
            organization_id: Organization UUID
            steps: List of step definitions
            start_step_id: ID of first step
            created_by: Creator UUID
            description: Optional description
        
        Returns:
            Created workflow definition
        """
        workflow = WorkflowDefinition(
            name=name,
            description=description,
            organization_id=organization_id,
            steps=steps,
            start_step_id=start_step_id,
            created_by=created_by
        )
        
        self.workflows[str(workflow.id)] = workflow
        return workflow
    
    async def execute_workflow(
        self,
        workflow_id: UUID,
        initiated_by: UUID,
        context: Optional[Dict[str, Any]] = None
    ) -> WorkflowExecution:
        """
        Start workflow execution.
        
        Args:
            workflow_id: Workflow UUID
            initiated_by: User UUID
            context: Optional initial context data
        
        Returns:
            Workflow execution record
        """
        workflow = self.workflows.get(str(workflow_id))
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        if not workflow.is_active:
            raise ValueError(f"Workflow {workflow_id} is inactive")
        
        # Create execution record
        execution = WorkflowExecution(
            workflow_id=workflow_id,
            initiated_by=initiated_by,
            context=context or {},
            current_step_id=workflow.start_step_id
        )
        
        self.executions[str(execution.id)] = execution
        
        # Start execution asynchronously
        asyncio.create_task(self._run_workflow(execution, workflow))
        
        return execution
    
    async def _run_workflow(
        self,
        execution: WorkflowExecution,
        workflow: WorkflowDefinition
    ):
        """Execute workflow steps."""
        current_step_id = workflow.start_step_id
        
        while current_step_id:
            step = next((s for s in workflow.steps if s.id == current_step_id), None)
            if not step:
                execution.status = WorkflowStatus.FAILED
                break
            
            try:
                # Execute step
                step_result = await self._execute_step(execution, step, workflow)
                
                # Check if waiting for approval
                if step_result.get("waiting_approval"):
                    execution.status = WorkflowStatus.WAITING_APPROVAL
                    execution.current_step_id = current_step_id
                    return
                
                # Determine next step
                if step.type == WorkflowStepType.CONDITION:
                    current_step_id = step_result.get("next_step_id")
                else:
                    current_step_id = step.next_step_id
                
            except Exception as e:
                # Handle step failure
                execution.status = WorkflowStatus.FAILED
                execution.completed_at = datetime.utcnow()
                raise
        
        # Workflow completed
        execution.status = WorkflowStatus.COMPLETED
        execution.completed_at = datetime.utcnow()
    
    async def _execute_step(
        self,
        execution: WorkflowExecution,
        step: WorkflowStepDefinition,
        workflow: WorkflowDefinition
    ) -> Dict[str, Any]:
        """Execute a single workflow step."""
        # Create step execution record
        step_execution = WorkflowStepExecution(
            workflow_execution_id=execution.id,
            step_id=step.id,
            input_data=execution.context.copy(),
            started_at=datetime.utcnow()
        )
        
        execution.step_executions.append(step_execution)
        
        # Get handler for step type
        handler = self.step_handlers.get(step.type)
        if not handler:
            raise ValueError(f"No handler for step type {step.type}")
        
        # Execute step with retry logic
        retry_count = 0
        last_error = None
        
        while retry_count <= step.retry_count:
            try:
                result = await handler(execution, step, step_execution)
                
                step_execution.status = "completed"
                step_execution.completed_at = datetime.utcnow()
                step_execution.output_data = result
                
                # Update execution context
                if result and isinstance(result, dict):
                    execution.context.update(result)
                
                return result
                
            except Exception as e:
                last_error = str(e)
                retry_count += 1
                step_execution.retry_count = retry_count
                
                if retry_count <= step.retry_count:
                    await asyncio.sleep(2 ** retry_count)  # Exponential backoff
        
        # All retries failed
        step_execution.status = "failed"
        step_execution.error = last_error
        step_execution.completed_at = datetime.utcnow()
        raise Exception(f"Step {step.id} failed after {retry_count} retries: {last_error}")
    
    async def _execute_agent_step(
        self,
        execution: WorkflowExecution,
        step: WorkflowStepDefinition,
        step_execution: WorkflowStepExecution
    ) -> Dict[str, Any]:
        """Execute an agent step."""
        agent_id = step.config.get("agent_id")
        input_prompt = step.config.get("prompt_template", "").format(**execution.context)
        
        # Simulate agent execution (in production, call actual agent)
        await asyncio.sleep(1)
        
        return {
            "agent_response": f"Executed agent {agent_id} with prompt: {input_prompt[:50]}...",
            "agent_id": agent_id
        }
    
    async def _execute_transform_step(
        self,
        execution: WorkflowExecution,
        step: WorkflowStepDefinition,
        step_execution: WorkflowStepExecution
    ) -> Dict[str, Any]:
        """Execute a data transformation step."""
        transform_type = step.config.get("transform_type")
        
        # Apply transformation based on type
        if transform_type == "extract":
            field = step.config.get("field")
            return {f"extracted_{field}": execution.context.get(field)}
        elif transform_type == "format":
            template = step.config.get("template", "")
            return {"formatted_output": template.format(**execution.context)}
        
        return {}
    
    async def _execute_approval_step(
        self,
        execution: WorkflowExecution,
        step: WorkflowStepDefinition,
        step_execution: WorkflowStepExecution
    ) -> Dict[str, Any]:
        """Execute an approval step (creates approval request)."""
        approval = ApprovalRequest(
            workflow_execution_id=execution.id,
            step_id=step.id,
            data_to_approve=execution.context.copy()
        )
        
        self.approvals[str(approval.id)] = approval
        
        return {"waiting_approval": True, "approval_id": str(approval.id)}
    
    async def _execute_condition_step(
        self,
        execution: WorkflowExecution,
        step: WorkflowStepDefinition,
        step_execution: WorkflowStepExecution
    ) -> Dict[str, Any]:
        """Execute a conditional branching step."""
        condition = step.condition or ""
        
        # Evaluate condition (simplified - in production use safe eval)
        context_vars = execution.context
        
        # Simple condition evaluation
        if "==" in condition:
            parts = condition.split("==")
            field = parts[0].strip()
            value = parts[1].strip().strip("'\"")
            condition_met = str(context_vars.get(field)) == value
        else:
            condition_met = False
        
        # Return next step based on condition
        if condition_met:
            next_step_id = step.config.get("true_step_id")
        else:
            next_step_id = step.config.get("false_step_id")
        
        return {"next_step_id": next_step_id, "condition_met": condition_met}
    
    async def _execute_parallel_step(
        self,
        execution: WorkflowExecution,
        step: WorkflowStepDefinition,
        step_execution: WorkflowStepExecution
    ) -> Dict[str, Any]:
        """Execute parallel steps."""
        # Execute all parallel steps concurrently
        tasks = []
        for parallel_step_id in step.parallel_steps:
            parallel_step = next((s for s in self.workflows[str(execution.workflow_id)].steps 
                                 if s.id == parallel_step_id), None)
            if parallel_step:
                task = self._execute_step(execution, parallel_step, 
                                         self.workflows[str(execution.workflow_id)])
                tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return {"parallel_results": results}
    
    async def approve_step(
        self,
        approval_id: UUID,
        approver_id: UUID,
        approved: bool,
        comments: Optional[str] = None
    ):
        """
        Approve or reject an approval step.
        
        Args:
            approval_id: Approval request UUID
            approver_id: Approver UUID
            approved: True to approve, False to reject
            comments: Optional approval comments
        """
        approval = self.approvals.get(str(approval_id))
        if not approval:
            raise ValueError(f"Approval {approval_id} not found")
        
        approval.approved_at = datetime.utcnow()
        approval.approver_id = approver_id
        approval.approved = approved
        approval.comments = comments
        
        # Resume workflow execution
        execution = self.executions.get(str(approval.workflow_execution_id))
        if execution and execution.status == WorkflowStatus.WAITING_APPROVAL:
            if approved:
                # Continue workflow
                workflow = self.workflows.get(str(execution.workflow_id))
                if workflow:
                    asyncio.create_task(self._run_workflow(execution, workflow))
            else:
                # Reject workflow
                execution.status = WorkflowStatus.CANCELLED
                execution.completed_at = datetime.utcnow()
    
    async def get_execution_status(
        self,
        execution_id: UUID
    ) -> WorkflowExecution:
        """Get workflow execution status."""
        execution = self.executions.get(str(execution_id))
        if not execution:
            raise ValueError(f"Execution {execution_id} not found")
        return execution


# Global workflow orchestrator instance
workflow_orchestrator = WorkflowOrchestrator()
