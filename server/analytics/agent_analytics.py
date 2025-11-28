"""
Agent Analytics System
Tracks agent usage, performance, and provides insights.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class AgentAnalytics:
    """
    Analytics system for agent usage and performance tracking.
    
    Features:
    - Usage tracking
    - Performance metrics
    - Success rate monitoring
    - Popular queries
    - Agent comparison
    """
    
    def __init__(self):
        self.usage_log: List[Dict[str, Any]] = []
        self.performance_metrics: Dict[str, List[float]] = defaultdict(list)
        
    def track_query(
        self,
        agent_id: str,
        query: str,
        response_time: float,
        success: bool,
        confidence: float,
        context: Optional[Dict[str, Any]] = None
    ):
        """
        Track an agent query for analytics.
        
        Args:
            agent_id: Agent identifier
            query: Query text
            response_time: Response time in seconds
            success: Whether query was successful
            confidence: Confidence score
            context: Additional context
        """
        entry = {
            "timestamp": datetime.utcnow(),
            "agent_id": agent_id,
            "query": query,
            "response_time": response_time,
            "success": success,
            "confidence": confidence,
            "context": context or {}
        }
        
        self.usage_log.append(entry)
        self.performance_metrics[agent_id].append(response_time)
        
        logger.info(f"Tracked query for {agent_id}: {response_time:.2f}s")
    
    def get_usage_stats(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get usage statistics for a time period.
        
        Returns:
            Dictionary with usage statistics
        """
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        # Filter logs by date range
        filtered_logs = [
            log for log in self.usage_log
            if start_date <= log['timestamp'] <= end_date
        ]
        
        # Calculate stats
        total_queries = len(filtered_logs)
        successful_queries = sum(1 for log in filtered_logs if log['success'])
        
        agent_usage = defaultdict(int)
        for log in filtered_logs:
            agent_usage[log['agent_id']] += 1
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_queries": total_queries,
            "successful_queries": successful_queries,
            "success_rate": successful_queries / total_queries if total_queries > 0 else 0,
            "agent_usage": dict(agent_usage),
            "most_used_agent": max(agent_usage.items(), key=lambda x: x[1])[0] if agent_usage else None
        }
    
    def get_performance_metrics(self, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get performance metrics for agent(s).
        
        Args:
            agent_id: Specific agent ID, or None for all agents
            
        Returns:
            Performance metrics dictionary
        """
        if agent_id:
            response_times = self.performance_metrics[agent_id]
            if not response_times:
                return {"agent_id": agent_id, "queries": 0}
            
            return {
                "agent_id": agent_id,
                "queries": len(response_times),
                "avg_response_time": sum(response_times) / len(response_times),
                "min_response_time": min(response_times),
                "max_response_time": max(response_times),
                "p95_response_time": self._percentile(response_times, 95)
            }
        else:
            # All agents
            metrics = {}
            for aid, times in self.performance_metrics.items():
                if times:
                    metrics[aid] = {
                        "queries": len(times),
                        "avg_response_time": sum(times) / len(times),
                        "p95_response_time": self._percentile(times, 95)
                    }
            return metrics
    
    def get_popular_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get most popular queries.
        
        Args:
            limit: Number of queries to return
            
        Returns:
            List of popular queries with frequency
        """
        query_counts = defaultdict(int)
        query_details = {}
        
        for log in self.usage_log:
            query = log['query'][:100]  # Truncate for grouping
            query_counts[query] += 1
            if query not in query_details:
                query_details[query] = {
                    "query": log['query'],
                    "first_seen": log['timestamp'],
                    "agents_used": set()
                }
            query_details[query]['agents_used'].add(log['agent_id'])
        
        # Sort by frequency
        popular = sorted(query_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        
        return [
            {
                "query": query,
                "count": count,
                "agents": list(query_details[query]['agents_used'])
            }
            for query, count in popular
        ]
    
    def get_agent_comparison(self) -> List[Dict[str, Any]]:
        """
        Compare all agents by performance and usage.
        
        Returns:
            List of agent comparison data
        """
        comparison = []
        
        for agent_id in self.performance_metrics.keys():
            perf = self.get_performance_metrics(agent_id)
            
            # Get success rate
            agent_logs = [log for log in self.usage_log if log['agent_id'] == agent_id]
            successes = sum(1 for log in agent_logs if log['success'])
            success_rate = successes / len(agent_logs) if agent_logs else 0
            
            # Get average confidence
            avg_confidence = sum(log['confidence'] for log in agent_logs) / len(agent_logs) if agent_logs else 0
            
            comparison.append({
                "agent_id": agent_id,
                "total_queries": perf['queries'],
                "avg_response_time": perf['avg_response_time'],
                "success_rate": success_rate,
                "avg_confidence": avg_confidence
            })
        
        return sorted(comparison, key=lambda x: x['total_queries'], reverse=True)
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile"""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """
        Get comprehensive dashboard data.
        
        Returns:
            All analytics data for dashboard display
        """
        return {
            "usage_stats": self.get_usage_stats(),
            "performance_metrics": self.get_performance_metrics(),
            "popular_queries": self.get_popular_queries(),
            "agent_comparison": self.get_agent_comparison(),
            "generated_at": datetime.utcnow().isoformat()
        }


# Singleton instance
_analytics = AgentAnalytics()


def get_analytics() -> AgentAnalytics:
    """Get the global analytics instance"""
    return _analytics
