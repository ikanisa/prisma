"""
Feedback Collection System
Collects and processes user feedback on agent executions
"""

from typing import Dict, Optional, List
from datetime import datetime
import json


class FeedbackCollector:
    """
    Collects and processes user feedback on agent executions.
    """
    
    def __init__(self, db_session):
        self.db = db_session
    
    async def submit_feedback(
        self,
        execution_id: str,
        agent_id: str,
        user_id: str,
        feedback_type: str,
        rating: Optional[int] = None,
        feedback_text: Optional[str] = None,
        correction_text: Optional[str] = None,
        issue_categories: Optional[List[str]] = None,
        dimensions: Optional[Dict[str, int]] = None
    ) -> str:
        """
        Submit user feedback on an agent execution.
        """
        query = """
            INSERT INTO agent_feedback (
                execution_id, agent_id, user_id, feedback_type,
                rating, accuracy_rating, helpfulness_rating,
                clarity_rating, completeness_rating,
                feedback_text, correction_text, issue_categories,
                task_context
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        """
        
        dimensions = dimensions or {}
        issue_categories = issue_categories or []
        
        result = await self.db.fetchrow(
            query,
            execution_id,
            agent_id,
            user_id,
            feedback_type,
            rating,
            dimensions.get('accuracy'),
            dimensions.get('helpfulness'),
            dimensions.get('clarity'),
            dimensions.get('completeness'),
            feedback_text,
            correction_text,
            json.dumps(issue_categories),
            json.dumps({})
        )
        
        feedback_id = str(result['id']) if result else ''
        
        if correction_text and feedback_type == 'correction':
            await self._create_learning_example_from_correction(
                feedback_id,
                execution_id,
                agent_id,
                user_id,
                correction_text
            )
        
        return feedback_id
    
    async def _create_learning_example_from_correction(
        self,
        feedback_id: str,
        execution_id: str,
        agent_id: str,
        user_id: str,
        correction_text: str
    ):
        """Create a learning example from user correction."""
        exec_query = """
            SELECT input_data, output_data, context
            FROM agent_executions
            WHERE id = $1
        """
        
        execution = await self.db.fetchrow(exec_query, execution_id)
        
        if not execution:
            return
        
        example_query = """
            INSERT INTO learning_examples (
                agent_id, example_type, input_text, input_context,
                original_output, expected_output, source_type,
                source_user_id, source_execution_id, review_status
            ) VALUES ($1, 'correction', $2, $3, $4, $5, 'user_feedback', $6, $7, 'pending')
        """
        
        await self.db.execute(
            example_query,
            agent_id,
            execution.get('input_data', ''),
            execution.get('context', {}),
            execution.get('output_data', ''),
            correction_text,
            user_id,
            execution_id
        )
    
    async def get_feedback_stats(self, agent_id: str) -> Dict:
        """Get feedback statistics for an agent."""
        query = """
            SELECT 
                COUNT(*) as total_feedback,
                AVG(rating) as avg_rating,
                AVG(accuracy_rating) as avg_accuracy,
                AVG(helpfulness_rating) as avg_helpfulness,
                AVG(clarity_rating) as avg_clarity,
                AVG(completeness_rating) as avg_completeness,
                SUM(CASE WHEN feedback_type = 'thumbs_up' THEN 1 ELSE 0 END) as thumbs_up,
                SUM(CASE WHEN feedback_type = 'thumbs_down' THEN 1 ELSE 0 END) as thumbs_down,
                SUM(CASE WHEN feedback_type = 'correction' THEN 1 ELSE 0 END) as corrections
            FROM agent_feedback
            WHERE agent_id = $1
              AND created_at > NOW() - INTERVAL '30 days'
        """
        
        result = await self.db.fetchrow(query, agent_id)
        
        if not result:
            return {
                'total_feedback': 0,
                'avg_rating': 0.0,
                'dimensions': {},
                'thumbs_up': 0,
                'thumbs_down': 0,
                'corrections': 0
            }
        
        return {
            'total_feedback': result['total_feedback'],
            'avg_rating': float(result['avg_rating']) if result['avg_rating'] else 0.0,
            'dimensions': {
                'accuracy': float(result['avg_accuracy']) if result['avg_accuracy'] else 0.0,
                'helpfulness': float(result['avg_helpfulness']) if result['avg_helpfulness'] else 0.0,
                'clarity': float(result['avg_clarity']) if result['avg_clarity'] else 0.0,
                'completeness': float(result['avg_completeness']) if result['avg_completeness'] else 0.0,
            },
            'thumbs_up': result['thumbs_up'],
            'thumbs_down': result['thumbs_down'],
            'corrections': result['corrections']
        }
    
    async def get_common_issues(
        self,
        agent_id: str,
        limit: int = 10
    ) -> List[Dict]:
        """Get most common issues reported for an agent."""
        query = """
            SELECT 
                unnest(issue_categories) as category,
                COUNT(*) as count
            FROM agent_feedback
            WHERE agent_id = $1
              AND created_at > NOW() - INTERVAL '30 days'
              AND issue_categories IS NOT NULL
            GROUP BY category
            ORDER BY count DESC
            LIMIT $2
        """
        
        results = await self.db.fetch(query, agent_id, limit)
        
        return [
            {
                'category': r['category'],
                'count': r['count']
            }
            for r in results
        ] if results else []
    
    async def get_annotation_queue(
        self,
        filters: Optional[Dict] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get learning examples pending annotation."""
        filters = filters or {}
        
        conditions = ["review_status = 'pending'"]
        params = []
        param_count = 1
        
        if filters.get('domain') and filters['domain'] != 'all':
            conditions.append(f"domain = ${param_count}")
            params.append(filters['domain'])
            param_count += 1
        
        if filters.get('agent') and filters['agent'] != 'all':
            conditions.append(f"agent_id = ${param_count}")
            params.append(filters['agent'])
            param_count += 1
        
        where_clause = " AND ".join(conditions)
        
        query = f"""
            SELECT 
                id, agent_id, example_type, input_text,
                input_context, original_output, expected_output,
                domain, task_type, complexity, tags,
                source_type, created_at
            FROM learning_examples
            WHERE {where_clause}
            ORDER BY created_at ASC
            LIMIT ${param_count}
        """
        
        params.append(limit)
        
        results = await self.db.fetch(query, *params)
        
        return [
            {
                'id': str(r['id']),
                'agent_id': str(r['agent_id']),
                'example_type': r['example_type'],
                'input_text': r['input_text'],
                'input_context': r['input_context'],
                'original_output': r['original_output'],
                'expected_output': r['expected_output'],
                'domain': r['domain'],
                'task_type': r['task_type'],
                'complexity': r['complexity'],
                'tags': r['tags'],
                'source_type': r['source_type'],
                'created_at': r['created_at'].isoformat() if r['created_at'] else None
            }
            for r in results
        ] if results else []
    
    async def submit_annotation(
        self,
        example_id: str,
        expert_id: str,
        annotation: Dict
    ) -> str:
        """Submit expert annotation for a learning example."""
        annotation_query = """
            INSERT INTO expert_annotations (
                learning_example_id, expert_id, annotation_type,
                annotation_data, technical_accuracy, professional_quality,
                completeness, clarity, notes, improvement_suggestions
            ) VALUES ($1, $2, 'quality_assessment', $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        """
        
        result = await self.db.fetchrow(
            annotation_query,
            example_id,
            expert_id,
            json.dumps(annotation),
            annotation.get('technicalAccuracy'),
            annotation.get('professionalQuality'),
            annotation.get('completeness'),
            annotation.get('clarity'),
            annotation.get('notes'),
            annotation.get('improvementSuggestions')
        )
        
        annotation_id = str(result['id']) if result else ''
        
        update_query = """
            UPDATE learning_examples
            SET review_status = $2,
                reviewed_by = $3,
                reviewed_at = NOW(),
                review_notes = $4,
                expected_output = $5,
                quality_score = $6
            WHERE id = $1
        """
        
        status = 'approved' if annotation.get('approved') else 'rejected'
        avg_quality = (
            annotation.get('technicalAccuracy', 0) +
            annotation.get('professionalQuality', 0) +
            annotation.get('completeness', 0) +
            annotation.get('clarity', 0)
        ) / 4.0
        
        await self.db.execute(
            update_query,
            example_id,
            status,
            expert_id,
            annotation.get('notes'),
            annotation.get('correctedOutput'),
            avg_quality
        )
        
        return annotation_id
    
    async def get_learning_stats(self) -> Dict:
        """Get overall learning system statistics."""
        stats_query = """
            SELECT 
                COUNT(*) FILTER (WHERE review_status = 'pending') as pending_annotations,
                COUNT(*) FILTER (WHERE review_status = 'approved') as approved_examples,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as collected_today,
                COUNT(*) FILTER (
                    WHERE review_status = 'approved' 
                    AND reviewed_at > NOW() - INTERVAL '1 day'
                ) as annotated_today
            FROM learning_examples
        """
        
        result = await self.db.fetchrow(stats_query)
        
        if not result:
            return {
                'pendingAnnotations': 0,
                'approvedExamples': 0,
                'collectedToday': 0,
                'annotatedToday': 0
            }
        
        return {
            'pendingAnnotations': result['pending_annotations'],
            'approvedExamples': result['approved_examples'],
            'collectedToday': result['collected_today'],
            'annotatedToday': result['annotated_today']
        }
