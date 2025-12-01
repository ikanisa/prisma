"""
Multi-Agent Collaboration API Endpoints
"""

from fastapi import APIRouter, HTTPException, status
from uuid import UUID
from typing import List, Optional, Dict, Any
from datetime import datetime
from server.collaboration import (
    collaboration_engine,
    CollaborationSession,
    CollaborationMode,
    TaskDelegation,
    ConsensusDecision,
    ConsensusVote
)

router = APIRouter(prefix="/api/v1/collaboration", tags=["collaboration"])


@router.post("/sessions", response_model=CollaborationSession, status_code=status.HTTP_201_CREATED)
async def create_session(
    name: str,
    mode: CollaborationMode,
    participating_agents: List[UUID],
    goal: str,
    lead_agent_id: Optional[UUID] = None
):
    """Create a new collaboration session."""
    session = await collaboration_engine.create_session(
        name=name,
        mode=mode,
        participating_agents=participating_agents,
        goal=goal,
        lead_agent_id=lead_agent_id
    )
    return session


@router.post("/sessions/{session_id}/execute")
async def execute_session(session_id: UUID, mode: Optional[CollaborationMode] = None):
    """Execute a collaboration session."""
    try:
        session = collaboration_engine.sessions.get(str(session_id))
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        execution_mode = mode or session.mode
        
        if execution_mode == CollaborationMode.SEQUENTIAL:
            results = await collaboration_engine.execute_sequential(session_id)
        elif execution_mode == CollaborationMode.PARALLEL:
            results = await collaboration_engine.execute_parallel(session_id)
        else:
            raise ValueError(f"Execution mode {execution_mode} not yet implemented")
        
        return results
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/delegations", response_model=TaskDelegation, status_code=status.HTTP_201_CREATED)
async def delegate_task(
    delegator_agent_id: UUID,
    delegate_agent_id: UUID,
    task_description: str,
    task_data: Dict[str, Any],
    priority: int = 5,
    deadline: Optional[datetime] = None
):
    """Delegate a task from one agent to another."""
    delegation = await collaboration_engine.delegate_task(
        delegator_agent_id=delegator_agent_id,
        delegate_agent_id=delegate_agent_id,
        task_description=task_description,
        task_data=task_data,
        priority=priority,
        deadline=deadline
    )
    return delegation


@router.post("/delegations/{delegation_id}/complete")
async def complete_delegation(delegation_id: UUID, result: Dict[str, Any]):
    """Complete a delegated task."""
    try:
        await collaboration_engine.complete_delegation(delegation_id, result)
        return {"status": "completed", "delegation_id": str(delegation_id)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/consensus", response_model=ConsensusDecision, status_code=status.HTTP_201_CREATED)
async def initiate_consensus(
    session_id: UUID,
    topic: str,
    data: Dict[str, Any],
    threshold: float = 0.67
):
    """Initiate a consensus decision among agents."""
    try:
        decision = await collaboration_engine.initiate_consensus(
            session_id=session_id,
            topic=topic,
            data=data,
            threshold=threshold
        )
        return decision
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/consensus/{decision_id}/vote", response_model=ConsensusVote)
async def cast_vote(
    decision_id: UUID,
    agent_id: UUID,
    vote: str,
    confidence: float,
    rationale: Optional[str] = None
):
    """Cast a vote in a consensus decision."""
    try:
        vote_obj = await collaboration_engine.cast_vote(
            decision_id=decision_id,
            agent_id=agent_id,
            vote=vote,
            confidence=confidence,
            rationale=rationale
        )
        return vote_obj
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/consensus/{decision_id}", response_model=ConsensusDecision)
async def get_consensus_decision(decision_id: UUID):
    """Get consensus decision status."""
    decision = collaboration_engine.consensus_decisions.get(str(decision_id))
    if not decision:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                          detail=f"Decision {decision_id} not found")
    return decision
