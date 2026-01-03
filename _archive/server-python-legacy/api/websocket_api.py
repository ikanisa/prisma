"""
WebSocket API Endpoint
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from uuid import uuid4
from server.realtime import connection_manager, MessageType
import json

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str = Query(...),
    connection_id: str = Query(default_factory=lambda: str(uuid4()))
):
    """
    WebSocket endpoint for real-time updates.
    
    Query params:
        - user_id: User UUID
        - connection_id: Optional connection identifier
    
    Supported message types:
        - subscribe: Subscribe to a topic
        - unsubscribe: Unsubscribe from a topic
        - ping: Health check
    """
    await connection_manager.connect(
        websocket=websocket,
        connection_id=connection_id,
        user_id=user_id
    )
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("type")
            payload = message.get("data", {})
            
            if message_type == "subscribe":
                topic = payload.get("topic")
                if topic:
                    await connection_manager.subscribe(connection_id, topic)
            
            elif message_type == "unsubscribe":
                topic = payload.get("topic")
                if topic:
                    await connection_manager.unsubscribe(connection_id, topic)
            
            elif message_type == "ping":
                await connection_manager.send_personal_message(
                    connection_id,
                    MessageType.HEARTBEAT,
                    {"pong": True}
                )
    
    except WebSocketDisconnect:
        connection_manager.disconnect(connection_id)
    except Exception as e:
        # Log error and disconnect
        print(f"WebSocket error: {e}")
        connection_manager.disconnect(connection_id)


@router.get("/ws/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics."""
    return {
        "active_connections": len(connection_manager.active_connections),
        "active_users": connection_manager.get_active_users(),
        "total_topics": len(connection_manager.topic_subscriptions)
    }
