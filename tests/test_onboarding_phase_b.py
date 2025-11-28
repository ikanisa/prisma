import json
import os
from typing import Any, Dict, List, Optional

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
        self.headers: Dict[str, str] = {}

    def json(self):
        return self._payload


def _auth_headers():
    return {'Authorization': 'Bearer token'}


def test_onboarding_commit_seeds_tasks_and_notifications(monkeypatch):
    checklist_payload = {
        'id': 'chk-1',
        'org_id': 'org-1',
        'temp_entity_id': 'tmp-entity',
        'industry': 'technology',
        'country': 'MT',
        'status': 'ACTIVE',
        'items': [
            {
                'id': 'item-1',
                'category': 'Accounting',
                'label': 'Trial balance',
                'status': 'REVIEW',
                'document_id': 'doc-1',
            },
            {
                'id': 'item-2',
                'category': 'Banking',
                'label': 'Bank statement',
                'status': 'REVIEW',
                'document_id': 'doc-2',
            },
        ],
    }

    extractions = {
        'doc-1': {
            'fields': {
                'period_start': '2024-01-01',
                'period_end': '2024-01-31',
                'currency': 'EUR',
                'total_debits': 1000,
                'total_credits': 1000,
            },
            'document_type': 'TB',
        },
        'doc-2': {
            'fields': {
                'iban': 'MT11BANK0000000001',
                'bank_name': 'Glow Bank',
                'period_start': '2024-01-01',
                'period_end': '2024-01-31',
            },
            'document_type': 'BANK_STMT',
        },
    }

    created_tasks: List[Dict[str, Any]] = []
    notifications: List[Dict[str, Any]] = []

    async def fake_fetch_checklist_with_items(checklist_id: str):
        assert checklist_id == 'chk-1'
        return checklist_payload

    async def fake_supabase_table_request(method: str, table: str, **kwargs):
        if table == 'document_extractions' and method == 'GET':
            params = kwargs.get('params') or {}
            doc_param = params.get('document_id', '')
            doc_id = doc_param.split('.', 1)[-1] if '.' in doc_param else doc_param
            data = extractions.get(doc_id)
            if not data:
                return DummyResponse(200, [])
            payload = [
                {
                    'id': f'extract-{doc_id}',
                    'fields': data['fields'],
                    'document_type': data['document_type'],
                    'status': 'DONE',
                }
            ]
            return DummyResponse(200, payload)
        if table == 'company_profile_drafts' and method == 'PATCH':
            return DummyResponse(200, [{'id': 'draft-1', 'extracted': kwargs.get('json', {}).get('extracted', {})}])
        if table == 'onboarding_checklists' and method == 'PATCH':
            return DummyResponse(204, [])
        return DummyResponse(200, [])

    async def fake_insert_task_record(*, org_id: str, creator_id: str, payload: Dict[str, Any]):
        task = {
            'id': f"task-{len(created_tasks) + 1}",
            'org_id': org_id,
            'engagement_id': None,
            'title': payload.get('title'),
            'description': payload.get('description'),
            'status': payload.get('status', 'TODO'),
            'priority': payload.get('priority', 'MEDIUM'),
            'assigned_to': None,
            'due_date': payload.get('due_date'),
            'created_by': creator_id,
            'created_at': '2024-01-01T00:00:00Z',
            'updated_at': '2024-01-01T00:00:00Z',
        }
        created_tasks.append(task)
        return task

    async def fake_create_notification(
        *,
        org_id: str,
        user_id: str,
        kind: str,
        title: str,
        body: Optional[str] = None,
        link: Optional[str] = None,
        urgent: bool = False,
    ):
        notifications.append({'org_id': org_id, 'user_id': user_id, 'kind': kind, 'title': title, 'body': body, 'urgent': urgent})

    async def fake_ensure_org_access(user_id: str, org_id: str):
        return 'MANAGER'

    async def fake_enforce_rate_limit(*_args, **_kwargs):
        return None

    monkeypatch.setattr(main, 'fetch_checklist_with_items', fake_fetch_checklist_with_items)
    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)
    monkeypatch.setattr(main, 'insert_task_record', fake_insert_task_record)
    monkeypatch.setattr(main, 'create_notification', fake_create_notification)
    monkeypatch.setattr(main, 'ensure_org_access_by_id', fake_ensure_org_access)
    monkeypatch.setattr(main, 'enforce_rate_limit', fake_enforce_rate_limit)
    monkeypatch.setattr(main, 'verify_supabase_jwt', lambda _token: {'sub': 'user-99'})

    client = TestClient(main.app)
    response = client.post(
        '/v1/onboarding/commit',
        json={'checklistId': 'chk-1', 'profile': {'name': 'New Co'}},
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body['taskSeeds']) == 2
    assert len(body['tasks']) == 2
    assert len(created_tasks) == 2
    assert len(notifications) == 2

