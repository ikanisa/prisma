import json
import os
import sys
import types
from typing import Optional

import pytest

os.environ.setdefault('SUPABASE_URL', 'https://example.supabase.co')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
os.environ.setdefault('SUPABASE_JWT_SECRET', 'secret')

yaml_mod = sys.modules.get('yaml')
if yaml_mod is None:
    yaml_mod = types.SimpleNamespace(
        safe_load=lambda stream: {},
        dump=lambda *args, **kwargs: '',
        YAMLError=Exception,
    )
    sys.modules['yaml'] = yaml_mod
else:
    if not hasattr(yaml_mod, 'safe_load'):
        yaml_mod.safe_load = lambda stream: {}
    if not hasattr(yaml_mod, 'dump'):
        yaml_mod.dump = lambda *args, **kwargs: ''
    if not hasattr(yaml_mod, 'YAMLError'):
        yaml_mod.YAMLError = Exception

pytest.importorskip('fastapi')

from fastapi.testclient import TestClient

import server.main as main


class DummyResponse:
    def __init__(self, status_code: int, payload=None, *, count: Optional[int] = None):
        self.status_code = status_code
        self._payload = payload
        self.content = b"" if payload is None else json.dumps(payload).encode()
        self.text = "" if payload is None else json.dumps(payload)
        total = count if count is not None else (len(payload) if isinstance(payload, list) else 0)
        upper = max(total - 1, 0)
        self.headers = {'content-range': f"0-{upper}/{total}"}

    def json(self):
        return self._payload


def _auth_headers():
    return {'Authorization': 'Bearer token'}


def test_autonomy_status_returns_summary(monkeypatch):
    async def fake_resolve_org_context(user_id: str, slug: str):
        return {
            'org_id': 'org-1',
            'role': 'MANAGER',
            'autonomy_level': 'L2',
            'autonomy_floor': 'L1',
            'autonomy_ceiling': 'L3',
        }

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if table == 'telemetry_alerts' and method == 'GET':
            payload = [
                {
                    'id': 'alert-1',
                    'alert_type': 'DETERMINISTIC_MANIFEST_MISSING',
                    'severity': 'CRITICAL',
                    'message': 'Missing manifest',
                    'created_at': '2024-01-01T00:00:00Z',
                }
            ]
            return DummyResponse(200, payload, count=1)
        if table == 'approval_queue' and method == 'GET':
            payload = [
                {
                    'id': 'approval-1',
                    'action': 'close.lock',
                    'entity_type': 'CLOSE',
                    'created_at': '2024-01-01T00:00:00Z',
                    'requested_by': 'user-1',
                }
            ]
            return DummyResponse(200, payload, count=1)
        if table == 'jobs' and method == 'GET':
            payload = [
                {
                    'id': 'job-1',
                    'kind': 'extract_documents',
                    'status': 'PENDING',
                    'scheduled_at': '2024-01-02T00:00:00Z',
                    'payload': {
                        'lastRun': {
                            'status': 'done',
                            'finishedAt': '2024-01-01T05:00:00Z',
                            'result': {
                                'domain': 'close',
                                'domainLabel': 'Accounting Close',
                                'summary': 'Staged close steps',
                                'approvals': {'pending': 1},
                                'telemetry': {'open': 0},
                                'run': {'steps': {'remaining': 1}},
                            },
                        }
                    },
                }
            ]
            return DummyResponse(200, payload, count=1)
        return DummyResponse(200, [])

    async def fake_get_workflow_suggestions(org_id: str, *, supabase_table_request, autonomy_level: str):
        return [
            {
                'workflow': 'onboarding_zero_typing',
                'step_index': 0,
                'label': 'Start onboarding',
                'description': 'Kick off the zero-typing journey',
                'minimum_autonomy': 'L2',
                'new_run': True,
            }
        ]

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'get_workflow_suggestions', fake_get_workflow_suggestions)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-1'})

    client = TestClient(main.app)
    response = client.get('/v1/autonomy/status', params={'orgSlug': 'acme'}, headers=_auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert body['autonomy']['level'] == 'L2'
    assert body['evidence']['open'] == 1
    assert body['approvals']['pending'] == 1
    assert body['suggestions'][0]['workflow'] == 'onboarding_zero_typing'
    assert body['autopilot']['domains'][0]['domain'] == 'close'
