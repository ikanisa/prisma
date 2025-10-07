import json

import os
import pytest

os.environ.setdefault('SUPABASE_URL', 'https://example.supabase.co')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
os.environ.setdefault('SUPABASE_JWT_SECRET', 'secret')

pytest.importorskip('fastapi')
from fastapi.testclient import TestClient

import server.main as main


class DummyResponse:
    def __init__(self, status_code: int = 200, payload=None):
        self.status_code = status_code
        self._payload = payload
        self.text = json.dumps(payload) if payload is not None else ''

    def json(self):
        return self._payload


def test_document_sign_endpoint_generates_signed_url(monkeypatch):
    monkeypatch.setenv('SUPABASE_URL', 'https://example.supabase.co')
    monkeypatch.setenv('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
    monkeypatch.setenv('SUPABASE_JWT_SECRET', 'secret')
    monkeypatch.setattr(main, 'SUPABASE_URL', 'https://example.supabase.co', raising=False)
    monkeypatch.setattr(main, 'SUPABASE_STORAGE_URL', 'https://example.supabase.co/storage/v1', raising=False)
    monkeypatch.setattr(main, 'SUPABASE_REST_URL', 'https://example.supabase.co/rest/v1', raising=False)

    def fake_verify(_: str):
        return {'sub': 'user-123'}

    async def fake_ensure_org_access_by_id(_user_id: str, _org_id: str) -> str:
        return 'SYSTEM_ADMIN'

    async def fake_fetch_single_record(table: str, record_id: str, select: str = '*'):
        if table == 'documents':
            return {
                'id': record_id,
                'org_id': 'org-123',
                'deleted': False,
                'storage_path': 'org-org-123/docs/general/demo.pdf',
            }
        return None

    captured_request = {}

    async def fake_supabase_request(method: str, url: str, **kwargs):
        captured_request['method'] = method
        captured_request['url'] = url
        return DummyResponse(200, {'signedURL': '/storage/v1/object/sign/documents/demo'})

    monkeypatch.setattr(main, 'verify_supabase_jwt', fake_verify)
    monkeypatch.setattr(main, 'ensure_org_access_by_id', fake_ensure_org_access_by_id)
    monkeypatch.setattr(main, 'fetch_single_record', fake_fetch_single_record)
    monkeypatch.setattr(main, 'supabase_request', fake_supabase_request)

    client = TestClient(main.app)
    response = client.post(
        '/v1/storage/sign',
        headers={'Authorization': 'Bearer token'},
        json={'documentId': 'doc-1'},
    )

    assert response.status_code == 200
    body = response.json()
    assert body['url'].startswith('https://example.supabase.co')
    assert captured_request['method'] == 'POST'
    assert '/storage/v1/object/sign/documents/' in captured_request['url']
