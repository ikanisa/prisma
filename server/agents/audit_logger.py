"""
Agent Audit Logger
Comprehensive audit logging for AI agent operations.
"""
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
import json
import logging
import uuid

logger = logging.getLogger(__name__)


class AuditEventType(Enum):
    """Types of audit events"""
    AGENT_EXECUTION = "agent_execution"
    AGENT_CREATION = "agent_creation"
    AGENT_UPDATE = "agent_update"
    AGENT_DELETION = "agent_deletion"
    TOOL_INVOCATION = "tool_invocation"
    ACCESS_GRANTED = "access_granted"
    ACCESS_DENIED = "access_denied"
    PII_DETECTED = "pii_detected"
    ERROR_OCCURRED = "error_occurred"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    DATA_EXPORT = "data_export"
    CONFIGURATION_CHANGE = "configuration_change"


class AuditSeverity(Enum):
    """Severity levels for audit events"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class AuditEvent:
    """Represents an audit event"""
    event_id: str
    event_type: AuditEventType
    severity: AuditSeverity
    timestamp: str
    org_id: str
    user_id: str
    agent_id: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    request_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    input_hash: Optional[str]  # Hash of input for privacy
    output_hash: Optional[str]  # Hash of output for privacy
    token_usage: Optional[Dict[str, int]]
    duration_ms: Optional[int]
    success: bool
    error_message: Optional[str]
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        data = asdict(self)
        data["event_type"] = self.event_type.value
        data["severity"] = self.severity.value
        return data
    
    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), default=str)


class AuditLogger:
    """
    Audit logger for AI agent operations.
    
    Provides:
    - Comprehensive audit trail for compliance
    - Privacy-preserving logging (hashes instead of raw data)
    - Structured event logging
    - Integration with external audit systems
    """
    
    def __init__(self):
        self._events: List[AuditEvent] = []
        self._max_local_events = 10000  # Keep last 10K events in memory
    
    def log_agent_execution(
        self,
        org_id: str,
        user_id: str,
        agent_id: str,
        input_text: str,
        output_text: str,
        success: bool,
        duration_ms: int,
        token_usage: Optional[Dict[str, int]] = None,
        request_id: Optional[str] = None,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditEvent:
        """
        Log an agent execution event.
        
        This logs the execution without storing raw input/output
        for privacy compliance.
        """
        from server.agents.security import get_security_service
        security = get_security_service()
        
        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            event_type=AuditEventType.AGENT_EXECUTION,
            severity=AuditSeverity.INFO if success else AuditSeverity.ERROR,
            timestamp=datetime.utcnow().isoformat() + "Z",
            org_id=org_id,
            user_id=user_id,
            agent_id=agent_id,
            action="execute",
            resource_type="agent",
            resource_id=agent_id,
            request_id=request_id,
            ip_address=None,  # Would be populated from request context
            user_agent=None,
            input_hash=security.hash_for_audit(input_text),
            output_hash=security.hash_for_audit(output_text) if output_text else None,
            token_usage=token_usage,
            duration_ms=duration_ms,
            success=success,
            error_message=error_message,
            metadata=metadata or {},
        )
        
        self._store_event(event)
        return event
    
    def log_tool_invocation(
        self,
        org_id: str,
        user_id: str,
        agent_id: str,
        tool_name: str,
        tool_args: Dict[str, Any],
        tool_result: Any,
        success: bool,
        duration_ms: int,
        request_id: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> AuditEvent:
        """Log a tool invocation event"""
        from server.agents.security import get_security_service
        security = get_security_service()
        
        # Hash the args and result for privacy
        args_str = json.dumps(tool_args, sort_keys=True, default=str)
        result_str = json.dumps(tool_result, default=str) if tool_result else ""
        
        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            event_type=AuditEventType.TOOL_INVOCATION,
            severity=AuditSeverity.INFO if success else AuditSeverity.WARNING,
            timestamp=datetime.utcnow().isoformat() + "Z",
            org_id=org_id,
            user_id=user_id,
            agent_id=agent_id,
            action=f"invoke_tool:{tool_name}",
            resource_type="tool",
            resource_id=tool_name,
            request_id=request_id,
            ip_address=None,
            user_agent=None,
            input_hash=security.hash_for_audit(args_str),
            output_hash=security.hash_for_audit(result_str) if result_str else None,
            token_usage=None,
            duration_ms=duration_ms,
            success=success,
            error_message=error_message,
            metadata={
                "tool_name": tool_name,
                "arg_keys": list(tool_args.keys()),
            },
        )
        
        self._store_event(event)
        return event
    
    def log_access_decision(
        self,
        org_id: str,
        user_id: str,
        agent_id: str,
        action: str,
        allowed: bool,
        reason: str,
        request_id: Optional[str] = None,
    ) -> AuditEvent:
        """Log an access control decision"""
        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            event_type=AuditEventType.ACCESS_GRANTED if allowed else AuditEventType.ACCESS_DENIED,
            severity=AuditSeverity.INFO if allowed else AuditSeverity.WARNING,
            timestamp=datetime.utcnow().isoformat() + "Z",
            org_id=org_id,
            user_id=user_id,
            agent_id=agent_id,
            action=action,
            resource_type="agent",
            resource_id=agent_id,
            request_id=request_id,
            ip_address=None,
            user_agent=None,
            input_hash=None,
            output_hash=None,
            token_usage=None,
            duration_ms=None,
            success=allowed,
            error_message=None if allowed else reason,
            metadata={
                "access_decision": "granted" if allowed else "denied",
                "reason": reason,
            },
        )
        
        self._store_event(event)
        return event
    
    def log_pii_detection(
        self,
        org_id: str,
        user_id: str,
        agent_id: Optional[str],
        pii_types: List[str],
        action_taken: str,
        request_id: Optional[str] = None,
    ) -> AuditEvent:
        """Log PII detection event"""
        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            event_type=AuditEventType.PII_DETECTED,
            severity=AuditSeverity.WARNING,
            timestamp=datetime.utcnow().isoformat() + "Z",
            org_id=org_id,
            user_id=user_id,
            agent_id=agent_id,
            action="pii_detected",
            resource_type="request",
            resource_id=None,
            request_id=request_id,
            ip_address=None,
            user_agent=None,
            input_hash=None,
            output_hash=None,
            token_usage=None,
            duration_ms=None,
            success=True,
            error_message=None,
            metadata={
                "pii_types": pii_types,
                "action_taken": action_taken,
            },
        )
        
        self._store_event(event)
        return event
    
    def log_error(
        self,
        org_id: str,
        user_id: str,
        agent_id: Optional[str],
        error_type: str,
        error_message: str,
        request_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AuditEvent:
        """Log an error event"""
        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            event_type=AuditEventType.ERROR_OCCURRED,
            severity=AuditSeverity.ERROR,
            timestamp=datetime.utcnow().isoformat() + "Z",
            org_id=org_id,
            user_id=user_id,
            agent_id=agent_id,
            action=f"error:{error_type}",
            resource_type="system",
            resource_id=None,
            request_id=request_id,
            ip_address=None,
            user_agent=None,
            input_hash=None,
            output_hash=None,
            token_usage=None,
            duration_ms=None,
            success=False,
            error_message=error_message,
            metadata=metadata or {},
        )
        
        self._store_event(event)
        return event
    
    def log_rate_limit(
        self,
        org_id: str,
        user_id: str,
        limit_type: str,
        current_count: int,
        max_count: int,
        request_id: Optional[str] = None,
    ) -> AuditEvent:
        """Log rate limit exceeded event"""
        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            event_type=AuditEventType.RATE_LIMIT_EXCEEDED,
            severity=AuditSeverity.WARNING,
            timestamp=datetime.utcnow().isoformat() + "Z",
            org_id=org_id,
            user_id=user_id,
            agent_id=None,
            action="rate_limit_exceeded",
            resource_type="rate_limit",
            resource_id=limit_type,
            request_id=request_id,
            ip_address=None,
            user_agent=None,
            input_hash=None,
            output_hash=None,
            token_usage=None,
            duration_ms=None,
            success=False,
            error_message=f"Rate limit exceeded: {current_count}/{max_count}",
            metadata={
                "limit_type": limit_type,
                "current_count": current_count,
                "max_count": max_count,
            },
        )
        
        self._store_event(event)
        return event
    
    def log_configuration_change(
        self,
        org_id: str,
        user_id: str,
        agent_id: str,
        change_type: str,
        old_value: Optional[Any],
        new_value: Optional[Any],
        request_id: Optional[str] = None,
    ) -> AuditEvent:
        """Log agent configuration change"""
        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            event_type=AuditEventType.CONFIGURATION_CHANGE,
            severity=AuditSeverity.INFO,
            timestamp=datetime.utcnow().isoformat() + "Z",
            org_id=org_id,
            user_id=user_id,
            agent_id=agent_id,
            action=f"config_change:{change_type}",
            resource_type="agent_config",
            resource_id=agent_id,
            request_id=request_id,
            ip_address=None,
            user_agent=None,
            input_hash=None,
            output_hash=None,
            token_usage=None,
            duration_ms=None,
            success=True,
            error_message=None,
            metadata={
                "change_type": change_type,
                "old_value": str(old_value) if old_value else None,
                "new_value": str(new_value) if new_value else None,
            },
        )
        
        self._store_event(event)
        return event
    
    def _store_event(self, event: AuditEvent):
        """Store event in memory and log to structured logger"""
        # Add to in-memory store
        self._events.append(event)
        
        # Trim old events
        if len(self._events) > self._max_local_events:
            self._events = self._events[-self._max_local_events:]
        
        # Log to structured logger for external collection
        logger.info(
            "audit_event",
            extra={
                "audit": event.to_dict(),
            },
        )
    
    def get_events(
        self,
        org_id: Optional[str] = None,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        event_type: Optional[AuditEventType] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[AuditEvent]:
        """
        Query audit events with filters.
        
        In production, this would query a database.
        """
        events = self._events
        
        if org_id:
            events = [e for e in events if e.org_id == org_id]
        if user_id:
            events = [e for e in events if e.user_id == user_id]
        if agent_id:
            events = [e for e in events if e.agent_id == agent_id]
        if event_type:
            events = [e for e in events if e.event_type == event_type]
        if start_time:
            start_iso = start_time.isoformat()
            events = [e for e in events if e.timestamp >= start_iso]
        if end_time:
            end_iso = end_time.isoformat()
            events = [e for e in events if e.timestamp <= end_iso]
        
        # Sort by timestamp descending and limit
        events = sorted(events, key=lambda e: e.timestamp, reverse=True)
        return events[:limit]
    
    def get_summary(
        self,
        org_id: str,
        period_hours: int = 24,
    ) -> Dict[str, Any]:
        """
        Get audit summary for an organization.
        """
        from datetime import timedelta
        
        start_time = datetime.utcnow() - timedelta(hours=period_hours)
        events = self.get_events(org_id=org_id, start_time=start_time, limit=10000)
        
        summary = {
            "period_hours": period_hours,
            "total_events": len(events),
            "by_type": {},
            "by_severity": {},
            "by_agent": {},
            "success_rate": 0.0,
            "errors": [],
        }
        
        success_count = 0
        for event in events:
            # Count by type
            type_key = event.event_type.value
            summary["by_type"][type_key] = summary["by_type"].get(type_key, 0) + 1
            
            # Count by severity
            sev_key = event.severity.value
            summary["by_severity"][sev_key] = summary["by_severity"].get(sev_key, 0) + 1
            
            # Count by agent
            if event.agent_id:
                summary["by_agent"][event.agent_id] = summary["by_agent"].get(event.agent_id, 0) + 1
            
            if event.success:
                success_count += 1
            elif event.error_message:
                summary["errors"].append({
                    "event_id": event.event_id,
                    "timestamp": event.timestamp,
                    "error": event.error_message,
                })
        
        if len(events) > 0:
            summary["success_rate"] = success_count / len(events)
        
        # Limit errors to most recent 10
        summary["errors"] = summary["errors"][:10]
        
        return summary


# Singleton instance
_audit_logger: Optional[AuditLogger] = None


def get_audit_logger() -> AuditLogger:
    """Get the global audit logger instance"""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = AuditLogger()
    return _audit_logger
