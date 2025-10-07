import json
from typing import Any, Dict, List

import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient

import server.main as main


class DummyResponse:
    def __init__(self, status_code: int, payload: Any = None):
        self.status_code = status_code
        self._payload = payload
        self.text = json.dumps(payload) if payload is not None else ""

    def json(self) -> Any:
        return self._payload


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")


def _client() -> TestClient:
    return TestClient(main.app)


def _auth_headers() -> Dict[str, str]:
    return {"Authorization": "Bearer token"}


def test_create_reconciliation_and_add_item(monkeypatch):
    calls: List[Dict[str, Any]] = []

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if method == "POST" and table == "reconciliations":
            payload = [{**(kwargs.get("json") or {}), "id": "rec-1"}]
            return DummyResponse(201, payload)
        if method == "POST" and table == "reconciliation_items":
            calls.append({"table": table, "json": kwargs.get("json")})
            return DummyResponse(201, [])
        if method == "GET" and table == "reconciliation_items":
            return DummyResponse(200, [{"amount": 25, "resolved": False}])
        if method == "PATCH" and table == "reconciliations":
            calls.append({"table": table, "json": kwargs.get("json")})
            return DummyResponse(204, [])
        raise AssertionError(f"unexpected request {method} {table}")

    async def fake_fetch_single(table: str, record_id: str, select: str = "*"):
        if table == "reconciliations":
            return {
                "id": record_id,
                "org_id": "org-1",
                "gl_balance": 100,
                "external_balance": 90,
            }
        raise AssertionError(f"unexpected fetch {table}")

    async def fake_ensure_org_access(user_id: str, org_id: str) -> str:
        assert user_id == "user-1"
        assert org_id == "org-1"
        return "MANAGER"

    async def fake_log_event(**_kwargs):
        return None

    monkeypatch.setattr(main, "supabase_table_request", fake_supabase_table_request)
    monkeypatch.setattr(main, "fetch_single_record", fake_fetch_single)
    monkeypatch.setattr(main, "ensure_org_access_by_id", fake_ensure_org_access)
    monkeypatch.setattr(main, "verify_supabase_jwt", lambda _token: {"sub": "user-1"})
    monkeypatch.setattr(main, "log_activity_event", fake_log_event)

    create_response = _client().post(
        "/api/recon/create",
        headers=_auth_headers(),
        json={
            "orgId": "org-1",
            "engagementId": "eng-1",
            "entityId": "ent-1",
            "periodId": "per-1",
            "type": "bank",
            "externalBalance": 90,
            "controlAccountId": None,
            "preparedByUserId": "user-1",
        },
    )

    assert create_response.status_code == 200
    create_body = create_response.json()
    assert create_body["reconciliation"]["status"] == "IN_PROGRESS"

    add_response = _client().post(
        "/api/recon/add-item",
        headers=_auth_headers(),
        json={
            "orgId": "org-1",
            "reconciliationId": "rec-1",
            "item": {
                "category": "outstanding_checks",
                "amount": 25,
                "reference": "CHK-1",
                "note": "Payroll",
                "resolved": False,
            },
        },
    )

    assert add_response.status_code == 200
    # ensure difference patch call captured
    assert any(call["table"] == "reconciliations" for call in calls)


def test_close_reconciliation(monkeypatch):
    patch_payloads: List[Dict[str, Any]] = []

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if method == "PATCH" and table == "reconciliations":
            patch_payloads.append(kwargs.get("json") or {})
            return DummyResponse(204, [])
        raise AssertionError(f"unexpected request {method} {table}")

    async def fake_fetch_single(table: str, record_id: str, select: str = "*"):
        return {"id": record_id, "org_id": "org-1"}

    async def fake_ensure_org_access(user_id: str, org_id: str) -> str:
        return "MANAGER"

    async def fake_log_event(**_kwargs):
        return None

    monkeypatch.setattr(main, "supabase_table_request", fake_supabase_table_request)
    monkeypatch.setattr(main, "fetch_single_record", fake_fetch_single)
    monkeypatch.setattr(main, "ensure_org_access_by_id", fake_ensure_org_access)
    monkeypatch.setattr(main, "verify_supabase_jwt", lambda _token: {"sub": "user-1"})
    monkeypatch.setattr(main, "log_activity_event", fake_log_event)

    response = _client().post(
        "/api/recon/close",
        headers=_auth_headers(),
        json={
            "orgId": "org-1",
            "reconciliationId": "rec-1",
            "userId": "user-1",
            "scheduleDocumentId": "doc-1",
        },
    )

    assert response.status_code == 200
    assert any(payload.get("status") == "CLOSED" for payload in patch_payloads)
