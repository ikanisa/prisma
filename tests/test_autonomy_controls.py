import asyncio
import asyncio
import json
import os
from typing import Any, Dict

os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
os.environ.setdefault('SUPABASE_JWT_SECRET', 'secret')

import pytest

pytest.importorskip('fastapi')
from fastapi.testclient import TestClient

import server.main as main


class DummyResponse:
    def __init__(self, status_code: int, payload=None):
        self.status_code = status_code
        self._payload = payload
        self.text = '' if payload is None else json.dumps(payload)
        self.content = self.text.encode()

    def json(self):
        return self._payload


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv('SUPABASE_URL', 'https://example.supabase.co')
    monkeypatch.setenv('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
    monkeypatch.setenv('SUPABASE_JWT_SECRET', 'secret')


def _auth_headers():
    return {'Authorization': 'Bearer token'}


async def noop_guard(_actor_id: str) -> None:
    return None


def test_create_org_defaults_to_config_level(monkeypatch):
    recorded_org_body = {}
    recorded_activity = {}

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if table == 'organizations' and method == 'POST':
            recorded_org_body.update(kwargs.get('json') or {})
            payload = {**recorded_org_body, 'id': 'org-1'}
            return DummyResponse(201, [payload])
        if table == 'memberships' and method == 'POST':
            return DummyResponse(201, [])
        return DummyResponse(200, [])

    async def fake_log_activity_event(**kwargs):
        recorded_activity.update(kwargs)

    monkeypatch.setattr(main, 'guard_system_admin', noop_guard)
    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'log_activity_event', fake_log_activity_event)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-1'})

    client = TestClient(main.app)
    response = client.post(
        '/api/iam/org/create',
        json={'name': 'Example Co', 'slug': 'example-co'},
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body['autonomyLevel'] == 'L2'
    assert body['autopilotLevel'] == 2
    assert recorded_org_body['autonomy_level'] == 'L2'
    assert recorded_activity.get('metadata', {}).get('autonomy_level') == 'L2'


def test_create_org_honours_requested_level(monkeypatch):
    recorded_org_body = {}

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if table == 'organizations' and method == 'POST':
            recorded_org_body.update(kwargs.get('json') or {})
            payload = {**recorded_org_body, 'id': 'org-1'}
            return DummyResponse(201, [payload])
        if table == 'memberships' and method == 'POST':
            return DummyResponse(201, [])
        return DummyResponse(200, [])

    monkeypatch.setattr(main, 'guard_system_admin', noop_guard)
    async def fake_log_event(**_kwargs):
        return None

    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'log_activity_event', fake_log_event)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-1'})

    client = TestClient(main.app)
    response = client.post(
        '/api/iam/org/create',
        json={'name': 'Example Co', 'slug': 'example-co', 'autonomyLevel': 'L1'},
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body['autonomyLevel'] == 'L1'
    assert body['autopilotLevel'] == 1
    assert recorded_org_body['autonomy_level'] == 'L1'


def test_autonomy_blocks_schedule_when_level_low(monkeypatch):
    async def fake_resolve_org_context(_user_id: str, _slug: str):
        return {'org_id': 'org-1', 'role': 'MANAGER', 'autonomy_level': 'L0'}

    async def fail_table_request(*_args, **_kwargs):
        raise AssertionError('job schedule should not be created when autonomy blocks it')

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'supabase_table_request', fail_table_request)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-1'})

    client = TestClient(main.app)
    response = client.post(
        '/v1/autopilot/schedules',
        json={'orgSlug': 'acme', 'kind': 'extract_documents', 'cronExpression': '0 2 * * *', 'active': True, 'metadata': {}},
        headers=_auth_headers(),
    )

    assert response.status_code == 403


def test_autonomy_blocks_manual_job_run(monkeypatch):
    async def fake_resolve_org_context(_user_id: str, _slug: str):
        return {'org_id': 'org-1', 'role': 'MANAGER', 'autonomy_level': 'L0'}

    async def fail_table_request(*_args, **_kwargs):
        raise AssertionError('job run should not be enqueued when autonomy blocks it')

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'supabase_table_request', fail_table_request)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-1'})

    client = TestClient(main.app)
    response = client.post(
        '/v1/autopilot/jobs/run',
        json={'orgSlug': 'acme', 'kind': 'remind_pbc', 'payload': {}},
        headers=_auth_headers(),
    )

    assert response.status_code == 403


def test_worker_skips_job_when_autonomy_blocks(monkeypatch):
    recorded_finalise: Dict[str, Any] = {}
    handler_called = {'value': False}

    async def fake_fetch_autonomy(org_id: str) -> str:
        assert org_id == 'org-1'
        return 'L0'

    async def fake_finalise(job: Dict[str, Any], *, status: str, result=None, error=None) -> None:
        recorded_finalise.update({'status': status, 'error': error})

    async def fake_handler(_job: Dict[str, Any]) -> Dict[str, Any]:
        handler_called['value'] = True
        return {'ok': True}

    monkeypatch.setattr(main, 'fetch_org_autonomy_level', fake_fetch_autonomy)
    monkeypatch.setattr(main, '_finalise_autopilot_job', fake_finalise)
    monkeypatch.setitem(main.AUTOPILOT_JOB_HANDLERS, 'extract_documents', fake_handler)

    asyncio.run(main._run_autopilot_job({'id': 'job-1', 'org_id': 'org-1', 'kind': 'extract_documents'}))

    assert recorded_finalise['status'] == 'FAILED'
    assert 'does not permit' in recorded_finalise['error']
    assert handler_called['value'] is False


def test_policy_pack_escalates_for_high_autonomy(monkeypatch):
    recorded_updates = {}
    logged_activity = {}

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if table == 'agent_policy_versions' and method == 'PATCH':
            recorded_updates.update(kwargs.get('json') or {})
            payload = [{**kwargs.get('json', {}), 'id': 'policy-1'}]
            return DummyResponse(200, payload)
        return DummyResponse(200, [])

    async def fake_resolve_org_context(user_id: str, org_slug: str):
        return {'org_id': 'org-1', 'role': 'SYSTEM_ADMIN', 'autonomy_level': 'L2'}

    async def fake_log_activity_event(**kwargs):
        logged_activity.update(kwargs)

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'log_activity_event', fake_log_activity_event)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-1'})

    client = TestClient(main.app)
    response = client.post(
        '/v1/policy-packs/update',
        json={'orgSlug': 'acme', 'policyPackId': 'policy-1', 'summary': 'Updated'},
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    assert recorded_updates['status'] == 'pending'
    assert logged_activity['action'] == 'POLICY_PACK_ESCALATED'
    assert logged_activity['metadata']['autonomy_level'] == 'L2'


def test_policy_pack_does_not_escalate_for_low_autonomy(monkeypatch):
    recorded_updates = {}
    logged = []

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if table == 'agent_policy_versions' and method == 'PATCH':
            recorded_updates.update(kwargs.get('json') or {})
            payload = [{**kwargs.get('json', {}), 'id': 'policy-1'}]
            return DummyResponse(200, payload)
        return DummyResponse(200, [])

    async def fake_resolve_org_context(user_id: str, org_slug: str):
        return {'org_id': 'org-1', 'role': 'SYSTEM_ADMIN', 'autonomy_level': 'L1'}

    async def fake_log_activity_event(**kwargs):
        logged.append(kwargs)

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'log_activity_event', fake_log_activity_event)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-1'})

    client = TestClient(main.app)
    response = client.post(
        '/v1/policy-packs/update',
        json={'orgSlug': 'acme', 'policyPackId': 'policy-1', 'summary': 'Updated'},
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    assert 'status' not in recorded_updates or recorded_updates['status'] != 'pending'
    assert logged == []
