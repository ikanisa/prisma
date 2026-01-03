"""
Agent Persistence Layer
Handles database operations for agent executions, conversations, and audit logging
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from uuid import UUID
import structlog

from server.db import get_supabase_client

logger = structlog.get_logger().bind(component="agent_persistence")


class AgentPersistence:
    """Handles persistence of agent executions and conversations"""

    def __init__(self, org_id: str, user_id: str):
        self.org_id = org_id
        self.user_id = user_id
        self.supabase = get_supabase_client()

    async def create_execution(
        self,
        agent_id: str,
        provider: str,
        model: str,
        input_text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a new agent execution record"""
        try:
            execution = {
                "agent_id": agent_id,
                "org_id": self.org_id,
                "user_id": self.user_id,
                "provider": provider,
                "model": model,
                "input_text": input_text,
                "context": context or {},
                "status": "running",
                "started_at": datetime.utcnow().isoformat()
            }

            result = self.supabase.table("agent_executions").insert(execution).execute()
            execution_id = result.data[0]["id"]

            logger.info(
                "agent_execution_created",
                execution_id=execution_id,
                agent_id=agent_id,
                org_id=self.org_id
            )

            return execution_id
        except Exception as e:
            logger.error("failed_to_create_execution", error=str(e))
            raise

    async def update_execution(
        self,
        execution_id: str,
        output_text: Optional[str] = None,
        tool_calls: Optional[List[Dict]] = None,
        tool_results: Optional[List[Dict]] = None,
        tokens_input: Optional[int] = None,
        tokens_output: Optional[int] = None,
        tokens_total: Optional[int] = None,
        cost_usd: Optional[float] = None,
        status: Optional[str] = None,
        error_message: Optional[str] = None,
        duration_ms: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Update an agent execution record"""
        try:
            updates = {}

            if output_text is not None:
                updates["output_text"] = output_text
            if tool_calls is not None:
                updates["tool_calls"] = tool_calls
            if tool_results is not None:
                updates["tool_results"] = tool_results
            if tokens_input is not None:
                updates["tokens_input"] = tokens_input
            if tokens_output is not None:
                updates["tokens_output"] = tokens_output
            if tokens_total is not None:
                updates["tokens_total"] = tokens_total
            if cost_usd is not None:
                updates["cost_usd"] = cost_usd
            if status is not None:
                updates["status"] = status
            if error_message is not None:
                updates["error_message"] = error_message
            if duration_ms is not None:
                updates["duration_ms"] = duration_ms
            if metadata is not None:
                updates["metadata"] = metadata

            if status in ["completed", "failed"]:
                updates["completed_at"] = datetime.utcnow().isoformat()

            self.supabase.table("agent_executions").update(updates).eq("id", execution_id).execute()

            logger.info(
                "agent_execution_updated",
                execution_id=execution_id,
                status=status
            )
        except Exception as e:
            logger.error("failed_to_update_execution", execution_id=execution_id, error=str(e))
            raise

    async def create_conversation(
        self,
        agent_id: str,
        domain: str,
        title: Optional[str] = None
    ) -> str:
        """Create a new conversation"""
        try:
            conversation = {
                "org_id": self.org_id,
                "user_id": self.user_id,
                "agent_id": agent_id,
                "domain": domain,
                "title": title or f"Conversation with {agent_id}",
                "status": "active"
            }

            result = self.supabase.table("agent_conversations").insert(conversation).execute()
            conversation_id = result.data[0]["id"]

            logger.info(
                "conversation_created",
                conversation_id=conversation_id,
                agent_id=agent_id
            )

            return conversation_id
        except Exception as e:
            logger.error("failed_to_create_conversation", error=str(e))
            raise

    async def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        execution_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Add a message to a conversation"""
        try:
            message = {
                "conversation_id": conversation_id,
                "execution_id": execution_id,
                "role": role,
                "content": content,
                "metadata": metadata or {}
            }

            self.supabase.table("agent_conversation_messages").insert(message).execute()

            # Update conversation
            self.supabase.table("agent_conversations").update({
                "last_message_at": datetime.utcnow().isoformat(),
                "message_count": self.supabase.rpc("increment", {"row_id": conversation_id, "column": "message_count"})
            }).eq("id", conversation_id).execute()

            logger.info(
                "message_added",
                conversation_id=conversation_id,
                role=role
            )
        except Exception as e:
            logger.error("failed_to_add_message", error=str(e))
            raise

    async def log_audit(
        self,
        agent_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        execution_id: Optional[str] = None,
        before_state: Optional[Dict] = None,
        after_state: Optional[Dict] = None,
        changes: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        contains_pii: bool = False,
        data_classification: str = "internal"
    ):
        """Log an audit event"""
        try:
            audit_entry = {
                "org_id": self.org_id,
                "user_id": self.user_id,
                "agent_id": agent_id,
                "execution_id": execution_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "before_state": before_state,
                "after_state": after_state,
                "changes": changes,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "contains_pii": contains_pii,
                "data_classification": data_classification
            }

            self.supabase.table("agent_audit_log").insert(audit_entry).execute()

            logger.info(
                "audit_logged",
                agent_id=agent_id,
                action=action,
                resource_type=resource_type
            )
        except Exception as e:
            logger.error("failed_to_log_audit", error=str(e))
            # Don't raise - audit logging should not break execution

    async def check_quota(self) -> Dict[str, Any]:
        """Check if organization has quota available"""
        try:
            result = self.supabase.table("agent_usage_quotas").select("*").eq("org_id", self.org_id).execute()

            if not result.data:
                # Create default quota
                await self._create_default_quota()
                return {"has_quota": True, "reason": "default_quota_created"}

            quota = result.data[0]

            # Check daily limits
            if quota["executions_today"] >= quota["max_executions_per_day"]:
                return {"has_quota": False, "reason": "daily_execution_limit_exceeded"}

            if quota["tokens_today"] >= quota["max_tokens_per_day"]:
                return {"has_quota": False, "reason": "daily_token_limit_exceeded"}

            if quota["cost_today_usd"] >= quota["max_cost_per_day_usd"]:
                return {"has_quota": False, "reason": "daily_cost_limit_exceeded"}

            # Check monthly limits
            if quota["executions_this_month"] >= quota["max_executions_per_month"]:
                return {"has_quota": False, "reason": "monthly_execution_limit_exceeded"}

            if quota["tokens_this_month"] >= quota["max_tokens_per_month"]:
                return {"has_quota": False, "reason": "monthly_token_limit_exceeded"}

            if quota["cost_this_month_usd"] >= quota["max_cost_per_month_usd"]:
                return {"has_quota": False, "reason": "monthly_cost_limit_exceeded"}

            return {"has_quota": True, "quota": quota}
        except Exception as e:
            logger.error("failed_to_check_quota", error=str(e))
            # Fail open - allow execution if quota check fails
            return {"has_quota": True, "reason": "quota_check_failed"}

    async def update_quota_usage(
        self,
        tokens: int,
        cost_usd: float
    ):
        """Update quota usage after execution"""
        try:
            # This should use a database function for atomic increment
            self.supabase.rpc("increment_agent_quota", {
                "p_org_id": self.org_id,
                "p_executions": 1,
                "p_tokens": tokens,
                "p_cost_usd": cost_usd
            }).execute()

            logger.info(
                "quota_updated",
                org_id=self.org_id,
                tokens=tokens,
                cost_usd=cost_usd
            )
        except Exception as e:
            logger.error("failed_to_update_quota", error=str(e))
            # Don't raise - quota update failure should not break execution

    async def _create_default_quota(self):
        """Create default quota for organization"""
        default_quota = {
            "org_id": self.org_id,
            "max_executions_per_day": 1000,
            "max_executions_per_month": 30000,
            "max_tokens_per_day": 1000000,
            "max_tokens_per_month": 30000000,
            "max_cost_per_day_usd": 100.00,
            "max_cost_per_month_usd": 3000.00
        }

        self.supabase.table("agent_usage_quotas").insert(default_quota).execute()
        logger.info("default_quota_created", org_id=self.org_id)
