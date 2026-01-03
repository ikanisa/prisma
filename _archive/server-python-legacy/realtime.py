"""
Real-Time WebSocket System

Provides real-time updates for:
- Agent execution monitoring
- Workflow progress
- Notifications
- Collaborative editing
"""

from typing import Dict, Set, Optional, Any
from uuid import UUID
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from enum import Enum
import asyncio
import json


class MessageType(str, Enum):
    """WebSocket message types."""
    # Agent-related
    AGENT_STARTED = "agent_started"
    AGENT_PROGRESS = "agent_progress"
    AGENT_COMPLETED = "agent_completed"
    AGENT_FAILED = "agent_failed"
    
    # Workflow-related
    WORKFLOW_STARTED = "workflow_started"
    WORKFLOW_STEP_STARTED = "workflow_step_started"
    WORKFLOW_STEP_COMPLETED = "workflow_step_completed"
    WORKFLOW_APPROVAL_NEEDED = "workflow_approval_needed"
    WORKFLOW_COMPLETED = "workflow_completed"
    
    # Notifications
    NOTIFICATION = "notification"
    ALERT = "alert"
    
    # Collaboration
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    CURSOR_MOVED = "cursor_moved"
    CONTENT_CHANGED = "content_changed"
    
    # System
    HEARTBEAT = "heartbeat"
    ERROR = "error"


class WebSocketMessage(BaseModel):
    """WebSocket message structure."""
    type: MessageType
    data: Dict[str, Any]
    timestamp: datetime = datetime.utcnow()
    sender_id: Optional[str] = None


class ConnectionManager:
    """
    Manages WebSocket connections and message routing.
    
    Features:
    - Connection pooling
    - Topic-based subscriptions
    - Broadcast messaging
    - Connection health monitoring
    """
    
    def __init__(self):
        # Active connections: {connection_id: WebSocket}
        self.active_connections: Dict[str, WebSocket] = {}
        
        # User connections: {user_id: Set[connection_id]}
        self.user_connections: Dict[str, Set[str]] = {}
        
        # Topic subscriptions: {topic: Set[connection_id]}
        self.topic_subscriptions: Dict[str, Set[str]] = {}
        
        # Connection metadata: {connection_id: metadata}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        
        # Start heartbeat task
        asyncio.create_task(self._heartbeat_loop())
    
    async def connect(
        self,
        websocket: WebSocket,
        connection_id: str,
        user_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Accept and register a WebSocket connection.
        
        Args:
            websocket: FastAPI WebSocket instance
            connection_id: Unique connection identifier
            user_id: User UUID
            metadata: Optional connection metadata
        """
        await websocket.accept()
        
        # Register connection
        self.active_connections[connection_id] = websocket
        
        # Track user connections
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)
        
        # Store metadata
        self.connection_metadata[connection_id] = {
            "user_id": user_id,
            "connected_at": datetime.utcnow(),
            "last_heartbeat": datetime.utcnow(),
            **(metadata or {})
        }
        
        # Send welcome message
        await self.send_personal_message(
            connection_id,
            MessageType.NOTIFICATION,
            {
                "message": "Connected to real-time updates",
                "connection_id": connection_id
            }
        )
    
    def disconnect(self, connection_id: str):
        """
        Disconnect and clean up a connection.
        
        Args:
            connection_id: Connection identifier
        """
        # Remove from active connections
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        # Remove from user connections
        metadata = self.connection_metadata.get(connection_id, {})
        user_id = metadata.get("user_id")
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        # Remove from topic subscriptions
        for topic in list(self.topic_subscriptions.keys()):
            self.topic_subscriptions[topic].discard(connection_id)
            if not self.topic_subscriptions[topic]:
                del self.topic_subscriptions[topic]
        
        # Remove metadata
        if connection_id in self.connection_metadata:
            del self.connection_metadata[connection_id]
    
    async def subscribe(self, connection_id: str, topic: str):
        """
        Subscribe a connection to a topic.
        
        Args:
            connection_id: Connection identifier
            topic: Topic name (e.g., "agent:123", "workflow:456")
        """
        if topic not in self.topic_subscriptions:
            self.topic_subscriptions[topic] = set()
        
        self.topic_subscriptions[topic].add(connection_id)
        
        await self.send_personal_message(
            connection_id,
            MessageType.NOTIFICATION,
            {"message": f"Subscribed to {topic}"}
        )
    
    async def unsubscribe(self, connection_id: str, topic: str):
        """
        Unsubscribe a connection from a topic.
        
        Args:
            connection_id: Connection identifier
            topic: Topic name
        """
        if topic in self.topic_subscriptions:
            self.topic_subscriptions[topic].discard(connection_id)
    
    async def send_personal_message(
        self,
        connection_id: str,
        message_type: MessageType,
        data: Dict[str, Any]
    ):
        """
        Send message to a specific connection.
        
        Args:
            connection_id: Connection identifier
            message_type: Type of message
            data: Message payload
        """
        if connection_id not in self.active_connections:
            return
        
        websocket = self.active_connections[connection_id]
        message = WebSocketMessage(type=message_type, data=data)
        
        try:
            await websocket.send_json(message.model_dump(mode='json'))
        except Exception as e:
            # Connection broken, disconnect
            self.disconnect(connection_id)
    
    async def broadcast_to_topic(
        self,
        topic: str,
        message_type: MessageType,
        data: Dict[str, Any],
        sender_id: Optional[str] = None
    ):
        """
        Broadcast message to all connections subscribed to a topic.
        
        Args:
            topic: Topic name
            message_type: Type of message
            data: Message payload
            sender_id: Optional sender ID (to exclude from broadcast)
        """
        if topic not in self.topic_subscriptions:
            return
        
        message = WebSocketMessage(
            type=message_type,
            data=data,
            sender_id=sender_id
        )
        
        disconnected = []
        
        for connection_id in self.topic_subscriptions[topic]:
            # Skip sender if specified
            if sender_id and connection_id == sender_id:
                continue
            
            if connection_id in self.active_connections:
                websocket = self.active_connections[connection_id]
                try:
                    await websocket.send_json(message.model_dump(mode='json'))
                except Exception:
                    disconnected.append(connection_id)
        
        # Clean up disconnected connections
        for connection_id in disconnected:
            self.disconnect(connection_id)
    
    async def broadcast_to_user(
        self,
        user_id: str,
        message_type: MessageType,
        data: Dict[str, Any]
    ):
        """
        Send message to all connections of a specific user.
        
        Args:
            user_id: User UUID
            message_type: Type of message
            data: Message payload
        """
        if user_id not in self.user_connections:
            return
        
        for connection_id in list(self.user_connections[user_id]):
            await self.send_personal_message(connection_id, message_type, data)
    
    async def broadcast_all(
        self,
        message_type: MessageType,
        data: Dict[str, Any]
    ):
        """
        Broadcast message to all active connections.
        
        Args:
            message_type: Type of message
            data: Message payload
        """
        message = WebSocketMessage(type=message_type, data=data)
        
        disconnected = []
        
        for connection_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message.model_dump(mode='json'))
            except Exception:
                disconnected.append(connection_id)
        
        # Clean up disconnected connections
        for connection_id in disconnected:
            self.disconnect(connection_id)
    
    async def _heartbeat_loop(self):
        """Send periodic heartbeat to all connections."""
        while True:
            await asyncio.sleep(30)  # Every 30 seconds
            
            await self.broadcast_all(
                MessageType.HEARTBEAT,
                {"timestamp": datetime.utcnow().isoformat()}
            )
    
    def get_active_users(self) -> Dict[str, int]:
        """
        Get active users and their connection counts.
        
        Returns:
            Dict of user_id -> connection_count
        """
        return {
            user_id: len(connections)
            for user_id, connections in self.user_connections.items()
        }
    
    def get_topic_subscribers(self, topic: str) -> int:
        """
        Get number of subscribers to a topic.
        
        Args:
            topic: Topic name
        
        Returns:
            Subscriber count
        """
        return len(self.topic_subscriptions.get(topic, set()))


# Global connection manager instance
connection_manager = ConnectionManager()


class RealtimeNotifier:
    """
    High-level interface for sending real-time notifications.
    """
    
    @staticmethod
    async def notify_agent_started(agent_id: UUID, execution_id: UUID):
        """Notify that an agent execution has started."""
        await connection_manager.broadcast_to_topic(
            f"agent:{agent_id}",
            MessageType.AGENT_STARTED,
            {
                "agent_id": str(agent_id),
                "execution_id": str(execution_id),
                "started_at": datetime.utcnow().isoformat()
            }
        )
    
    @staticmethod
    async def notify_agent_progress(
        agent_id: UUID,
        execution_id: UUID,
        progress: float,
        message: str
    ):
        """Notify agent execution progress."""
        await connection_manager.broadcast_to_topic(
            f"agent:{agent_id}",
            MessageType.AGENT_PROGRESS,
            {
                "agent_id": str(agent_id),
                "execution_id": str(execution_id),
                "progress": progress,
                "message": message
            }
        )
    
    @staticmethod
    async def notify_workflow_step_completed(
        workflow_id: UUID,
        execution_id: UUID,
        step_id: str,
        output: Dict[str, Any]
    ):
        """Notify workflow step completion."""
        await connection_manager.broadcast_to_topic(
            f"workflow:{workflow_id}",
            MessageType.WORKFLOW_STEP_COMPLETED,
            {
                "workflow_id": str(workflow_id),
                "execution_id": str(execution_id),
                "step_id": step_id,
                "output": output,
                "completed_at": datetime.utcnow().isoformat()
            }
        )
    
    @staticmethod
    async def notify_approval_needed(
        user_id: UUID,
        approval_id: UUID,
        workflow_execution_id: UUID,
        data_to_approve: Dict[str, Any]
    ):
        """Notify user that approval is needed."""
        await connection_manager.broadcast_to_user(
            str(user_id),
            MessageType.WORKFLOW_APPROVAL_NEEDED,
            {
                "approval_id": str(approval_id),
                "workflow_execution_id": str(workflow_execution_id),
                "data_to_approve": data_to_approve
            }
        )
    
    @staticmethod
    async def notify_user_action(
        topic: str,
        action_type: str,
        user_id: str,
        data: Dict[str, Any]
    ):
        """Notify collaborative user actions."""
        await connection_manager.broadcast_to_topic(
            topic,
            MessageType.CONTENT_CHANGED,
            {
                "action_type": action_type,
                "user_id": user_id,
                "data": data
            }
        )


# Global realtime notifier instance
realtime_notifier = RealtimeNotifier()
