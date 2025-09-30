import json
from io import BytesIO

import pytest

pytest.importorskip('fastapi')
from fastapi.testclient import TestClient

import server.main as main


class DummyResponse:
    def __init__(self, status_code: int, payload=None):
        self.status_code = status_code
        self._payload = payload
        self.text = json.dumps(payload) if payload is not None else ''
        self.content = self.text.encode()

    def json(self):
        return self._payload


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv('SUPABASE_URL', 'https://example.supabase.co')
    monkeypatch.setenv('SUPABASE_SERVICE_ROLE_KEY', 'service-role')


def test_client_cannot_list_internal_documents(monkeypatch):
    async def fake_resolve_org_context(_user_id: str, _org_slug: str):
        return {'org_id': 'org-1', 'role': 'CLIENT'}

    async def fail_request(*_args, **_kwargs):
        raise AssertionError('supabase_table_request should not be called for forbidden access')

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'supabase_table_request', fail_request)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-123'})

    client = TestClient(main.app)
    response = client.get(
        '/v1/storage/documents',
        params={'orgSlug': 'acme', 'repo': '01_Internal'},
        headers={'Authorization': 'Bearer token'},
    )
    assert response.status_code == 403


def test_client_uploads_to_pbc_repository(monkeypatch):
    async def fake_resolve_org_context(_user_id: str, _org_slug: str):
        return {'org_id': 'org-1', 'role': 'CLIENT'}

    async def fake_supabase_request(*_args, **_kwargs):
        return DummyResponse(200, {})

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if method == 'POST' and table == 'documents':
            payload = kwargs.get('json') or {}
            document_row = {**payload, 'id': 'doc-123'}
            return DummyResponse(201, [document_row])
        if method == 'POST' and table in {'document_extractions', 'notifications'}:
            return DummyResponse(201, [])
        raise AssertionError(f'unexpected table call: {table}')

    async def fake_create_notification(*_args, **_kwargs):
        return None

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'supabase_request', fake_supabase_request)
    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'create_notification', fake_create_notification)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-123'})

    client = TestClient(main.app)
    file_data = BytesIO(b'hello world')
    response = client.post(
        '/v1/storage/documents',
        data={'orgSlug': 'acme'},
        files={'file': ('supporting.pdf', file_data, 'application/pdf')},
        headers={'Authorization': 'Bearer token'},
    )

    assert response.status_code == 200
    body = response.json()
    assert body['document']['repo_folder'] == '03_Accounting/PBC'
