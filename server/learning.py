"""
Agent Learning System

Enables agents to learn from interactions and improve over time.
Tracks performance, manages training examples, and implements feedback loops.
"""

from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from uuid import UUID, uuid4
from pydantic import BaseModel, Field
from enum import Enum
import asyncio


class FeedbackType(str, Enum):
    """Types of feedback for agent learning."""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    CORRECTION = "correction"
    SUGGESTION = "suggestion"


class LearningExampleCreate(BaseModel):
    """Schema for creating a learning example."""
    agent_id: UUID
    user_input: str
    agent_response: str
    expected_response: Optional[str] = None
    feedback_type: FeedbackType
    feedback_text: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    tags: List[str] = Field(default_factory=list)


class LearningExample(LearningExampleCreate):
    """Schema for a learning example."""
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    applied_at: Optional[datetime] = None
    improvement_score: Optional[float] = None


class PerformanceMetrics(BaseModel):
    """Agent performance metrics."""
    agent_id: UUID
    total_interactions: int = 0
    positive_feedback_count: int = 0
    negative_feedback_count: int = 0
    average_response_time: float = 0.0
    accuracy_score: float = 0.0
    improvement_rate: float = 0.0
    last_trained_at: Optional[datetime] = None


class TrainingSession(BaseModel):
    """Training session for an agent."""
    id: UUID = Field(default_factory=uuid4)
    agent_id: UUID
    example_count: int
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    improvement_delta: Optional[float] = None
    status: str = "in_progress"


class AgentLearningEngine:
    """
    Core learning engine for agents.
    
    Implements:
    - Example management
    - Performance tracking
    - Feedback processing
    - Training orchestration
    """
    
    def __init__(self):
        self.examples: Dict[str, LearningExample] = {}
        self.metrics: Dict[str, PerformanceMetrics] = {}
        self.training_sessions: Dict[str, TrainingSession] = {}
    
    async def add_feedback(
        self,
        agent_id: UUID,
        user_input: str,
        agent_response: str,
        feedback_type: FeedbackType,
        feedback_text: Optional[str] = None,
        expected_response: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> LearningExample:
        """
        Add feedback for agent learning.
        
        Args:
            agent_id: Agent UUID
            user_input: Original user input
            agent_response: Agent's response
            feedback_type: Type of feedback
            feedback_text: Optional feedback text
            expected_response: Optional expected response
            context: Optional context data
        
        Returns:
            Created learning example
        """
        example = LearningExample(
            agent_id=agent_id,
            user_input=user_input,
            agent_response=agent_response,
            expected_response=expected_response,
            feedback_type=feedback_type,
            feedback_text=feedback_text,
            context=context or {}
        )
        
        self.examples[str(example.id)] = example
        
        # Update metrics
        await self._update_metrics(agent_id, feedback_type)
        
        # Auto-trigger training if threshold reached
        if await self._should_trigger_training(agent_id):
            await self.train_agent(agent_id)
        
        return example
    
    async def get_training_examples(
        self,
        agent_id: UUID,
        limit: int = 100,
        feedback_type: Optional[FeedbackType] = None
    ) -> List[LearningExample]:
        """
        Get training examples for an agent.
        
        Args:
            agent_id: Agent UUID
            limit: Maximum examples to return
            feedback_type: Optional filter by feedback type
        
        Returns:
            List of learning examples
        """
        examples = [
            ex for ex in self.examples.values()
            if ex.agent_id == agent_id
        ]
        
        if feedback_type:
            examples = [ex for ex in examples if ex.feedback_type == feedback_type]
        
        # Sort by creation date (most recent first)
        examples.sort(key=lambda x: x.created_at, reverse=True)
        
        return examples[:limit]
    
    async def train_agent(
        self,
        agent_id: UUID,
        force: bool = False
    ) -> TrainingSession:
        """
        Train an agent using accumulated examples.
        
        Args:
            agent_id: Agent UUID
            force: Force training even if threshold not met
        
        Returns:
            Training session
        """
        examples = await self.get_training_examples(agent_id)
        
        if not examples and not force:
            raise ValueError("No training examples available")
        
        # Create training session
        session = TrainingSession(
            agent_id=agent_id,
            example_count=len(examples)
        )
        self.training_sessions[str(session.id)] = session
        
        # Simulate training (in production, this would call OpenAI fine-tuning API)
        await asyncio.sleep(1)  # Simulate training time
        
        # Calculate improvement
        old_metrics = self.metrics.get(str(agent_id))
        improvement = 0.05 if old_metrics else 0.0  # 5% improvement
        
        # Update session
        session.completed_at = datetime.utcnow()
        session.improvement_delta = improvement
        session.status = "completed"
        
        # Mark examples as applied
        for example in examples:
            example.applied_at = datetime.utcnow()
            example.improvement_score = improvement
        
        # Update metrics
        if str(agent_id) in self.metrics:
            self.metrics[str(agent_id)].last_trained_at = datetime.utcnow()
            self.metrics[str(agent_id)].improvement_rate = improvement
        
        return session
    
    async def get_performance_metrics(
        self,
        agent_id: UUID
    ) -> PerformanceMetrics:
        """
        Get performance metrics for an agent.
        
        Args:
            agent_id: Agent UUID
        
        Returns:
            Performance metrics
        """
        if str(agent_id) not in self.metrics:
            self.metrics[str(agent_id)] = PerformanceMetrics(agent_id=agent_id)
        
        return self.metrics[str(agent_id)]
    
    async def get_learning_insights(
        self,
        agent_id: UUID
    ) -> Dict[str, Any]:
        """
        Get learning insights for an agent.
        
        Returns:
            Insights including common issues, improvement areas, etc.
        """
        examples = await self.get_training_examples(agent_id)
        metrics = await self.get_performance_metrics(agent_id)
        
        # Analyze feedback patterns
        negative_examples = [ex for ex in examples if ex.feedback_type == FeedbackType.NEGATIVE]
        correction_examples = [ex for ex in examples if ex.feedback_type == FeedbackType.CORRECTION]
        
        # Extract common tags
        tag_counts: Dict[str, int] = {}
        for example in examples:
            for tag in example.tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        common_issues = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_examples": len(examples),
            "negative_feedback_rate": len(negative_examples) / len(examples) if examples else 0,
            "correction_rate": len(correction_examples) / len(examples) if examples else 0,
            "common_issues": [{"tag": tag, "count": count} for tag, count in common_issues],
            "recent_improvement": metrics.improvement_rate,
            "accuracy_score": metrics.accuracy_score,
            "recommendations": await self._generate_recommendations(agent_id, examples)
        }
    
    async def _update_metrics(
        self,
        agent_id: UUID,
        feedback_type: FeedbackType
    ):
        """Update performance metrics for an agent."""
        if str(agent_id) not in self.metrics:
            self.metrics[str(agent_id)] = PerformanceMetrics(agent_id=agent_id)
        
        metrics = self.metrics[str(agent_id)]
        metrics.total_interactions += 1
        
        if feedback_type == FeedbackType.POSITIVE:
            metrics.positive_feedback_count += 1
        elif feedback_type == FeedbackType.NEGATIVE:
            metrics.negative_feedback_count += 1
        
        # Calculate accuracy score
        total_feedback = metrics.positive_feedback_count + metrics.negative_feedback_count
        if total_feedback > 0:
            metrics.accuracy_score = metrics.positive_feedback_count / total_feedback
    
    async def _should_trigger_training(self, agent_id: UUID) -> bool:
        """Determine if agent should be trained based on feedback volume."""
        examples = await self.get_training_examples(agent_id)
        
        # Train if:
        # 1. Have at least 10 new examples
        # 2. Haven't trained in the last 24 hours
        unapplied_examples = [ex for ex in examples if ex.applied_at is None]
        
        if len(unapplied_examples) < 10:
            return False
        
        metrics = self.metrics.get(str(agent_id))
        if metrics and metrics.last_trained_at:
            time_since_training = datetime.utcnow() - metrics.last_trained_at
            if time_since_training < timedelta(hours=24):
                return False
        
        return True
    
    async def _generate_recommendations(
        self,
        agent_id: UUID,
        examples: List[LearningExample]
    ) -> List[str]:
        """Generate improvement recommendations."""
        recommendations = []
        
        if not examples:
            return ["Collect more feedback to generate recommendations"]
        
        # Check negative feedback rate
        negative_count = sum(1 for ex in examples if ex.feedback_type == FeedbackType.NEGATIVE)
        negative_rate = negative_count / len(examples)
        
        if negative_rate > 0.3:
            recommendations.append("High negative feedback rate - review persona settings")
        
        # Check for corrections
        correction_count = sum(1 for ex in examples if ex.feedback_type == FeedbackType.CORRECTION)
        if correction_count > 5:
            recommendations.append("Multiple corrections detected - consider retraining")
        
        # Check training freshness
        metrics = self.metrics.get(str(agent_id))
        if metrics and metrics.last_trained_at:
            days_since_training = (datetime.utcnow() - metrics.last_trained_at).days
            if days_since_training > 7:
                recommendations.append("Agent hasn't been trained in 7+ days")
        else:
            recommendations.append("Agent has never been trained - schedule initial training")
        
        return recommendations


# Global learning engine instance
learning_engine = AgentLearningEngine()
