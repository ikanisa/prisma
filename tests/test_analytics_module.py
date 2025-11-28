import json
from typing import Any, Dict, List

import pytest
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


def test_run_ada_persists_summary(monkeypatch):
    run_payloads: List[Dict[str, Any]] = []
    exception_payloads: List[Dict[str, Any]] = []
    update_payloads: List[Dict[str, Any]] = []
    activity_events: List[Dict[str, Any]] = []
    inserted_exceptions: List[Dict[str, Any]] = []

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if method == "POST" and table == "ada_runs":
            run_payloads.append(kwargs.get("json") or {})
            payload = [{**(kwargs.get("json") or {}), "id": "run-1", "started_at": "2025-02-01T00:00:00Z"}]
            return DummyResponse(201, payload)
        if method == "POST" and table == "ada_exceptions":
            rows = kwargs.get("json") or []
            exception_payloads.extend(rows)
            inserted = [
                {
                    **row,
                    "id": f"exc-{index}",
                    "created_at": "2025-02-01T00:00:00Z",
                    "updated_at": "2025-02-01T00:00:00Z",
                    "disposition": "OPEN",
                }
                for index, row in enumerate(rows, start=1)
            ]
            inserted_exceptions[:] = inserted
            return DummyResponse(201, inserted)
        if method == "PATCH" and table == "ada_runs":
            update_payloads.append(kwargs.get("json") or {})
            payload = [
                {
                    **run_payloads[0],
                    **(kwargs.get("json") or {}),
                    "id": "run-1",
                    "ada_exceptions": inserted_exceptions,
                }
            ]
            return DummyResponse(200, payload)
        raise AssertionError(f"unexpected request {method} {table}")

    async def fake_ensure_org_access(user_id: str, org_id: str) -> str:
        assert user_id == "user-1"
        assert org_id == "org-1"
        return "MANAGER"

    async def fake_log_activity_event(**kwargs):
        activity_events.append(kwargs)

    monkeypatch.setattr(main, "supabase_table_request", fake_supabase_table_request)
    monkeypatch.setattr(main, "ensure_org_access_by_id", fake_ensure_org_access)
    monkeypatch.setattr(main, "verify_supabase_jwt", lambda _token: {"sub": "user-1"})
    monkeypatch.setattr(main, "log_activity_event", fake_log_activity_event)

    response = _client().post(
        "/api/ada/run",
        headers=_auth_headers(),
        json={
            "orgId": "org-1",
            "engagementId": "eng-1",
            "userId": "user-1",
            "datasetRef": "journal-q1",
            "kind": "JE",
            "params": {
                "periodEnd": "2025-01-31",
                "latePostingDays": 3,
                "roundAmountThreshold": 1000,
                "weekendFlag": True,
                "entries": [
                    {
                        "id": "je-1",
                        "postedAt": "2025-02-10T00:00:00Z",
                        "amount": 5000,
                        "account": "4000",
                        "description": "Manual journal",
                        "createdAt": "2025-02-08T00:00:00Z",
                        "createdBy": "user-1",
                    }
                ],
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["run"]["summary"]["datasetHash"] == run_payloads[0]["dataset_hash"]
    assert body["run"].get("ada_exceptions")
    assert body["run"].get("manifest", {}).get("kind") == "analytics.je"
    assert update_payloads[0]["summary"]["totals"]["entries"] == 1
    assert any(event.get("action") == "ADA_RUN_COMPLETED" for event in activity_events)


def test_update_ada_exception_records_resolution(monkeypatch):
    captured_update: Dict[str, Any] = {}
    activity_events: List[Dict[str, Any]] = []

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if method == "GET" and table == "ada_exceptions":
            return DummyResponse(
                200,
                [
                    {
                        "id": "exc-1",
                        "run_id": "run-1",
                        "disposition": "OPEN",
                        "note": None,
                        "misstatement_id": None,
                    }
                ],
            )
        if method == "GET" and table == "ada_runs":
            return DummyResponse(200, [{"id": "run-1", "org_id": "org-1", "engagement_id": "eng-1"}])
        if method == "PATCH" and table == "ada_exceptions":
            captured_update.update(kwargs)
            payload = [
                {
                    "id": "exc-1",
                    "run_id": "run-1",
                    "disposition": kwargs.get("json", {}).get("disposition", "RESOLVED"),
                    "note": kwargs.get("json", {}).get("note"),
                    "misstatement_id": kwargs.get("json", {}).get("misstatement_id"),
                    "ada_runs": {"org_id": "org-1", "engagement_id": "eng-1"},
                }
            ]
            return DummyResponse(200, payload)
        raise AssertionError(f"unexpected request {method} {table}")

    async def fake_ensure_org_access(user_id: str, org_id: str) -> str:
        assert user_id == "user-1"
        assert org_id == "org-1"
        return "MANAGER"

    async def fake_log_activity_event(**kwargs):
        activity_events.append(kwargs)

    monkeypatch.setattr(main, "supabase_table_request", fake_supabase_table_request)
    monkeypatch.setattr(main, "ensure_org_access_by_id", fake_ensure_org_access)
    monkeypatch.setattr(main, "verify_supabase_jwt", lambda _token: {"sub": "user-1"})
    monkeypatch.setattr(main, "log_activity_event", fake_log_activity_event)

    response = _client().post(
        "/api/ada/exception/update",
        headers=_auth_headers(),
        json={
            "orgId": "org-1",
            "userId": "user-1",
            "exceptionId": "exc-1",
            "disposition": "RESOLVED",
            "note": "Cleared after review",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["exception"]["disposition"] == "RESOLVED"
    assert captured_update["json"]["updated_by"] == "user-1"
    assert any(event.get("action") == "ADA_EXCEPTION_RESOLVED" for event in activity_events)
