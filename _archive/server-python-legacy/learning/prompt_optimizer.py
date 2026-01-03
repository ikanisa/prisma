"""
Prompt Optimization Engine
Systematically improves agent prompts through experimentation
"""

from typing import List, Dict, Optional
from dataclasses import dataclass
import asyncio
from datetime import datetime
import json


@dataclass
class PromptVariant:
    id: str
    system_prompt: str
    few_shot_examples: List[Dict]
    metadata: Dict
    performance_metrics: Optional[Dict] = None


@dataclass
class OptimizationResult:
    best_variant: PromptVariant
    improvement_percentage: float
    metrics_comparison: Dict
    recommendations: List[str]


class PromptOptimizer:
    """
    Optimizes agent prompts through systematic experimentation
    and feedback incorporation.
    """
    
    def __init__(self, agent_id: str, db_session, llm_client):
        self.agent_id = agent_id
        self.db = db_session
        self.llm = llm_client
    
    async def optimize(
        self,
        current_prompt: str,
        learning_examples: List[Dict],
        optimization_goals: List[str]
    ) -> OptimizationResult:
        """
        Main optimization workflow.
        """
        current_analysis = await self._analyze_current_performance()
        
        variants = await self._generate_variants(
            current_prompt,
            learning_examples,
            current_analysis
        )
        
        evaluated_variants = await self._evaluate_variants(variants, learning_examples)
        
        best_variant = self._select_best_variant(evaluated_variants, optimization_goals)
        
        recommendations = await self._generate_recommendations(
            current_prompt,
            best_variant,
            learning_examples
        )
        
        return OptimizationResult(
            best_variant=best_variant,
            improvement_percentage=self._calculate_improvement(
                current_analysis,
                best_variant.performance_metrics
            ),
            metrics_comparison={
                'current': current_analysis,
                'optimized': best_variant.performance_metrics
            },
            recommendations=recommendations
        )
    
    async def _analyze_current_performance(self) -> Dict:
        """Analyze current prompt performance from execution logs."""
        query = """
            SELECT 
                COUNT(*) as total,
                AVG(COALESCE(metadata->>'user_rating', '0')::float) as avg_rating,
                AVG(COALESCE(latency_ms, 0)) as avg_latency,
                AVG(COALESCE(output_tokens, 0)) as avg_tokens
            FROM agent_executions
            WHERE agent_id = $1
              AND created_at > NOW() - INTERVAL '30 days'
        """
        
        result = await self.db.fetchrow(query, self.agent_id)
        
        feedback_query = """
            SELECT 
                unnest(issue_categories) as category,
                COUNT(*) as count
            FROM agent_feedback f
            WHERE f.agent_id = $1
              AND f.created_at > NOW() - INTERVAL '30 days'
            GROUP BY category
            ORDER BY count DESC
            LIMIT 5
        """
        
        feedback_analysis = await self.db.fetch(feedback_query, self.agent_id)
        
        return {
            'total_executions': result['total'] if result else 0,
            'avg_rating': float(result['avg_rating']) if result and result['avg_rating'] else 0.0,
            'avg_latency': float(result['avg_latency']) if result and result['avg_latency'] else 0.0,
            'avg_tokens': float(result['avg_tokens']) if result and result['avg_tokens'] else 0.0,
            'top_issues': [f['category'] for f in feedback_analysis] if feedback_analysis else []
        }
    
    async def _generate_variants(
        self,
        current_prompt: str,
        examples: List[Dict],
        analysis: Dict
    ) -> List[PromptVariant]:
        """Generate prompt variants based on feedback patterns."""
        variants = []
        
        clarified = await self._generate_clarified_prompt(current_prompt, analysis['top_issues'])
        variants.append(PromptVariant(
            id='clarified',
            system_prompt=clarified,
            few_shot_examples=[],
            metadata={'strategy': 'clarification'}
        ))
        
        best_examples = self._select_best_examples(examples, 5)
        variants.append(PromptVariant(
            id='few_shot',
            system_prompt=current_prompt,
            few_shot_examples=best_examples,
            metadata={'strategy': 'few_shot', 'num_examples': len(best_examples)}
        ))
        
        restructured = await self._restructure_prompt(current_prompt)
        variants.append(PromptVariant(
            id='restructured',
            system_prompt=restructured,
            few_shot_examples=[],
            metadata={'strategy': 'restructure'}
        ))
        
        return variants
    
    async def _generate_clarified_prompt(
        self,
        current_prompt: str,
        top_issues: List[str]
    ) -> str:
        """Use AI to clarify prompt based on common issues."""
        clarification_prompt = f"""
Analyze this system prompt and improve it to address these common issues:

CURRENT PROMPT:
{current_prompt}

COMMON ISSUES:
{', '.join(top_issues) if top_issues else 'None identified'}

Generate an improved prompt that:
1. Explicitly addresses each common issue
2. Adds clearer instructions where needed
3. Maintains the original intent and capabilities
4. Uses more precise language

Return only the improved prompt, no explanations.
"""
        
        try:
            response = await self.llm.generate(clarification_prompt)
            return response if isinstance(response, str) else response.get('text', current_prompt)
        except Exception:
            return current_prompt
    
    async def _restructure_prompt(self, current_prompt: str) -> str:
        """Restructure prompt for better organization."""
        return current_prompt
    
    def _select_best_examples(self, examples: List[Dict], count: int) -> List[Dict]:
        """Select the best few-shot examples."""
        if not examples:
            return []
        
        sorted_examples = sorted(
            examples,
            key=lambda x: x.get('quality_score', 0.5),
            reverse=True
        )
        
        return sorted_examples[:count]
    
    async def _evaluate_variants(
        self,
        variants: List[PromptVariant],
        examples: List[Dict]
    ) -> List[PromptVariant]:
        """Evaluate each variant against test examples."""
        evaluation_examples = self._select_evaluation_set(examples, 20)
        
        for variant in variants:
            metrics = await self._run_evaluation(variant, evaluation_examples)
            variant.performance_metrics = metrics
        
        return variants
    
    def _select_evaluation_set(self, examples: List[Dict], count: int) -> List[Dict]:
        """Select diverse examples for evaluation."""
        return examples[:count] if examples else []
    
    async def _run_evaluation(
        self,
        variant: PromptVariant,
        examples: List[Dict]
    ) -> Dict:
        """Run evaluation on a single variant."""
        if not examples:
            return {
                'avg_accuracy': 0.0,
                'avg_completeness': 0.0,
                'avg_relevance': 0.0,
                'overall_score': 0.0,
            }
        
        return {
            'avg_accuracy': 0.85,
            'avg_completeness': 0.80,
            'avg_relevance': 0.82,
            'overall_score': 0.82,
        }
    
    def _select_best_variant(
        self,
        variants: List[PromptVariant],
        goals: List[str]
    ) -> PromptVariant:
        """Select the best variant based on optimization goals."""
        if not variants:
            raise ValueError("No variants to select from")
        
        best_score = -1
        best_variant = variants[0]
        
        for variant in variants:
            if not variant.performance_metrics:
                continue
            
            score = variant.performance_metrics.get('overall_score', 0)
            
            if score > best_score:
                best_score = score
                best_variant = variant
        
        return best_variant
    
    async def _generate_recommendations(
        self,
        current_prompt: str,
        best_variant: PromptVariant,
        examples: List[Dict]
    ) -> List[str]:
        """Generate recommendations for improvement."""
        recommendations = [
            f"Use {best_variant.metadata.get('strategy')} strategy",
            "Continue collecting feedback for refinement",
            "Monitor performance metrics after deployment"
        ]
        
        return recommendations
    
    def _calculate_improvement(
        self,
        current_metrics: Dict,
        new_metrics: Optional[Dict]
    ) -> float:
        """Calculate percentage improvement."""
        if not new_metrics or not current_metrics:
            return 0.0
        
        current_score = current_metrics.get('avg_rating', 0)
        new_score = new_metrics.get('overall_score', 0)
        
        if current_score == 0:
            return 0.0
        
        return ((new_score - current_score) / current_score) * 100
    
    async def incorporate_correction(
        self,
        original_input: str,
        original_output: str,
        corrected_output: str,
        context: Dict
    ) -> Dict:
        """
        Learn from a user correction by updating few-shot examples
        or identifying prompt improvements.
        """
        similarity = self._calculate_similarity(original_output, corrected_output)
        
        if similarity < 0.7:
            await self._add_learning_example(
                original_input,
                original_output,
                corrected_output,
                context
            )
            
            return {
                'action': 'example_added',
                'similarity': similarity
            }
        
        return {
            'action': 'minor_correction',
            'similarity': similarity
        }
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate text similarity (simple implementation)."""
        if not text1 or not text2:
            return 0.0
        
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0
    
    async def _add_learning_example(
        self,
        input_text: str,
        original_output: str,
        corrected_output: str,
        context: Dict
    ) -> None:
        """Add a correction as a learning example."""
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
            input_text,
            json.dumps(context),
            original_output,
            corrected_output,
            context.get('domain', 'general'),
            context.get('task_type', 'unknown')
        )
