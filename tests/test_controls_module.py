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


def _auth_headers() -> Dict[str, str]:
    return {"Authorization": "Bearer token"}


def _client() -> TestClient:
    return TestClient(main.app)


def test_create_control_inserts_record(monkeypatch):
    recorded_json: Dict[str, Any] = {}
    activity_events: List[Dict[str, Any]] = []

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if method == "POST" and table == "controls":
            recorded_json.update(kwargs.get("json") or {})
            payload = [{**(kwargs.get("json") or {}), "id": "ctrl-1"}]
            return DummyResponse(201, payload)
        raise AssertionError(f"unexpected request {method} {table}")

    async def fake_ensure_org_access(user_id: str, org_id: str) -> str:
        assert user_id == "user-1"
        assert org_id == "org-1"
        return "MANAGER"

    async def fake_log_activity_event(**payload):
        activity_events.append(payload)

    monkeypatch.setattr(main, "supabase_table_request", fake_supabase_table_request)
    monkeypatch.setattr(main, "ensure_org_access_by_id", fake_ensure_org_access)
    monkeypatch.setattr(main, "verify_supabase_jwt", lambda _token: {"sub": "user-1"})
    monkeypatch.setattr(main, "log_activity_event", fake_log_activity_event)

    response = _client().post(
        "/api/controls",
        headers=_auth_headers(),
        json={
            "orgId": "org-1",
            "engagementId": "eng-1",
            "userId": "user-1",
            "cycle": "Revenue",
            "objective": "Cut-off",
            "description": "Review deferred revenue",
            "frequency": "monthly",
            "owner": "Controller",
            "key": True,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["control"]["id"] == "ctrl-1"
    assert recorded_json["frequency"] == "MONTHLY"
    assert any(event.get("action") == "CTRL_ADDED" for event in activity_events)


def test_run_control_test_records_deficiency(monkeypatch):
    calls: Dict[str, List[Dict[str, Any]]] = {"control_tests": [], "deficiencies": []}

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if method == "POST" and table == "control_tests":
            calls["control_tests"].append(kwargs.get("json") or {})
            payload = [{**(kwargs.get("json") or {}), "id": "test-1"}]
            return DummyResponse(201, payload)
        if method == "POST" and table == "deficiencies":
            calls["deficiencies"].append(kwargs.get("json") or {})
            payload = [{**(kwargs.get("json") or {}), "id": "def-1"}]
            return DummyResponse(201, payload)
        raise AssertionError(f"unexpected request {method} {table}")

    async def fake_fetch_control(table: str, record_id: str, select: str = "*"):
        assert table == "controls"
        assert record_id == "ctrl-1"
        return {"id": "ctrl-1", "org_id": "org-1", "engagement_id": "eng-1"}

    async def fake_ensure_org_access(user_id: str, org_id: str) -> str:
        assert user_id == "user-1"
        assert org_id == "org-1"
        return "MANAGER"

    async def fake_log_event(**_kwargs):
        return None

    monkeypatch.setattr(main, "supabase_table_request", fake_supabase_table_request)
    monkeypatch.setattr(main, "fetch_single_record", fake_fetch_control)
    monkeypatch.setattr(main, "ensure_org_access_by_id", fake_ensure_org_access)
    monkeypatch.setattr(main, "verify_supabase_jwt", lambda _token: {"sub": "user-1"})
    monkeypatch.setattr(main, "log_activity_event", fake_log_event)

    attributes = [
        {"id": f"attr-{index}", "description": "Sample", "passed": index >= 2}
        for index in range(25)
    ]

    response = _client().post(
        "/api/controls/test/run",
        headers=_auth_headers(),
        json={
            "orgId": "org-1",
            "engagementId": "eng-1",
            "controlId": "ctrl-1",
            "userId": "user-1",
            "attributes": attributes,
            "result": "exceptions",
            "deficiencyRecommendation": "Add secondary review",
            "deficiencySeverity": "high",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["deficiency"]["severity"] == "HIGH"
    assert calls["control_tests"]
    assert calls["deficiencies"]


def test_get_controls_returns_rows(monkeypatch):
    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if table == "controls":
            return DummyResponse(200, [{"id": "ctrl-1", "org_id": "org-1"}])
        if table == "itgc_groups":
            return DummyResponse(200, [{"id": "itgc-1"}])
        if table == "deficiencies":
            return DummyResponse(200, [{"id": "def-1"}])
        raise AssertionError(f"unexpected request {method} {table}")

    async def fake_ensure_org_access(user_id: str, org_id: str) -> str:
        assert user_id == "user-1"
        assert org_id == "org-1"
        return "EMPLOYEE"

    monkeypatch.setattr(main, "supabase_table_request", fake_supabase_table_request)
    monkeypatch.setattr(main, "ensure_org_access_by_id", fake_ensure_org_access)
    monkeypatch.setattr(main, "verify_supabase_jwt", lambda _token: {"sub": "user-1"})

    response = _client().get(
        "/api/controls",
        headers=_auth_headers(),
        params={"orgId": "org-1", "engagementId": "eng-1"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["controls"][0]["id"] == "ctrl-1"
    assert body["itgcGroups"][0]["id"] == "itgc-1"
    assert body["deficiencies"][0]["id"] == "def-1"
