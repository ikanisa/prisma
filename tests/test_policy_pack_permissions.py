import json
import os
from typing import Any, Dict

os.environ.setdefault('SUPABASE_URL', 'https://example.supabase.co')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
os.environ.setdefault('SUPABASE_JWT_SECRET', 'secret')

import pytest

pytest.importorskip('fastapi')
from fastapi.testclient import TestClient

import server.main as main


class DummyResponse:
    def __init__(self, status_code: int, payload: Any = None):
        self.status_code = status_code
        self._payload = payload
        self.text = json.dumps(payload) if payload is not None else ''

    def json(self):
        return self._payload


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv('SUPABASE_URL', 'https://example.supabase.co')
    monkeypatch.setenv('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
    monkeypatch.setenv('SUPABASE_JWT_SECRET', 'secret')


def test_non_admin_cannot_update_policy_pack(monkeypatch):
    async def fake_resolve_org_context(_user_id: str, _org_slug: str) -> Dict[str, str]:
        return {'org_id': 'org-1', 'role': 'MANAGER'}

    async def fail_supabase_table_request(*_args, **_kwargs):
        raise AssertionError('supabase_table_request should not run when permission denied')

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'supabase_table_request', fail_supabase_table_request)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-123'})

    client = TestClient(main.app)
    response = client.post(
        '/v1/policy-packs/update',
        headers={'Authorization': 'Bearer token'},
        json={'orgSlug': 'acme', 'policyPackId': 'policy-1', 'summary': 'Updated'},
    )

    assert response.status_code == 403


def test_system_admin_updates_policy_pack(monkeypatch):
    async def fake_resolve_org_context(_user_id: str, _org_slug: str) -> Dict[str, str]:
        return {'org_id': 'org-1', 'role': 'SYSTEM_ADMIN'}

    recorded_params: Dict[str, Any] = {}

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if table == 'agent_policy_versions':
            recorded_params['method'] = method
            recorded_params['table'] = table
            recorded_params['params'] = kwargs.get('params')
            return DummyResponse(200, [{
                'id': 'policy-1',
                'org_id': 'org-1',
                'summary': kwargs.get('json', {}).get('summary'),
                'diff': kwargs.get('json', {}).get('diff'),
            }])
        return DummyResponse(200, [])

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-123'})

    client = TestClient(main.app)
    response = client.post(
        '/v1/policy-packs/update',
        headers={'Authorization': 'Bearer token'},
        json={'orgSlug': 'acme', 'policyPackId': 'policy-1', 'summary': 'New summary'},
    )

    assert response.status_code == 200
    body = response.json()
    assert body['policyPack']['summary'] == 'New summary'
    assert recorded_params['method'] == 'PATCH'
    assert recorded_params['table'] == 'agent_policy_versions'
    assert recorded_params['params'] == {'id': 'eq.policy-1', 'org_id': 'eq.org-1'}
