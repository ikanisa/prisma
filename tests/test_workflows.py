import json
import os
from typing import Any, Dict

import pytest

os.environ.setdefault('SUPABASE_URL', 'https://example.supabase.co')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
os.environ.setdefault('SUPABASE_JWT_SECRET', 'secret')

pytest.importorskip('fastapi')
from fastapi.testclient import TestClient

import server.main as main


class DummyResponse:
    def __init__(self, status_code: int, payload=None):
        self.status_code = status_code
        self._payload = payload
        self.content = b"" if payload is None else json.dumps(payload).encode()
        self.text = "" if payload is None else json.dumps(payload)

    def json(self):
        return self._payload


def _auth_headers():
    return {'Authorization': 'Bearer token'}


def test_workflow_tool_creates_run_and_records_event(monkeypatch):
    current_run: Dict[str, Any] = {}
    events: Dict[str, Any] = {}

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if table == 'workflow_runs' and method == 'GET':
            # First call returns no runs so orchestrator creates one
            return DummyResponse(200, [] if not current_run else [current_run])
        if table == 'workflow_runs' and method == 'POST':
            current_run.update(kwargs.get('json') or {})
            current_run.setdefault('id', 'run-1')
            return DummyResponse(201, [dict(current_run)])
        if table == 'workflow_runs' and method == 'PATCH':
            current_run.update(kwargs.get('json') or {})
            return DummyResponse(200, [dict(current_run)])
        if table == 'workflow_events' and method == 'POST':
            events.update(kwargs.get('json') or {})
            return DummyResponse(201, [])
        return DummyResponse(200, [])

    async def fake_resolve_org_context(user_id: str, slug: str):
        return {'org_id': 'org-1', 'role': 'EMPLOYEE', 'autonomy_level': 'L2'}

    async def fake_record_agent_trace(**kwargs):
        events.setdefault('trace', {}).update(kwargs)

    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-1'})
    monkeypatch.setattr(main, 'record_agent_trace', fake_record_agent_trace)

    client = TestClient(main.app)
    response = client.post(
        '/v1/assistant/message',
        json={'orgSlug': 'acme', 'tool': 'workflows.run_step', 'args': {'workflow': 'onboarding_zero_typing'}},
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body['tool'] == 'workflows.run_step'
    assert len(body['actions']) >= 2
    assert 'trace' in events


def test_assistant_suggests_workflow_actions(monkeypatch):
    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if table == 'workflow_runs' and method == 'GET':
            return DummyResponse(
                200,
                [
                    {
                        'id': 'run-42',
                        'org_id': 'org-1',
                        'workflow': 'monthly_close',
                        'status': 'RUNNING',
                        'current_step_index': 2,
                        'total_steps': 6,
                    }
                ],
            )
        return DummyResponse(200, [])

    async def fake_resolve_org_context(user_id: str, slug: str):
        return {'org_id': 'org-1', 'role': 'EMPLOYEE', 'autonomy_level': 'L2'}

    async def fake_fetch_tasks(org_id: str, limit: int = 5):
        return []

    async def fake_fetch_autopilot(org_id: str, limit: int = 6):
        return {'metrics': {}}

    async def fake_fetch_documents(org_id: str, limit: int = 3):
        return []

    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-2'})
    monkeypatch.setattr(main, 'fetch_open_tasks', fake_fetch_tasks)
    monkeypatch.setattr(main, 'fetch_autopilot_summary', fake_fetch_autopilot)
    monkeypatch.setattr(main, 'fetch_recent_documents', fake_fetch_documents)

    client = TestClient(main.app)
    response = client.post('/v1/assistant/message', json={'orgSlug': 'acme', 'message': ''}, headers=_auth_headers())

    assert response.status_code == 200
    body = response.json()
    actions = body['actions']
    assert len(actions) >= 2
    workflow_action = next(action for action in actions if action['tool'] == 'workflows.run_step')
    assert workflow_action['args']['workflow'] == 'monthly_close'
    assert workflow_action['args']['step'] == 2


def test_workflow_actions_filtered_by_autonomy(monkeypatch):
    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        return DummyResponse(200, [])

    async def fake_resolve_org_context(user_id: str, slug: str):
        return {'org_id': 'org-1', 'role': 'EMPLOYEE', 'autonomy_level': 'L0'}

    async def fake_fetch_tasks(org_id: str, limit: int = 5):
        return []

    async def fake_fetch_autopilot(org_id: str, limit: int = 6):
        return {'metrics': {}}

    async def fake_fetch_documents(org_id: str, limit: int = 3):
        return []

    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-low'})
    monkeypatch.setattr(main, 'fetch_open_tasks', fake_fetch_tasks)
    monkeypatch.setattr(main, 'fetch_autopilot_summary', fake_fetch_autopilot)
    monkeypatch.setattr(main, 'fetch_recent_documents', fake_fetch_documents)

    client = TestClient(main.app)
    response = client.post('/v1/assistant/message', json={'orgSlug': 'acme', 'message': ''}, headers=_auth_headers())

    assert response.status_code == 200
    actions = response.json()['actions']
    assert all(action['tool'] != 'workflows.run_step' for action in actions)


def test_workflow_tool_blocks_for_low_autonomy(monkeypatch):
    async def fake_resolve_org_context(user_id: str, slug: str):
        return {'org_id': 'org-1', 'role': 'EMPLOYEE', 'autonomy_level': 'L0'}

    async def fail_ensure_workflow_run(*_args, **_kwargs):
        raise AssertionError('workflow run should not start when autonomy is too low')

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        return DummyResponse(200, [])

    async def noop_record_agent_trace(**_kwargs):
        return None

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'ensure_workflow_run', fail_ensure_workflow_run)
    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'record_agent_trace', noop_record_agent_trace)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-low'})

    client = TestClient(main.app)
    response = client.post(
        '/v1/assistant/message',
        json={'orgSlug': 'acme', 'tool': 'workflows.run_step', 'args': {'workflow': 'monthly_close'}},
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert 'autonomy level' in body['messages'][0]['content']
    assert body['data']['requiredAutonomy'] == 'L2'
    assert all(action['tool'] != 'workflows.run_step' for action in body['actions'])
