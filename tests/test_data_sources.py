import json
import os

import pytest

os.environ.setdefault('SUPABASE_URL', 'https://example.supabase.co')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
os.environ.setdefault('SUPABASE_JWT_SECRET', 'secret')
os.environ.setdefault('OPENAI_API_KEY', 'sk-test')
os.environ.setdefault('OPENAI_WEB_SEARCH_ENABLED', 'true')
os.environ.setdefault('OPENAI_WEB_SEARCH_MODEL', 'gpt-4.1-mini')
os.environ.setdefault('WEB_FETCH_CACHE_RETENTION_DAYS', '14')

pytest.importorskip('fastapi')

from fastapi.testclient import TestClient

import server.main as main


class DummyResponse:
    def __init__(self, status_code: int, payload=None, *, headers=None):
        self.status_code = status_code
        self._payload = payload
        self.headers = headers or {}
        self.text = json.dumps(payload) if payload is not None else ''

    def json(self):
        return self._payload


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv('SUPABASE_URL', 'https://example.supabase.co')
    monkeypatch.setenv('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
    monkeypatch.setenv('SUPABASE_JWT_SECRET', 'secret')
    monkeypatch.setenv('OPENAI_WEB_SEARCH_ENABLED', 'true')
    monkeypatch.setenv('OPENAI_WEB_SEARCH_MODEL', 'gpt-4.1-mini')
    monkeypatch.setenv('WEB_FETCH_CACHE_RETENTION_DAYS', '14')
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-123'})
    async def no_rate_limit(*_args, **_kwargs):
        return None
    monkeypatch.setattr(main, 'enforce_rate_limit', no_rate_limit)


def test_drive_metadata_endpoint(monkeypatch):
    async def fake_resolve_org_context(_user_id: str, _org_slug: str):
        return {'org_id': 'org-1', 'role': 'MANAGER'}

    async def fake_table_request(method: str, table: str, **kwargs):
        params = kwargs.get('params') or {}
        if table == 'gdrive_connectors':
            return DummyResponse(200, [
                {
                    'id': 'conn-1',
                    'folder_id': 'folder-123',
                    'shared_drive_id': 'shared-1',
                    'service_account_email': 'svc@example.com',
                }
            ])
        raise AssertionError(f'unexpected table {table} with params {params}')

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'supabase_table_request', fake_table_request)

    client = TestClient(main.app)
    response = client.get('/v1/knowledge/drive/metadata', params={'orgSlug': 'acme'}, headers={'Authorization': 'Bearer token'})

    assert response.status_code == 200
    body = response.json()
    assert body['connector']['folderId'] == 'folder-123'
    assert body['settings']['enabled'] is True or body['settings']['enabled'] is False
    assert 'oauthScopes' in body['settings']


def test_drive_status_endpoint(monkeypatch):
    async def fake_resolve_org_context(_user_id: str, _org_slug: str):
        return {'org_id': 'org-1', 'role': 'MANAGER'}

    async def fake_table_request(method: str, table: str, **kwargs):
        params = kwargs.get('params') or {}
        if table == 'gdrive_connectors':
            return DummyResponse(200, [
                {
                    'id': 'conn-1',
                    'folder_id': 'folder-123',
                    'service_account_email': 'svc@example.com',
                    'shared_drive_id': None,
                    'start_page_token': 'start',
                    'cursor_page_token': 'cursor',
                    'last_sync_at': '2024-01-01T00:00:00Z',
                    'last_backfill_at': '2024-01-01T00:00:00Z',
                    'last_error': None,
                    'watch_channel_id': None,
                    'watch_expires_at': None,
                    'updated_at': '2024-01-01T00:00:00Z',
                    'created_at': '2024-01-01T00:00:00Z',
                }
            ])
        if table == 'gdrive_change_queue':
            if params.get('processed_at') == 'is.null':
                return DummyResponse(200, [], headers={'content-range': '0-0/3'})
            if params.get('error') == 'not.is.null':
                return DummyResponse(200, [], headers={'content-range': '0-0/1'})
            if params.get('not') == 'error.is.null':
                return DummyResponse(200, [
                    {'file_id': 'file-err', 'error': 'failed', 'processed_at': '2024-01-01T00:00:00Z'}
                ])
        if table == 'gdrive_file_metadata':
            if params.get('allowlisted_domain') == 'eq.false':
                return DummyResponse(200, [], headers={'content-range': '0-0/2'})
            return DummyResponse(200, [], headers={'content-range': '0-0/5'})
        raise AssertionError(f'unexpected table {table} with params {params}')

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'supabase_table_request', fake_table_request)

    client = TestClient(main.app)
    response = client.get('/v1/knowledge/drive/status', params={'orgSlug': 'acme'}, headers={'Authorization': 'Bearer token'})

    assert response.status_code == 200
    body = response.json()
    assert body['queue']['pending'] == 3
    assert body['queue']['failed24h'] == 1
    assert body['metadata']['blocked'] == 2
    assert len(body['queue']['recentErrors']) == 1


def test_drive_preview_endpoint(monkeypatch):
    async def fake_resolve_org_context(_user_id: str, _org_slug: str):
        return {'org_id': 'org-1', 'role': 'MANAGER'}

    async def fake_table_request(method: str, table: str, **kwargs):
        params = kwargs.get('params') or {}
        if table == 'knowledge_sources':
            if params.get('id') == 'eq.source-1':
                return DummyResponse(200, [{'id': 'source-1', 'corpus_id': 'corpus-1', 'provider': 'google_drive', 'source_uri': 'drive://folder'}])
        if table == 'knowledge_corpora':
            if params.get('id') == 'eq.corpus-1':
                return DummyResponse(200, [{'id': 'corpus-1', 'org_id': 'org-1'}])
        if table == 'gdrive_documents':
            return DummyResponse(200, [
                {
                    'file_id': 'file-1',
                    'document_id': 'doc-1',
                    'mime_type': 'application/pdf',
                    'last_synced_at': '2024-01-01T00:00:00Z',
                    'updated_at': '2024-01-01T00:00:00Z',
                }
            ])
        if table == 'documents':
            if params.get('id') == 'in.(doc-1)':
                return DummyResponse(200, [{'id': 'doc-1', 'name': 'Preview Document', 'file_type': 'application/pdf', 'updated_at': '2024-01-01T00:00:00Z'}])
        raise AssertionError(f'unexpected table {table} with params {params}')

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'supabase_table_request', fake_table_request)

    client = TestClient(main.app)
    response = client.get(
        '/v1/knowledge/sources/source-1/preview',
        params={'orgSlug': 'acme'},
        headers={'Authorization': 'Bearer token'},
    )

    assert response.status_code == 200
    body = response.json()
    assert body['placeholder'] is False
    assert body['documents'][0]['name'] == 'Preview Document'


def test_web_sources_endpoint(monkeypatch):
    async def fake_resolve_org_context(_user_id: str, _org_slug: str):
        return {'org_id': 'org-1', 'role': 'MANAGER'}

    async def fake_table_request(method: str, table: str, **kwargs):
        if table == 'web_knowledge_sources':
            return DummyResponse(200, [
                {
                    'id': 'source-1',
                    'title': 'MFSA Guidance',
                    'url': 'https://maltaguide.example.com',
                    'domain': 'COMPLIANCE',
                    'jurisdiction': ['MT'],
                    'tags': ['audit'],
                    'priority': 1,
                    'created_at': '2024-01-01T00:00:00Z',
                }
            ])
        if table == 'web_fetch_cache_metrics':
            return DummyResponse(200, [
                {
                    'total_rows': 5,
                    'total_bytes': 4096,
                    'total_chars': 10240,
                    'fetched_last_24h': 2,
                    'used_last_24h': 1,
                    'newest_fetched_at': '2024-01-02T00:00:00Z',
                    'oldest_fetched_at': '2024-01-01T00:00:00Z',
                    'newest_last_used_at': '2024-01-02T01:00:00Z',
                    'oldest_last_used_at': '2024-01-01T02:00:00Z',
                }
            ])
        raise AssertionError(f'unexpected table {table}')

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'supabase_table_request', fake_table_request)

    client = TestClient(main.app)
    response = client.get('/v1/knowledge/web-sources', params={'orgSlug': 'acme'}, headers={'Authorization': 'Bearer token'})

    assert response.status_code == 200
    body = response.json()
    assert len(body['sources']) == 1
    assert body['sources'][0]['title'] == 'MFSA Guidance'
    settings = body['settings']
    assert 'allowedDomains' in settings
    assert 'fetchPolicy' in settings
    assert settings['fetchPolicy']['cacheTtlMinutes'] == 1440
    web_search = body['webSearch']
    assert web_search['enabled'] is True
    assert web_search['model'] == 'gpt-4.1-mini'
    cache = body['cache']
    assert cache['retentionDays'] == 14
    metrics = cache['metrics']
    assert metrics['totalRows'] == 5
    assert metrics['totalBytes'] == 4096


def test_schedule_web_harvest(monkeypatch):
    async def fake_resolve_org_context(_user_id: str, _org_slug: str):
        return {'org_id': 'org-1', 'role': 'MANAGER'}

    async def fake_fetch_single_record(table: str, record_id: str, select: str = '*'):
        assert table == 'web_knowledge_sources'
        assert record_id == 'source-1'
        return {'id': 'source-1', 'title': 'MFSA Guidance', 'url': 'https://example.com'}

    async def fake_table_request(method: str, table: str, **kwargs):
        if method == 'POST' and table == 'learning_runs':
            payload = kwargs.get('json')
            assert payload['org_id'] == 'org-1'
            assert payload['agent_kind'] == 'AUDIT'
            assert payload['stats']['web_source_id'] == 'source-1'
            return DummyResponse(201, [{'id': 'run-1', 'status': 'pending'}])
        raise AssertionError(f'unexpected call {method} {table}')

    def fake_ensure_min_role(role: str, required: str):
        assert role == 'MANAGER'
        assert required == 'MANAGER'

    monkeypatch.setattr(main, 'resolve_org_context', fake_resolve_org_context)
    monkeypatch.setattr(main, 'fetch_single_record', fake_fetch_single_record)
    monkeypatch.setattr(main, 'supabase_table_request', fake_table_request)
    monkeypatch.setattr(main, 'ensure_min_role', fake_ensure_min_role)

    client = TestClient(main.app)
    response = client.post(
        '/v1/knowledge/web-harvest',
        json={'orgSlug': 'acme', 'agentKind': 'AUDIT', 'webSourceId': 'source-1'},
        headers={'Authorization': 'Bearer token'},
    )

    assert response.status_code == 200
    body = response.json()
    assert body['run']['id'] == 'run-1'
