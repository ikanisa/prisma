"""
Behavioral Learning Engine
Learns agent behaviors from expert demonstrations and corrections
"""

from typing import List, Dict, Optional
from dataclasses import dataclass
import json
from datetime import datetime


@dataclass
class ExpertDemonstration:
    task_description: str
    input_state: Dict
    actions: List[Dict]
    final_output: str
    reasoning: str
    expert_id: str


@dataclass
class Correction:
    original_action: Dict
    corrected_action: Dict
    explanation: str
    context: Dict


class BehaviorLearner:
    """
    Learns agent behaviors from expert demonstrations and corrections.
    """
    
    def __init__(self, agent_id: str, db_session, llm_client):
        self.agent_id = agent_id
        self.db = db_session
        self.llm = llm_client
    
    async def learn_from_demonstration(
        self,
        demonstration: ExpertDemonstration
    ) -> Dict:
        """
        Learn from an expert demonstration.
        """
        example_id = await self._store_demonstration(demonstration)
        
        patterns = await self._extract_patterns(demonstration)
        
        await self._update_behavior_model(patterns)
        
        return {
            'example_id': example_id,
            'patterns_extracted': len(patterns),
            'status': 'stored_for_training'
        }
    
    async def _store_demonstration(
        self,
        demonstration: ExpertDemonstration
    ) -> str:
        """Store demonstration as a learning example."""
        query = """
            INSERT INTO learning_examples (
                agent_id, example_type, input_text, input_context,
                expected_output, source_type, source_user_id,
                domain, task_type, review_status
            ) VALUES ($1, 'demonstration', $2, $3, $4, 'expert_review', $5, $6, $7, 'approved')
            RETURNING id
        """
        
        result = await self.db.fetchrow(
            query,
            self.agent_id,
            demonstration.task_description,
            json.dumps({
                'input_state': demonstration.input_state,
                'actions': demonstration.actions,
                'reasoning': demonstration.reasoning
            }),
            demonstration.final_output,
            demonstration.expert_id,
            'general',
            'demonstration'
        )
        
        return str(result['id']) if result else ''
    
    async def _extract_patterns(
        self,
        demonstration: ExpertDemonstration
    ) -> List[Dict]:
        """Extract behavioral patterns from demonstration."""
        patterns = []
        
        for i, action in enumerate(demonstration.actions):
            pattern = {
                'step': i + 1,
                'action_type': action.get('type', 'unknown'),
                'context': action.get('context', {}),
                'reasoning': demonstration.reasoning,
            }
            patterns.append(pattern)
        
        return patterns
    
    async def _update_behavior_model(self, patterns: List[Dict]):
        """Update behavior model with extracted patterns."""
        pass
    
    async def learn_from_correction(
        self,
        correction: Correction
    ) -> Dict:
        """
        Learn from a user correction.
        """
        await self._store_correction(correction)
        
        improvement = await self._analyze_correction(correction)
        
        if improvement.get('significant', False):
            await self._create_training_example(correction, improvement)
        
        return {
            'stored': True,
            'improvement_identified': improvement.get('significant', False),
            'improvement_type': improvement.get('type', 'unknown')
        }
    
    async def _store_correction(self, correction: Correction):
        """Store correction as a learning example."""
        query = """
            INSERT INTO learning_examples (
                agent_id, example_type, input_text, input_context,
                original_output, expected_output, source_type,
                domain, task_type, review_status
            ) VALUES ($1, 'correction', $2, $3, $4, $5, 'user_feedback', $6, $7, 'pending')
        """
        
        await self.db.execute(
            query,
            self.agent_id,
            json.dumps(correction.original_action),
            json.dumps(correction.context),
            json.dumps(correction.original_action),
            json.dumps(correction.corrected_action),
            'general',
            'correction'
        )
    
    async def _analyze_correction(self, correction: Correction) -> Dict:
        """Analyze the significance of a correction."""
        original = json.dumps(correction.original_action)
        corrected = json.dumps(correction.corrected_action)
        
        similarity = self._calculate_similarity(original, corrected)
        
        return {
            'significant': similarity < 0.7,
            'type': 'major' if similarity < 0.5 else 'minor',
            'similarity': similarity
        }
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two texts."""
        if not text1 or not text2:
            return 0.0
        
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0
    
    async def _create_training_example(
        self,
        correction: Correction,
        improvement: Dict
    ):
        """Create a training example from significant correction."""
        pass
    
    async def get_expert_examples(
        self,
        task_type: str,
        limit: int = 10
    ) -> List[Dict]:
        """Retrieve expert examples for a specific task type."""
        query = """
            SELECT 
                id, input_text, input_context, expected_output,
                quality_score, created_at
            FROM learning_examples
            WHERE agent_id = $1
              AND example_type = 'demonstration'
              AND task_type = $2
              AND review_status = 'approved'
              AND is_active = true
            ORDER BY quality_score DESC NULLS LAST, created_at DESC
            LIMIT $3
        """
        
        results = await self.db.fetch(query, self.agent_id, task_type, limit)
        
        return [
            {
                'id': str(r['id']),
                'input': r['input_text'],
                'context': r['input_context'],
                'output': r['expected_output'],
                'quality_score': float(r['quality_score']) if r['quality_score'] else 0.0,
                'created_at': r['created_at'].isoformat() if r['created_at'] else None
            }
            for r in results
        ] if results else []
    
    async def analyze_correction_patterns(self) -> Dict:
        """Analyze patterns in user corrections."""
        query = """
            SELECT 
                task_type,
                COUNT(*) as correction_count,
                AVG(quality_score) as avg_quality
            FROM learning_examples
            WHERE agent_id = $1
              AND example_type = 'correction'
              AND created_at > NOW() - INTERVAL '30 days'
            GROUP BY task_type
            ORDER BY correction_count DESC
        """
        
        results = await self.db.fetch(query, self.agent_id)
        
        patterns = {}
        for r in results:
            patterns[r['task_type']] = {
                'count': r['correction_count'],
                'avg_quality': float(r['avg_quality']) if r['avg_quality'] else 0.0
            }
        
        return {
            'patterns': patterns,
            'total_corrections': sum(p['count'] for p in patterns.values())
        }
    
    async def generate_training_dataset(
        self,
        domain: Optional[str] = None,
        min_quality_score: float = 0.7
    ) -> str:
        """Generate a training dataset from approved examples."""
        query = """
            INSERT INTO training_datasets (
                name, description, version, agent_ids,
                domains, status, created_by
            ) VALUES ($1, $2, $3, $4, $5, 'collecting', $6)
            RETURNING id
        """
        
        dataset_name = f"Agent_{self.agent_id}_Dataset_{datetime.utcnow().strftime('%Y%m%d')}"
        
        result = await self.db.fetchrow(
            query,
            dataset_name,
            f"Auto-generated training dataset for agent {self.agent_id}",
            "1.0",
            json.dumps([self.agent_id]),
            json.dumps([domain] if domain else []),
            None
        )
        
        dataset_id = str(result['id']) if result else ''
        
        await self._populate_dataset(dataset_id, domain, min_quality_score)
        
        await self._update_dataset_status(dataset_id, 'ready')
        
        return dataset_id
    
    async def _populate_dataset(
        self,
        dataset_id: str,
        domain: Optional[str],
        min_quality_score: float
    ):
        """Populate dataset with approved examples."""
        query = """
            INSERT INTO dataset_examples (dataset_id, example_id, split, weight)
            SELECT 
                $1::uuid,
                id,
                CASE 
                    WHEN random() < 0.8 THEN 'train'
                    WHEN random() < 0.9 THEN 'validation'
                    ELSE 'test'
                END,
                COALESCE(quality_score, 0.5)
            FROM learning_examples
            WHERE agent_id = $2
              AND review_status = 'approved'
              AND is_active = true
              AND COALESCE(quality_score, 0) >= $3
              AND ($4::varchar IS NULL OR domain = $4)
        """
        
        await self.db.execute(
            query,
            dataset_id,
            self.agent_id,
            min_quality_score,
            domain
        )
    
    async def _update_dataset_status(self, dataset_id: str, status: str):
        """Update dataset status."""
        query = """
            UPDATE training_datasets
            SET status = $2,
                updated_at = NOW(),
                total_examples = (
                    SELECT COUNT(*) FROM dataset_examples WHERE dataset_id = $1
                )
            WHERE id = $1
        """
        
        await self.db.execute(query, dataset_id, status)
