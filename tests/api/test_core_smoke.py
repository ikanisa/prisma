import importlib
import json
from typing import Any, Dict, List

import pytest

pytest.importorskip('fastapi')

from fastapi.testclient import TestClient

import server.main as main


class DummyResponse:
    def __init__(self, status_code: int = 200, payload: Any = None):
        self.status_code = status_code
        self._payload = payload
        self.text = json.dumps(payload) if payload is not None else ''

    def json(self) -> Any:
        return self._payload


@pytest.fixture(autouse=True)
def mock_auth_and_supabase(monkeypatch):
    async def fake_resolve_org_context(_user_id: str, _org_slug: str) -> Dict[str, str]:
        return {"org_id": "org-123", "role": "SYSTEM_ADMIN"}

    async def fake_ensure_org_access_by_id(_user_id: str, _org_id: str) -> str:
        return "SYSTEM_ADMIN"

    def fake_verify(token: str) -> Dict[str, str]:
        return {"sub": "user-123"}

    def fake_fetch_single_record(table: str, record_id: str, select: str = "*"):
        if table == "documents":
            return {
                "id": record_id,
                "org_id": "org-123",
                "deleted": False,
                "storage_path": "org-org-123/docs/general/demo.pdf",
                "name": "Demo",
            }
        if table == "notifications":
            return {
                "id": record_id,
                "org_id": "org-123",
                "user_id": "user-123",
                "read": False,
            }
        return {"id": record_id}

    async def fake_supabase_table_request(method: str, table: str, **_: Dict[str, Any]) -> DummyResponse:
        if method == "GET" and table == "tasks":
            payload: List[Dict[str, Any]] = [
                {
                    "id": "task-1",
                    "org_id": "org-123",
                    "engagement_id": None,
                    "title": "Demo task",
                    "description": "Verify smoke tests",
                    "status": "TODO",
                    "priority": "MEDIUM",
                    "due_date": None,
                    "assigned_to": None,
                    "created_by": "user-123",
                    "created_at": "2025-01-01T00:00:00Z",
                    "updated_at": "2025-01-01T00:00:00Z",
                }
            ]
            return DummyResponse(200, payload)

        if method == "GET" and table == "documents":
            payload = [
                {
                    "id": "doc-1",
                    "org_id": "org-123",
                    "entity_id": None,
                    "name": "Engagement Letter",
                    "repo_folder": "01_Legal",
                    "mime_type": "application/pdf",
                    "file_size": 1024,
                    "storage_path": "org-org-123/docs/general/demo.pdf",
                    "uploaded_by": "user-123",
                    "classification": "LEGAL",
                    "deleted": False,
                    "created_at": "2025-01-01T00:00:00Z",
                }
            ]
            return DummyResponse(200, payload)

        if method == "GET" and table == "notifications":
            payload = [
                {
                    "id": "notif-1",
                    "org_id": "org-123",
                    "user_id": "user-123",
                    "kind": "TASK",
                    "title": "Task assigned",
                    "body": "Demo",
                    "read": False,
                    "created_at": "2025-01-01T00:00:00Z",
                }
            ]
            return DummyResponse(200, payload)

        if method == "PATCH" and table == "notifications":
            return DummyResponse(204, [])

        raise AssertionError(f"Unhandled supabase_table_request: {method} {table}")

    async def fake_supabase_request(*_args: Any, **_kwargs: Any) -> DummyResponse:
        return DummyResponse(200, {"signedURL": "https://example.supabase.co/storage/v1/object/sign"})

    monkeypatch.setattr(main, "resolve_org_context", fake_resolve_org_context)
    monkeypatch.setattr(main, "ensure_org_access_by_id", fake_ensure_org_access_by_id)
    monkeypatch.setattr(main, "verify_supabase_jwt", fake_verify)
    monkeypatch.setattr(main, "supabase_table_request", fake_supabase_table_request)
    monkeypatch.setattr(main, "supabase_request", fake_supabase_request)
    monkeypatch.setattr(main, "fetch_single_record", fake_fetch_single_record)

    yield


def _client() -> TestClient:
    return TestClient(main.app)


def test_tasks_endpoint_smoke():
    response = _client().get(
        "/v1/tasks",
        headers={"Authorization": "Bearer token"},
        params={"orgSlug": "demo"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert "tasks" in payload
    assert any(task["title"] == "Demo task" for task in payload["tasks"])


def test_documents_endpoint_smoke():
    response = _client().get(
        "/v1/storage/documents",
        headers={"Authorization": "Bearer token"},
        params={"orgSlug": "demo"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert "documents" in payload
    assert any(doc["name"] == "Engagement Letter" for doc in payload["documents"])


def test_notifications_endpoints_smoke():
    client = _client()

    list_response = client.get(
        "/v1/notifications",
        headers={"Authorization": "Bearer token"},
        params={"orgSlug": "demo"},
    )
    assert list_response.status_code == 200
    assert list_response.json()["notifications"][0]["id"] == "notif-1"

    mark_all_response = client.post(
        "/v1/notifications/mark-all",
        headers={"Authorization": "Bearer token"},
        json={"orgSlug": "demo"},
    )
    assert mark_all_response.status_code == 200
    assert mark_all_response.json() == {"status": "ok"}
