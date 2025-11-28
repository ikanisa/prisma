"""
Tests for Agent Learning System
"""

import pytest
from datetime import datetime
import uuid
import json

from server.learning.prompt_optimizer import PromptOptimizer, PromptVariant
from server.learning.rag_trainer import RAGTrainer
from server.learning.behavior_learner import BehaviorLearner, ExpertDemonstration, Correction


class TestPromptOptimizer:
    """Test prompt optimization engine."""
    
    @pytest.fixture
    def optimizer(self, db_session, llm_client):
        return PromptOptimizer(
            agent_id=str(uuid.uuid4()),
            db_session=db_session,
            llm_client=llm_client
        )
    
    @pytest.mark.asyncio
    async def test_analyze_current_performance(self, optimizer):
        """Test current performance analysis."""
        analysis = await optimizer._analyze_current_performance()
        
        assert 'total_executions' in analysis
        assert 'avg_rating' in analysis
        assert 'top_issues' in analysis
        assert isinstance(analysis['total_executions'], int)
        assert isinstance(analysis['avg_rating'], float)
    
    @pytest.mark.asyncio
    async def test_generate_variants(self, optimizer):
        """Test prompt variant generation."""
        current_prompt = "You are a helpful accounting assistant."
        examples = [
            {'input_text': 'Calculate tax', 'expected_output': '...', 'quality_score': 0.9}
        ]
        analysis = {'top_issues': ['incomplete', 'unclear']}
        
        variants = await optimizer._generate_variants(current_prompt, examples, analysis)
        
        assert len(variants) > 0
        assert all(isinstance(v, PromptVariant) for v in variants)
        assert any(v.metadata['strategy'] == 'clarified' for v in variants)
        assert any(v.metadata['strategy'] == 'few_shot' for v in variants)
    
    @pytest.mark.asyncio
    async def test_select_best_examples(self, optimizer):
        """Test few-shot example selection."""
        examples = [
            {'quality_score': 0.9, 'text': 'high quality'},
            {'quality_score': 0.5, 'text': 'medium quality'},
            {'quality_score': 0.95, 'text': 'highest quality'},
            {'quality_score': 0.3, 'text': 'low quality'},
        ]
        
        best = optimizer._select_best_examples(examples, 2)
        
        assert len(best) == 2
        assert best[0]['quality_score'] == 0.95
        assert best[1]['quality_score'] == 0.9
    
    @pytest.mark.asyncio
    async def test_incorporate_correction(self, optimizer, db_session):
        """Test learning from user corrections."""
        result = await optimizer.incorporate_correction(
            original_input="Calculate deferred tax",
            original_output="Tax is $100",
            corrected_output="Deferred tax liability is $100 based on temporary differences...",
            context={'domain': 'tax', 'task_type': 'calculation'}
        )
        
        assert 'action' in result
        assert result['action'] in ['example_added', 'minor_correction']


class TestBehaviorLearner:
    """Test behavior learning engine."""
    
    @pytest.fixture
    def learner(self, db_session, llm_client):
        return BehaviorLearner(
            agent_id=str(uuid.uuid4()),
            db_session=db_session,
            llm_client=llm_client
        )
    
    @pytest.mark.asyncio
    async def test_learn_from_demonstration(self, learner):
        """Test learning from expert demonstration."""
        demo = ExpertDemonstration(
            task_description="Calculate revenue recognition under IFRS 15",
            input_state={'contract_value': 100000, 'performance_obligations': 3},
            actions=[
                {'type': 'identify_obligations', 'count': 3},
                {'type': 'allocate_price', 'method': 'relative_standalone'},
                {'type': 'recognize_revenue', 'timing': 'over_time'}
            ],
            final_output="Revenue allocated: PO1: $40k, PO2: $35k, PO3: $25k",
            reasoning="Used relative standalone selling price method",
            expert_id=str(uuid.uuid4())
        )
        
        result = await learner.learn_from_demonstration(demo)
        
        assert 'example_id' in result
        assert result['status'] == 'created'
        assert result['auto_approved'] == True
    
    @pytest.mark.asyncio
    async def test_learn_from_correction(self, learner):
        """Test learning from user correction."""
        correction = Correction(
            original_action={'type': 'calculate', 'method': 'simple'},
            corrected_action={'type': 'calculate', 'method': 'effective_interest'},
            explanation="Must use effective interest method for bond premium amortization",
            context={'domain': 'accounting', 'task_type': 'amortization'}
        )
        
        result = await learner.learn_from_correction(correction)
        
        assert 'example_id' in result
        assert result['status'] == 'created'
    
    @pytest.mark.asyncio
    async def test_get_expert_examples(self, learner, db_session):
        """Test retrieving expert examples."""
        examples = await learner.get_expert_examples(
            task_type='demonstration',
            limit=5
        )
        
        assert isinstance(examples, list)
        # May be empty if no examples exist yet
        if examples:
            assert 'id' in examples[0]
            assert 'input' in examples[0]
            assert 'quality_score' in examples[0]
    
    @pytest.mark.asyncio
    async def test_analyze_correction_patterns(self, learner):
        """Test correction pattern analysis."""
        patterns = await learner.analyze_correction_patterns()
        
        assert 'patterns' in patterns
        assert 'total_corrections' in patterns
        assert isinstance(patterns['total_corrections'], int)


class TestFeedbackCollection:
    """Test feedback collection API."""
    
    @pytest.mark.asyncio
    async def test_submit_thumbs_up(self, client, db_session, auth_headers):
        """Test submitting thumbs up feedback."""
        # Create test execution
        execution_id = str(uuid.uuid4())
        agent_id = str(uuid.uuid4())
        
        response = await client.post(
            '/api/learning/feedback',
            headers=auth_headers,
            json={
                'execution_id': execution_id,
                'agent_id': agent_id,
                'feedback_type': 'thumbs_up',
                'rating': 5
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'id' in data
        assert data['status'] == 'success'
    
    @pytest.mark.asyncio
    async def test_submit_correction(self, client, db_session, auth_headers):
        """Test submitting feedback with correction."""
        response = await client.post(
            '/api/learning/feedback',
            headers=auth_headers,
            json={
                'execution_id': str(uuid.uuid4()),
                'agent_id': str(uuid.uuid4()),
                'feedback_type': 'correction',
                'rating': 3,
                'feedback_text': 'Needs more detail',
                'correction_text': 'Corrected version with proper citations...',
                'issue_categories': ['incomplete', 'unclear'],
                'accuracy_rating': 3,
                'helpfulness_rating': 4,
                'clarity_rating': 2,
                'completeness_rating': 3
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'success'


class TestExpertAnnotation:
    """Test expert annotation system."""
    
    @pytest.mark.asyncio
    async def test_get_annotation_queue(self, client, admin_headers):
        """Test retrieving annotation queue."""
        response = await client.get(
            '/api/learning/annotation-queue?status=pending',
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'examples' in data
        assert 'count' in data
    
    @pytest.mark.asyncio
    async def test_submit_annotation(self, client, admin_headers, db_session):
        """Test submitting expert annotation."""
        # Create test learning example
        example_id = str(uuid.uuid4())
        
        response = await client.post(
            '/api/learning/annotations',
            headers=admin_headers,
            json={
                'learning_example_id': example_id,
                'annotation_type': 'quality_assessment',
                'annotation_data': {'approved': True},
                'technical_accuracy': 0.95,
                'professional_quality': 0.90,
                'completeness': 0.85,
                'clarity': 0.92,
                'notes': 'Excellent response',
                'improvement_suggestions': 'Add more examples'
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'id' in data


class TestTrainingRuns:
    """Test training run management."""
    
    @pytest.mark.asyncio
    async def test_create_training_run(self, client, admin_headers):
        """Test creating a training run."""
        response = await client.post(
            '/api/learning/training-runs',
            headers=admin_headers,
            json={
                'agent_id': str(uuid.uuid4()),
                'dataset_id': str(uuid.uuid4()),
                'training_type': 'prompt_optimization',
                'config': {
                    'optimization_goals': ['accuracy', 'clarity'],
                    'num_variants': 4
                },
                'hyperparameters': {}
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'id' in data
        assert data['status'] == 'pending'
    
    @pytest.mark.asyncio
    async def test_get_training_runs(self, client, admin_headers):
        """Test retrieving training runs."""
        response = await client.get(
            '/api/learning/training-runs',
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'runs' in data


class TestExperiments:
    """Test A/B testing experiments."""
    
    @pytest.mark.asyncio
    async def test_create_experiment(self, client, admin_headers):
        """Test creating an A/B experiment."""
        response = await client.post(
            '/api/learning/experiments',
            headers=admin_headers,
            json={
                'agent_id': str(uuid.uuid4()),
                'name': 'Improved Prompts Test',
                'description': 'Testing clarified instructions',
                'hypothesis': 'Will improve accuracy by 15%',
                'control_config': {'prompt': 'Original prompt'},
                'treatment_config': {'prompt': 'Improved prompt'},
                'control_percentage': 50,
                'treatment_percentage': 50
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'id' in data
        assert data['status'] == 'draft'
    
    @pytest.mark.asyncio
    async def test_get_experiments(self, client, admin_headers):
        """Test retrieving experiments."""
        response = await client.get(
            '/api/learning/experiments',
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'experiments' in data


# Integration Test
class TestLearningSystemIntegration:
    """End-to-end learning system tests."""
    
    @pytest.mark.asyncio
    async def test_full_learning_cycle(
        self,
        client,
        db_session,
        auth_headers,
        admin_headers
    ):
        """Test complete learning cycle from feedback to training."""
        # 1. Submit feedback with correction
        feedback_response = await client.post(
            '/api/learning/feedback',
            headers=auth_headers,
            json={
                'execution_id': str(uuid.uuid4()),
                'agent_id': str(uuid.uuid4()),
                'feedback_type': 'correction',
                'rating': 3,
                'correction_text': 'Improved response...',
                'issue_categories': ['incomplete']
            }
        )
        assert feedback_response.status_code == 200
        
        # 2. Expert reviews and approves
        queue_response = await client.get(
            '/api/learning/annotation-queue?status=pending',
            headers=admin_headers
        )
        assert queue_response.status_code == 200
        
        # 3. Create training dataset
        # (would happen via background job in production)
        
        # 4. Start training run
        # (would be triggered based on dataset readiness)
        
        # 5. Create A/B experiment
        # (after training completes successfully)
