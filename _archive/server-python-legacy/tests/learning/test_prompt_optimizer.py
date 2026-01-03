"""
Agent Learning System Tests
Tests for feedback collection, prompt optimization, and training workflows
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from uuid import uuid4

from server.learning.prompt_optimizer import PromptOptimizer, PromptVariant
from server.learning.rag_trainer import RAGTrainer
from server.learning.behavior_learner import BehaviorLearner


class MockDB:
    """Mock database for testing"""
    
    def __init__(self):
        self.data = {
            'agent_feedback': [],
            'learning_examples': [],
            'expert_annotations': [],
        }
    
    async def fetchrow(self, query, *args):
        """Mock fetchrow"""
        if 'agent_feedback' in query and 'AVG' in query:
            return {
                'total': 100,
                'avg_rating': 3.8,
                'satisfaction_rate': 0.7
            }
        return {}
    
    async def fetch(self, query, *args):
        """Mock fetch"""
        if 'issue_categories' in query:
            return [
                {'category': 'incorrect', 'count': 15},
                {'category': 'incomplete', 'count': 10},
                {'category': 'unclear', 'count': 8},
            ]
        return []
    
    async def execute(self, query, *args):
        """Mock execute"""
        pass
    
    async def fetchval(self, query, *args):
        """Mock fetchval"""
        return str(uuid4())


class MockLLM:
    """Mock LLM client for testing"""
    
    async def generate(self, prompt, **kwargs):
        """Mock generation"""
        if 'clarify' in prompt.lower() or 'improve' in prompt.lower():
            return {
                'text': 'You are a professional accounting assistant. Provide accurate, well-structured responses.'
            }
        return {
            'text': 'Test response'
        }


@pytest.fixture
def mock_db():
    """Fixture for mock database"""
    return MockDB()


@pytest.fixture
def mock_llm():
    """Fixture for mock LLM"""
    return MockLLM()


# ============================================
# PROMPT OPTIMIZER TESTS
# ============================================

@pytest.mark.asyncio
async def test_prompt_optimizer_initialization(mock_db, mock_llm):
    """Test PromptOptimizer initialization"""
    optimizer = PromptOptimizer('test-agent-id', mock_db, mock_llm)
    assert optimizer.agent_id == 'test-agent-id'
    assert optimizer.db == mock_db
    assert optimizer.llm == mock_llm


@pytest.mark.asyncio
async def test_analyze_current_performance(mock_db, mock_llm):
    """Test current performance analysis"""
    optimizer = PromptOptimizer('test-agent-id', mock_db, mock_llm)
    analysis = await optimizer._analyze_current_performance()
    
    assert 'total_executions' in analysis
    assert 'avg_rating' in analysis
    assert 'satisfaction_rate' in analysis
    assert 'top_issues' in analysis
    
    assert analysis['avg_rating'] == 3.8
    assert analysis['satisfaction_rate'] == 0.7


@pytest.mark.asyncio
async def test_select_best_examples(mock_db, mock_llm):
    """Test few-shot example selection"""
    optimizer = PromptOptimizer('test-agent-id', mock_db, mock_llm)
    
    examples = [
        {'review_status': 'approved', 'quality_score': 0.9},
        {'review_status': 'approved', 'quality_score': 0.8},
        {'review_status': 'approved', 'quality_score': 0.7},
        {'review_status': 'pending', 'quality_score': 0.6},
        {'review_status': 'approved', 'quality_score': 0.5},
    ]
    
    selected = optimizer._select_best_examples(examples, 3)
    
    assert len(selected) == 3
    assert selected[0]['quality_score'] == 0.9
    assert selected[1]['quality_score'] == 0.8
    assert selected[2]['quality_score'] == 0.7


@pytest.mark.asyncio
async def test_calculate_similarity(mock_db, mock_llm):
    """Test text similarity calculation"""
    optimizer = PromptOptimizer('test-agent-id', mock_db, mock_llm)
    
    # Identical text
    similarity = optimizer._calculate_similarity("hello world", "hello world")
    assert similarity == 1.0
    
    # Partial overlap
    similarity = optimizer._calculate_similarity("hello world", "hello there")
    assert 0 < similarity < 1
    
    # No overlap
    similarity = optimizer._calculate_similarity("abc", "xyz")
    assert similarity == 0.0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
