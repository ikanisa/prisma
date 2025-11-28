"""
Learning API Endpoints
FastAPI routes for the agent learning system
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID
import json

from server.db import get_db
from server.security import get_current_user, require_role
from server.learning import (
    FeedbackCollector,
    PromptOptimizer,
    RAGTrainer,
    BehaviorLearner
)

router = APIRouter(prefix="/api/learning", tags=["learning"])


class FeedbackSubmission(BaseModel):
    execution_id: str
    agent_id: str
    feedback_type: str = Field(..., pattern="^(thumbs_up|thumbs_down|star_rating|detailed_feedback|correction|report_issue)$")
    rating: Optional[int] = Field(None, ge=1, le=5)
    feedback_text: Optional[str] = None
    correction_text: Optional[str] = None
    issue_categories: Optional[List[str]] = []
    dimensions: Optional[Dict[str, int]] = {}


class AnnotationSubmission(BaseModel):
    example_id: str
    approved: bool
    technical_accuracy: float = Field(..., ge=0, le=1)
    professional_quality: float = Field(..., ge=0, le=1)
    completeness: float = Field(..., ge=0, le=1)
    clarity: float = Field(..., ge=0, le=1)
    corrected_output: Optional[str] = None
    notes: Optional[str] = None
    improvement_suggestions: Optional[str] = None


class ExpertDemonstrationSubmission(BaseModel):
    agent_id: str
    task_description: str
    input_state: Dict[str, Any]
    actions: List[Dict[str, Any]]
    final_output: str
    reasoning: str


class PromptOptimizationRequest(BaseModel):
    agent_id: str
    current_prompt: str
    optimization_goals: List[str] = ["accuracy", "clarity", "completeness"]


@router.post("/feedback")
async def submit_feedback(
    feedback: FeedbackSubmission,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Submit user feedback on an agent execution."""
    try:
        collector = FeedbackCollector(db)
        
        feedback_id = await collector.submit_feedback(
            execution_id=feedback.execution_id,
            agent_id=feedback.agent_id,
            user_id=current_user['id'],
            feedback_type=feedback.feedback_type,
            rating=feedback.rating,
            feedback_text=feedback.feedback_text,
            correction_text=feedback.correction_text,
            issue_categories=feedback.issue_categories,
            dimensions=feedback.dimensions
        )
        
        return {
            "success": True,
            "feedback_id": feedback_id,
            "message": "Feedback submitted successfully"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit feedback: {str(e)}"
        )


@router.get("/feedback/stats/{agent_id}")
async def get_feedback_stats(
    agent_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get feedback statistics for an agent."""
    try:
        collector = FeedbackCollector(db)
        stats = await collector.get_feedback_stats(agent_id)
        return stats
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stats: {str(e)}"
        )


@router.get("/feedback/issues/{agent_id}")
async def get_common_issues(
    agent_id: str,
    limit: int = 10,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get most common issues for an agent."""
    try:
        collector = FeedbackCollector(db)
        issues = await collector.get_common_issues(agent_id, limit)
        return {"issues": issues}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch issues: {str(e)}"
        )


@router.get("/annotations/queue")
async def get_annotation_queue(
    domain: str = "all",
    agent: str = "all",
    limit: int = 50,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get learning examples pending annotation."""
    try:
        collector = FeedbackCollector(db)
        
        filters = {
            "domain": domain,
            "agent": agent
        }
        
        queue = await collector.get_annotation_queue(filters, limit)
        
        return {
            "queue": queue,
            "total": len(queue)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch annotation queue: {str(e)}"
        )


@router.post("/annotations")
async def submit_annotation(
    annotation: AnnotationSubmission,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Submit expert annotation for a learning example."""
    try:
        collector = FeedbackCollector(db)
        
        annotation_data = {
            "approved": annotation.approved,
            "technicalAccuracy": annotation.technical_accuracy,
            "professionalQuality": annotation.professional_quality,
            "completeness": annotation.completeness,
            "clarity": annotation.clarity,
            "correctedOutput": annotation.corrected_output,
            "notes": annotation.notes,
            "improvementSuggestions": annotation.improvement_suggestions
        }
        
        annotation_id = await collector.submit_annotation(
            example_id=annotation.example_id,
            expert_id=current_user['id'],
            annotation=annotation_data
        )
        
        return {
            "success": True,
            "annotation_id": annotation_id,
            "message": "Annotation submitted successfully"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit annotation: {str(e)}"
        )


@router.get("/stats")
async def get_learning_stats(
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get overall learning system statistics."""
    try:
        collector = FeedbackCollector(db)
        stats = await collector.get_learning_stats()
        return stats
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch learning stats: {str(e)}"
        )


@router.post("/demonstrations")
async def submit_demonstration(
    demonstration: ExpertDemonstrationSubmission,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
    llm_client=Depends(lambda: None)
):
    """Submit an expert demonstration for learning."""
    try:
        from server.learning import ExpertDemonstration
        
        learner = BehaviorLearner(demonstration.agent_id, db, llm_client)
        
        demo = ExpertDemonstration(
            task_description=demonstration.task_description,
            input_state=demonstration.input_state,
            actions=demonstration.actions,
            final_output=demonstration.final_output,
            reasoning=demonstration.reasoning,
            expert_id=current_user['id']
        )
        
        result = await learner.learn_from_demonstration(demo)
        
        return {
            "success": True,
            "result": result,
            "message": "Demonstration stored successfully"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store demonstration: {str(e)}"
        )


@router.post("/optimize-prompt")
async def optimize_prompt(
    request: PromptOptimizationRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user),
    llm_client=Depends(lambda: None)
):
    """Optimize an agent's prompt based on feedback."""
    try:
        optimizer = PromptOptimizer(request.agent_id, db, llm_client)
        
        examples_query = """
            SELECT input_text, input_context, expected_output, quality_score
            FROM learning_examples
            WHERE agent_id = $1
              AND review_status = 'approved'
              AND is_active = true
            ORDER BY quality_score DESC NULLS LAST
            LIMIT 100
        """
        
        results = await db.fetch(examples_query, request.agent_id)
        
        learning_examples = [
            {
                "input_text": r['input_text'],
                "input_context": r['input_context'],
                "expected_output": r['expected_output'],
                "quality_score": float(r['quality_score']) if r['quality_score'] else 0.5
            }
            for r in results
        ] if results else []
        
        optimization_result = await optimizer.optimize(
            current_prompt=request.current_prompt,
            learning_examples=learning_examples,
            optimization_goals=request.optimization_goals
        )
        
        return {
            "success": True,
            "best_variant": {
                "id": optimization_result.best_variant.id,
                "system_prompt": optimization_result.best_variant.system_prompt,
                "few_shot_examples": optimization_result.best_variant.few_shot_examples,
                "metadata": optimization_result.best_variant.metadata,
                "performance_metrics": optimization_result.best_variant.performance_metrics
            },
            "improvement_percentage": optimization_result.improvement_percentage,
            "metrics_comparison": optimization_result.metrics_comparison,
            "recommendations": optimization_result.recommendations
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to optimize prompt: {str(e)}"
        )


@router.get("/datasets/{agent_id}")
async def list_training_datasets(
    agent_id: str,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """List training datasets for an agent."""
    try:
        query = """
            SELECT 
                id, name, description, version, status,
                total_examples, avg_quality_score, created_at
            FROM training_datasets
            WHERE $1 = ANY(agent_ids::text[]::uuid[])
              AND status != 'archived'
            ORDER BY created_at DESC
        """
        
        results = await db.fetch(query, agent_id)
        
        datasets = [
            {
                "id": str(r['id']),
                "name": r['name'],
                "description": r['description'],
                "version": r['version'],
                "status": r['status'],
                "total_examples": r['total_examples'],
                "avg_quality_score": float(r['avg_quality_score']) if r['avg_quality_score'] else 0.0,
                "created_at": r['created_at'].isoformat() if r['created_at'] else None
            }
            for r in results
        ] if results else []
        
        return {"datasets": datasets}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch datasets: {str(e)}"
        )
