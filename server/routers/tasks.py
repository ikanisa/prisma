"""
Tasks Router - Task and engagement management endpoints
Handles task CRUD, comments, and document attachments
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/v1/tasks", tags=["tasks"])


# ============================================================================
# Pydantic Models
# ============================================================================


class TaskCreateRequest(BaseModel):
    orgSlug: str
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    status: str = "OPEN"
    priority: str = "MEDIUM"
    engagementId: Optional[str] = None
    assigneeId: Optional[str] = None
    dueDate: Optional[str] = None


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigneeId: Optional[str] = None
    dueDate: Optional[str] = None


class TaskCommentRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)


class TaskAttachmentRequest(BaseModel):
    documentId: str


# ============================================================================
# Constants (to be imported from main.py or config)
# ============================================================================
TASK_STATUS_VALUES = ["OPEN", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]


# ============================================================================
# Endpoints
# ============================================================================


@router.get("")
async def list_tasks(
    org_slug: str = Query(..., alias="orgSlug"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(default=None),
    assignee: Optional[str] = Query(default=None),
    engagement: Optional[str] = Query(default=None, alias="engagementId"),
    auth: Dict[str, Any] = Depends(require_auth),  # type: ignore[name-defined]
) -> Dict[str, Any]:
    """
    List tasks with filtering and pagination.
    
    Filters:
    - status: OPEN, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED, or all
    - assignee: Filter by assigned user ID
    - engagement: Filter by engagement ID
    """
    context = await resolve_org_context(auth["sub"], org_slug)  # type: ignore[name-defined]

    if status and status not in TASK_STATUS_VALUES and status != "all":
        raise HTTPException(status_code=400, detail="invalid status filter")

    params: Dict[str, Any] = {
        "select": "id,org_id,engagement_id,title,description,status,priority,due_date,assigned_to,created_by,created_at,updated_at",
        "org_id": f"eq.{context['org_id']}",
        "order": "created_at.desc",
        "limit": str(limit),
        "offset": str(offset),
    }

    if status and status != "all":
        params["status"] = f"eq.{status}"
    if assignee:
        params["assigned_to"] = f"eq.{assignee}"
    if engagement:
        params["engagement_id"] = f"eq.{engagement}"

    response = await supabase_table_request("GET", "tasks", params=params)  # type: ignore[name-defined]
    if response.status_code != 200:
        logger.error("tasks.list_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to fetch tasks")

    rows = response.json()
    return {"tasks": [map_task_response(row) for row in rows]}  # type: ignore[name-defined]


@router.post("")
async def create_task(
    payload: TaskCreateRequest,
    auth: Dict[str, Any] = Depends(require_auth)  # type: ignore[name-defined]
) -> Dict[str, Any]:
    """
    Create a new task.
    
    Requires tasks.create permission.
    Sends notification to assignee if different from creator.
    """
    context = await resolve_org_context(auth["sub"], payload.orgSlug)  # type: ignore[name-defined]
    role = normalise_role(context.get("role"))  # type: ignore[name-defined]
    ensure_permission_for_role(role, "tasks.create")  # type: ignore[name-defined]
    
    task_row = await insert_task_record(  # type: ignore[name-defined]
        org_id=context["org_id"],
        creator_id=auth["sub"],
        payload={
            "title": payload.title,
            "description": payload.description,
            "status": payload.status,
            "priority": payload.priority,
            "engagement_id": payload.engagementId,
            "assigned_to": payload.assigneeId,
            "due_date": payload.dueDate,
        },
    )

    if payload.assigneeId and payload.assigneeId != auth["sub"]:
        await create_notification(  # type: ignore[name-defined]
            org_id=context["org_id"],
            user_id=payload.assigneeId,
            kind="TASK",
            title=f"New task assigned: {payload.title}",
            body=payload.description,
        )

    return {"task": map_task_response(task_row)}  # type: ignore[name-defined]


@router.patch("/{task_id}")
async def update_task(
    task_id: str,
    payload: TaskUpdateRequest,
    auth: Dict[str, Any] = Depends(require_auth),  # type: ignore[name-defined]
) -> Dict[str, Any]:
    """
    Update an existing task.
    
    Requires tasks.update permission.
    Sends notification if assignee is changed.
    """
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")

    task = await fetch_single_record("tasks", task_id, select="id,org_id,title,assigned_to")  # type: ignore[name-defined]
    if not task:
        raise HTTPException(status_code=404, detail="task not found")

    await ensure_org_access_by_id(actor_id, task["org_id"])  # type: ignore[name-defined]
    context = await resolve_org_context(actor_id, None, org_id=task["org_id"])  # type: ignore[name-defined]
    role = normalise_role(context.get("role"))  # type: ignore[name-defined]
    ensure_permission_for_role(role, "tasks.update")  # type: ignore[name-defined]

    updates: Dict[str, Any] = {}
    if payload.title is not None:
        updates["title"] = payload.title
    if payload.description is not None:
        updates["description"] = payload.description
    if payload.status is not None:
        if payload.status not in TASK_STATUS_VALUES:
            raise HTTPException(status_code=400, detail="invalid status")
        updates["status"] = payload.status
    if payload.priority is not None:
        updates["priority"] = payload.priority
    if payload.assigneeId is not None:
        updates["assigned_to"] = payload.assigneeId
    if payload.dueDate is not None:
        updates["due_date"] = payload.dueDate

    if not updates:
        return {"task": map_task_response(task)}  # type: ignore[name-defined]

    updates["updated_at"] = iso_now()  # type: ignore[name-defined]

    response = await supabase_table_request(  # type: ignore[name-defined]
        "PATCH",
        "tasks",
        params={"id": f"eq.{task_id}"},
        body=updates,
    )
    if response.status_code != 200:
        logger.error("tasks.update_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to update task")

    updated_task = response.json()[0] if response.json() else task

    if payload.assigneeId and payload.assigneeId != task.get("assigned_to"):
        await create_notification(  # type: ignore[name-defined]
            org_id=task["org_id"],
            user_id=payload.assigneeId,
            kind="TASK",
            title=f"Task reassigned: {task.get('title', 'Untitled')}",
            body=f"You have been assigned a task.",
        )

    return {"task": map_task_response(updated_task)}  # type: ignore[name-defined]


@router.get("/{task_id}/comments")
async def list_task_comments(
    task_id: str,
    auth: Dict[str, Any] = Depends(require_auth),  # type: ignore[name-defined]
) -> Dict[str, Any]:
    """
    List comments for a task.
    
    Returns comments in descending order (newest first).
    """
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")

    task = await fetch_single_record("tasks", task_id, select="id,org_id")  # type: ignore[name-defined]
    if not task:
        raise HTTPException(status_code=404, detail="task not found")

    await ensure_org_access_by_id(actor_id, task["org_id"])  # type: ignore[name-defined]

    response = await supabase_table_request(  # type: ignore[name-defined]
        "GET",
        "task_comments",
        params={
            "task_id": f"eq.{task_id}",
            "order": "created_at.desc",
        },
    )
    if response.status_code != 200:
        logger.error("task_comments.list_failed", status=response.status_code)
        raise HTTPException(status_code=502, detail="failed to fetch comments")

    return {"comments": response.json()}


@router.post("/{task_id}/comments")
async def create_task_comment(
    task_id: str,
    payload: TaskCommentRequest,
    auth: Dict[str, Any] = Depends(require_auth),  # type: ignore[name-defined]
) -> Dict[str, Any]:
    """
    Create a comment on a task.
    
    Sends notification to task assignee if different from commenter.
    """
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")

    task = await fetch_single_record("tasks", task_id, select="id,org_id,title,assigned_to")  # type: ignore[name-defined]
    if not task:
        raise HTTPException(status_code=404, detail="task not found")

    await ensure_org_access_by_id(actor_id, task["org_id"])  # type: ignore[name-defined]

    response = await supabase_table_request(  # type: ignore[name-defined]
        "POST",
        "task_comments",
        body={
            "task_id": task_id,
            "user_id": actor_id,
            "body": payload.body,
        },
    )
    if response.status_code != 201:
        logger.error("task_comments.create_failed", status=response.status_code)
        raise HTTPException(status_code=502, detail="failed to create comment")

    comment = response.json()[0]

    if task.get("assigned_to") and task["assigned_to"] != actor_id:
        await create_notification(  # type: ignore[name-defined]
            org_id=task["org_id"],
            user_id=task["assigned_to"],
            kind="TASK",
            title=f"New comment on: {task.get('title', 'Untitled')}",
            body=payload.body[:200],
        )

    return {"comment": comment}


@router.post("/{task_id}/attachments")
async def attach_document_to_task(
    task_id: str,
    payload: TaskAttachmentRequest,
    auth: Dict[str, Any] = Depends(require_auth),  # type: ignore[name-defined]
) -> Dict[str, Any]:
    """
    Attach a document to a task.
    
    Document must belong to the same organization.
    """
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")

    task = await fetch_single_record("tasks", task_id, select="id,org_id")  # type: ignore[name-defined]
    if not task:
        raise HTTPException(status_code=404, detail="task not found")

    await ensure_org_access_by_id(actor_id, task["org_id"])  # type: ignore[name-defined]

    document = await fetch_single_record("documents", payload.documentId, select="id,org_id")  # type: ignore[name-defined]
    if not document or document["org_id"] != task["org_id"]:
        raise HTTPException(status_code=404, detail="document not found or not in same org")

    response = await supabase_table_request(  # type: ignore[name-defined]
        "POST",
        "task_attachments",
        body={
            "task_id": task_id,
            "document_id": payload.documentId,
            "attached_by": actor_id,
        },
    )
    if response.status_code != 201:
        logger.error("task_attachments.create_failed", status=response.status_code)
        raise HTTPException(status_code=502, detail="failed to attach document")

    return {"attachment": response.json()[0]}
