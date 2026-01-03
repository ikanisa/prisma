"""
Learning System API Endpoints
"""

from fastapi import APIRouter, HTTPException, status
from uuid import UUID
from typing import List, Optional
from server.learning import (
    learning_engine,
    LearningExampleCreate,
    LearningExample,
    FeedbackType,
    PerformanceMetrics,
    TrainingSession
)

router = APIRouter(prefix="/api/v1/learning", tags=["learning"])


@router.post("/feedback", response_model=LearningExample, status_code=status.HTTP_201_CREATED)
async def add_feedback(data: LearningExampleCreate):
    """Add feedback for agent learning."""
    example = await learning_engine.add_feedback(
        agent_id=data.agent_id,
        user_input=data.user_input,
        agent_response=data.agent_response,
        feedback_type=data.feedback_type,
        feedback_text=data.feedback_text,
        expected_response=data.expected_response,
        context=data.context
    )
    return example


@router.get("/examples/{agent_id}", response_model=List[LearningExample])
async def get_training_examples(
    agent_id: UUID,
    limit: int = 100,
    feedback_type: Optional[FeedbackType] = None
):
    """Get training examples for an agent."""
    examples = await learning_engine.get_training_examples(
        agent_id=agent_id,
        limit=limit,
        feedback_type=feedback_type
    )
    return examples


@router.post("/train/{agent_id}", response_model=TrainingSession)
async def train_agent(agent_id: UUID, force: bool = False):
    """Train an agent using accumulated examples."""
    try:
        session = await learning_engine.train_agent(agent_id=agent_id, force=force)
        return session
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/metrics/{agent_id}", response_model=PerformanceMetrics)
async def get_performance_metrics(agent_id: UUID):
    """Get performance metrics for an agent."""
    metrics = await learning_engine.get_performance_metrics(agent_id=agent_id)
    return metrics


@router.get("/insights/{agent_id}")
async def get_learning_insights(agent_id: UUID):
    """Get learning insights and recommendations for an agent."""
    insights = await learning_engine.get_learning_insights(agent_id=agent_id)
    return insights
