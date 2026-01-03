"""
Learning API Routes
Handles feedback collection, annotation, training, and experiments
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import uuid

from server.db import get_db
from server.auth import get_current_user
from server.learning.feedback_collector import FeedbackCollector
from server.learning.prompt_optimizer import PromptOptimizer
from server.learning.rag_trainer import RAGTrainer
from server.learning.behavior_learner import BehaviorLearner

router = APIRouter(prefix="/api/learning", tags=["learning"])


# ============================================
# REQUEST MODELS
# ============================================

class FeedbackSubmission(BaseModel):
    executionId: str
    agentId: str
    feedbackType: str
    rating: Optional[int] = None
    feedbackText: Optional[str] = None
    correctionText: Optional[str] = None
    issueCategories: List[str] = []
    dimensions: Optional[Dict[str, int]] = None


class AnnotationSubmission(BaseModel):
    exampleId: str
    annotation: Dict[str, Any]


class TrainingRequest(BaseModel):
    agentId: str
    datasetId: str
    trainingType: str
    config: Dict[str, Any]
    hyperparameters: Optional[Dict[str, Any]] = None


class ExperimentRequest(BaseModel):
    agentId: str
    name: str
    description: str
    hypothesis: str
    controlConfig: Dict[str, Any]
    treatmentConfig: Dict[str, Any]
    controlPercentage: int = 50
    treatmentPercentage: int = 50


# ============================================
# FEEDBACK ROUTES
# ============================================

@router.post("/feedback")
async def submit_feedback(
    submission: FeedbackSubmission,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Submit user feedback on agent execution"""
    collector = FeedbackCollector(db)
    
    feedback_id = await collector.collect_feedback(
        execution_id=submission.executionId,
        agent_id=submission.agentId,
        user_id=current_user['id'],
        feedback_type=submission.feedbackType,
        rating=submission.rating,
        feedback_text=submission.feedbackText,
        correction_text=submission.correctionText,
        issue_categories=submission.issueCategories,
        dimensions=submission.dimensions
    )
    
    return {"id": feedback_id, "status": "recorded"}


@router.get("/stats")
async def get_learning_stats(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get learning system statistics"""
    stats = await db.fetchrow("""
        SELECT 
            (SELECT COUNT(*) FROM learning_examples WHERE review_status = 'pending') as pending_annotations,
            (SELECT COUNT(*) FROM expert_annotations WHERE created_at::date = CURRENT_DATE) as annotated_today,
            (SELECT COUNT(*) FROM training_runs WHERE status = 'running') as active_training_runs,
            (SELECT COUNT(*) FROM learning_experiments WHERE status = 'running') as active_experiments
    """)
    
    return dict(stats)


# ============================================
# ANNOTATION ROUTES
# ============================================

@router.get("/annotation/queue")
async def get_annotation_queue(
    domain: Optional[str] = None,
    agent: Optional[str] = None,
    status: str = 'pending',
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get queue of examples needing annotation"""
    query = """
        SELECT 
            le.*,
            u.name as source_user_name,
            COUNT(ea.id) as annotation_count
        FROM learning_examples le
        LEFT JOIN users u ON le.source_user_id = u.id
        LEFT JOIN expert_annotations ea ON le.id = ea.learning_example_id
        WHERE le.review_status = $1
    """
    params = [status]
    
    if domain and domain != 'all':
        query += f" AND le.domain = ${len(params) + 1}"
        params.append(domain)
    
    if agent and agent != 'all':
        query += f" AND le.agent_id = ${len(params) + 1}"
        params.append(agent)
    
    query += """
        GROUP BY le.id, u.name
        ORDER BY le.created_at ASC
        LIMIT 50
    """
    
    examples = await db.fetch(query, *params)
    return [dict(ex) for ex in examples]


@router.post("/annotation")
async def submit_annotation(
    submission: AnnotationSubmission,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Submit expert annotation for a learning example"""
    annotation = submission.annotation
    
    # Store annotation
    annotation_id = await db.fetchval("""
        INSERT INTO expert_annotations (
            learning_example_id,
            expert_id,
            annotation_type,
            annotation_data,
            technical_accuracy,
            professional_quality,
            completeness,
            clarity,
            notes,
            is_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
    """,
        submission.exampleId,
        current_user['id'],
        'quality_assessment',
        {
            'corrected_output': annotation.get('correctedOutput'),
            'improvement_suggestions': annotation.get('improvementSuggestions')
        },
        annotation.get('technicalAccuracy'),
        annotation.get('professionalQuality'),
        annotation.get('completeness'),
        annotation.get('clarity'),
        annotation.get('notes'),
        annotation.get('approved', False)
    )
    
    # Update learning example status
    new_status = 'approved' if annotation.get('approved') else 'rejected'
    await db.execute("""
        UPDATE learning_examples
        SET review_status = $1,
            reviewed_by = $2,
            reviewed_at = NOW(),
            review_notes = $3,
            expected_output = COALESCE($4, expected_output)
        WHERE id = $5
    """,
        new_status,
        current_user['id'],
        annotation.get('notes'),
        annotation.get('correctedOutput'),
        submission.exampleId
    )
    
    # If approved, trigger learning update in background
    if annotation.get('approved'):
        background_tasks.add_task(
            trigger_incremental_learning,
            submission.exampleId,
            db
        )
    
    return {"id": annotation_id, "status": "submitted"}


# ============================================
# TRAINING ROUTES
# ============================================

@router.get("/training-runs")
async def get_training_runs(
    agent_id: Optional[str] = None,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get training runs"""
    query = """
        SELECT 
            tr.*,
            td.name as dataset_name,
            u.name as created_by_name
        FROM training_runs tr
        LEFT JOIN training_datasets td ON tr.dataset_id = td.id
        LEFT JOIN users u ON tr.created_by = u.id
    """
    
    if agent_id:
        query += " WHERE tr.agent_id = $1"
        runs = await db.fetch(query, agent_id)
    else:
        runs = await db.fetch(query)
    
    return [dict(run) for run in runs]


@router.post("/training/start")
async def start_training(
    request: TrainingRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Start a new training run"""
    run_id = await db.fetchval("""
        INSERT INTO training_runs (
            name,
            agent_id,
            dataset_id,
            training_type,
            config,
            hyperparameters,
            status,
            created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
        RETURNING id
    """,
        f"Training run {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        request.agentId,
        request.datasetId,
        request.trainingType,
        request.config,
        request.hyperparameters,
        current_user['id']
    )
    
    # Start training in background
    background_tasks.add_task(
        execute_training_run,
        run_id,
        request.trainingType,
        db
    )
    
    return {"id": run_id, "status": "started"}


# ============================================
# EXPERIMENT ROUTES
# ============================================

@router.get("/experiments")
async def get_experiments(
    agent_id: Optional[str] = None,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get A/B test experiments"""
    query = """
        SELECT * FROM learning_experiments
    """
    
    if agent_id:
        query += " WHERE agent_id = $1"
        experiments = await db.fetch(query, agent_id)
    else:
        experiments = await db.fetch(query)
    
    return [dict(exp) for exp in experiments]


@router.post("/experiments")
async def create_experiment(
    request: ExperimentRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create a new A/B test experiment"""
    exp_id = await db.fetchval("""
        INSERT INTO learning_experiments (
            name,
            description,
            hypothesis,
            agent_id,
            control_config,
            treatment_config,
            control_percentage,
            treatment_percentage,
            status,
            created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
        RETURNING id
    """,
        request.name,
        request.description,
        request.hypothesis,
        request.agentId,
        request.controlConfig,
        request.treatmentConfig,
        request.controlPercentage,
        request.treatmentPercentage,
        current_user['id']
    )
    
    return {"id": exp_id, "status": "created"}


@router.post("/experiments/{experiment_id}/start")
async def start_experiment(
    experiment_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """Start an A/B test experiment"""
    await db.execute("""
        UPDATE learning_experiments
        SET status = 'running', started_at = NOW()
        WHERE id = $1
    """, experiment_id)
    
    return {"status": "started"}


# ============================================
# BACKGROUND TASKS
# ============================================

async def trigger_incremental_learning(example_id: str, db):
    """Trigger incremental learning from approved example"""
    example = await db.fetchrow("""
        SELECT * FROM learning_examples WHERE id = $1
    """, example_id)
    
    if not example:
        return
    
    # Update few-shot examples or trigger re-optimization
    # Implementation depends on learning strategy


async def execute_training_run(run_id: str, training_type: str, db):
    """Execute a training run in the background"""
    try:
        await db.execute("""
            UPDATE training_runs
            SET status = 'running', started_at = NOW()
            WHERE id = $1
        """, run_id)
        
        # Get training configuration
        run = await db.fetchrow("""
            SELECT * FROM training_runs WHERE id = $1
        """, run_id)
        
        if training_type == 'prompt_optimization':
            optimizer = PromptOptimizer(run['agent_id'], db, None)
            # Execute optimization
            
        elif training_type == 'rag_tuning':
            trainer = RAGTrainer(None, None, db)
            # Execute RAG training
            
        # Update status
        await db.execute("""
            UPDATE training_runs
            SET status = 'completed', completed_at = NOW()
            WHERE id = $1
        """, run_id)
        
    except Exception as e:
        await db.execute("""
            UPDATE training_runs
            SET status = 'failed', completed_at = NOW()
            WHERE id = $1
        """, run_id)
        raise
