import json
from datetime import datetime, timedelta, timezone

import pytest

pytest.importorskip('fastapi')
from fastapi.testclient import TestClient

import os
import sys
import types

os.environ.setdefault('SUPABASE_URL', 'https://example.supabase.co')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
os.environ.setdefault('SUPABASE_JWT_SECRET', 'secret')

if 'yaml' not in sys.modules:
    yaml_stub = types.SimpleNamespace(
        safe_load=lambda stream: {},
        dump=lambda *args, **kwargs: '',
        YAMLError=Exception,
    )
    sys.modules['yaml'] = yaml_stub

import server.main as main


class DummyResponse:
    def __init__(self, status_code: int, payload=None):
        self.status_code = status_code
        self._payload = payload
        self.text = '' if payload is None else json.dumps(payload)

    def json(self):
        return self._payload


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv('SUPABASE_URL', 'https://example.supabase.co')
    monkeypatch.setenv('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
    monkeypatch.setenv('SUPABASE_JWT_SECRET', 'secret')
    monkeypatch.setattr(main, 'AUTOPILOT_WORKER_DISABLED', False)


def _auth_headers():
    return {'Authorization': 'Bearer token'}


def _make_response(payload):
    return DummyResponse(200, payload)


def test_release_controls_reports_pending_actions(monkeypatch):
    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        params = kwargs.get('params') or {}
        if table == 'approval_queue':
            kind_filter = params.get('kind')
            if kind_filter == 'eq.AUDIT_PLAN_FREEZE':
                return _make_response([
                    {'id': 'ap-1', 'status': 'PENDING', 'kind': 'AUDIT_PLAN_FREEZE'},
                ])
            if kind_filter == 'eq.REPORT_FINAL':
                return _make_response([
                    {'id': 'rf-1', 'status': 'APPROVED', 'kind': 'REPORT_FINAL'},
                ])
            if kind_filter and kind_filter.startswith('in.('):
                return _make_response([
                    {'id': 'tax-1', 'status': 'PENDING', 'kind': 'MT_CIT_APPROVAL'},
                ])
        if table == 'close_periods':
            return _make_response([
                {'id': 'close-1', 'status': 'READY_TO_LOCK'},
            ])
        if table == 'engagement_archives':
            return _make_response([])
        if table == 'memberships':
            return _make_response([
                {'id': 'mem-1', 'role': 'PARTNER', 'autonomy_ceiling': 'L3'},
                {'id': 'mem-2', 'role': 'MANAGER', 'autonomy_ceiling': 'L2'},
            ])
        if table == 'mfa_challenges':
            recent = datetime.now(timezone.utc) - timedelta(minutes=5)
            return _make_response([
                {
                    'id': 'mfa-1',
                    'org_id': 'org-1',
                    'channel': 'WHATSAPP',
                    'consumed': True,
                    'created_at': recent.isoformat().replace('+00:00', 'Z'),
                }
            ])
        if table == 'telemetry_alerts':
            return _make_response([])
        return _make_response([])

    async def fake_context(user_id: str, org_slug: str):
        return {'org_id': 'org-1', 'role': 'MANAGER', 'autonomy_level': 'L2'}

    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'resolve_org_context', fake_context)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-1'})

    client = TestClient(main.app)
    response = client.post('/api/release-controls/check', json={'orgSlug': 'acme'}, headers=_auth_headers())

    assert response.status_code == 200
    body = response.json()
    generated_at = datetime.fromisoformat(body['generatedAt'].replace('Z', '+00:00'))
    assert generated_at.tzinfo is not None

    assert body['status']['actions']['plan_freeze']['state'] == 'pending'
    assert body['status']['actions']['report_release']['state'] == 'satisfied'
    assert body['status']['actions']['filings_submit']['state'] == 'pending'
    assert body['status']['archive']['state'] == 'pending'
    assert body['environment']['autonomy']['state'] == 'satisfied'
    assert body['environment']['mfa']['state'] == 'satisfied'
    assert body['environment']['mfa']['lastChallengeAgeSeconds'] is not None
    assert body['environment']['mfa']['lastChallengeAgeSeconds'] >= 0
    telemetry = body['environment']['telemetry']
    assert telemetry['state'] == 'satisfied'
    assert telemetry['severityFilter']


def test_release_controls_reports_satisfied(monkeypatch):
    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        params = kwargs.get('params') or {}
        if table == 'approval_queue':
            kind_filter = params.get('kind')
            if kind_filter == 'eq.AUDIT_PLAN_FREEZE':
                return _make_response([
                    {'id': 'ap-1', 'status': 'APPROVED', 'kind': 'AUDIT_PLAN_FREEZE'},
                    {'id': 'ap-2', 'status': 'APPROVED', 'kind': 'AUDIT_PLAN_FREEZE'},
                ])
            if kind_filter == 'eq.REPORT_FINAL':
                return _make_response([
                    {'id': 'rf-1', 'status': 'APPROVED', 'kind': 'REPORT_FINAL'},
                ])
            if kind_filter and kind_filter.startswith('in.('):
                return _make_response([
                    {'id': 'tax-1', 'status': 'APPROVED', 'kind': 'MT_CIT_APPROVAL'},
                ])
        if table == 'close_periods':
            return _make_response([
                {'id': 'close-1', 'status': 'LOCKED'},
            ])
        if table == 'engagement_archives':
            return _make_response([
                {
                    'id': 'archive-1',
                    'sha256': 'a' * 64,
                    'updated_at': '2024-01-01T00:00:00Z',
                    'manifest': {'tcwg': {'sha256': 'b' * 64}},
                }
            ])
        if table == 'memberships':
            return _make_response([
                {'id': 'mem-1', 'role': 'PARTNER', 'autonomy_ceiling': 'L3'},
                {'id': 'mem-2', 'role': 'MANAGER', 'autonomy_ceiling': 'L3'},
            ])
        if table == 'mfa_challenges':
            recent = datetime.now(timezone.utc) - timedelta(minutes=1)
            return _make_response([
                {
                    'id': 'mfa-1',
                    'org_id': 'org-1',
                    'channel': 'WHATSAPP',
                    'consumed': True,
                    'created_at': recent.isoformat().replace('+00:00', 'Z'),
                }
            ])
        if table == 'telemetry_alerts':
            return _make_response([])
        return _make_response([])

    async def fake_context(user_id: str, org_slug: str):
        return {'org_id': 'org-1', 'role': 'MANAGER', 'autonomy_level': 'L2'}

    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'resolve_org_context', fake_context)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-1'})

    client = TestClient(main.app)
    response = client.post('/api/release-controls/check', json={'orgSlug': 'acme'}, headers=_auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert all(summary['state'] == 'satisfied' for summary in body['status']['actions'].values())
    assert body['status']['archive']['state'] == 'satisfied'
    assert body['status']['archive']['sha256'] == 'a' * 64
    assert body['environment']['autonomy']['state'] == 'satisfied'
    assert body['environment']['mfa']['state'] == 'satisfied'
    assert body['environment']['mfa']['lastChallengeAgeSeconds'] is not None
    assert (
        body['environment']['mfa']['lastChallengeAgeSeconds']
        <= body['environment']['mfa']['withinSeconds']
    )
    telemetry = body['environment']['telemetry']
    assert telemetry['state'] == 'satisfied'
    assert telemetry['severityFilter'][0] == telemetry['severityThreshold']


def test_release_controls_environment_flags(monkeypatch):
    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        params = kwargs.get('params') or {}
        if table == 'approval_queue':
            return _make_response([])
        if table == 'close_periods':
            return _make_response([])
        if table == 'engagement_archives':
            return _make_response([])
        if table == 'memberships':
            return _make_response([
                {'id': 'mem-1', 'role': 'PARTNER', 'autonomy_ceiling': 'L1'},
            ])
        if table == 'mfa_challenges':
            stale = datetime(2020, 1, 1, tzinfo=timezone.utc)
            return _make_response([
                {
                    'id': 'mfa-1',
                    'org_id': 'org-1',
                    'channel': 'WHATSAPP',
                    'consumed': True,
                    'created_at': stale.isoformat().replace('+00:00', 'Z'),
                }
            ])
        if table == 'telemetry_alerts':
            return _make_response([
                {
                    'id': 'alert-1',
                    'severity': 'CRITICAL',
                    'alert_type': 'MANIFEST_MISSING',
                    'created_at': '2024-01-01T00:00:00Z',
                }
            ])
        return _make_response([])

    async def fake_context(user_id: str, org_slug: str):
        return {'org_id': 'org-1', 'role': 'MANAGER', 'autonomy_level': 'L1'}

    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'resolve_org_context', fake_context)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-1'})
    monkeypatch.setattr(main, 'AUTOPILOT_WORKER_DISABLED', True)

    client = TestClient(main.app)
    response = client.post('/api/release-controls/check', json={'orgSlug': 'acme'}, headers=_auth_headers())

    assert response.status_code == 200
    body = response.json()
    autonomy = body['environment']['autonomy']
    mfa = body['environment']['mfa']
    telemetry = body['environment']['telemetry']

    assert autonomy['state'] == 'pending'
    assert 'worker_disabled' in autonomy['flags']
    assert 'membership_ceiling_shortfall' in autonomy['flags']
    assert mfa['state'] != 'satisfied'
    assert mfa['lastChallengeAgeSeconds'] is not None
    assert mfa['lastChallengeAgeSeconds'] > mfa['withinSeconds']
    assert telemetry['state'] == 'pending'
    assert telemetry['severityFilter'][0] == telemetry['severityThreshold']
