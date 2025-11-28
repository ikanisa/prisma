import json
from typing import Any, Dict, List

import pytest

from server.deterministic_contract import validate_manifest
import server.main as main


class DummyResponse:
    def __init__(self, status_code: int, payload=None, *, count: int | None = None):
        self.status_code = status_code
        self._payload = payload
        self.text = '' if payload is None else json.dumps(payload)
        self.content = self.text.encode()
        total = count if count is not None else (len(payload) if isinstance(payload, list) else 0)
        upper = max(total - 1, 0)
        self.headers = {'content-range': f'0-{upper}/{total}'}

    def json(self):
        return self._payload


@pytest.fixture
def anyio_backend():
    return 'asyncio'


def _workflow_definition(key: str, steps: List[str], approvals: List[str]) -> Dict[str, Any]:
    return {
        key: {
            'steps': [{'agent_id': 'agent', 'tool': step} for step in steps],
            'approvals': approvals,
            'minimum_autonomy': 'L2',
        }
    }


@pytest.mark.anyio
async def test_close_cycle_autopilot_stages_all_but_final_step(monkeypatch):
    run_state: Dict[str, Any] = {
        'id': 'run-1',
        'org_id': 'org-1',
        'workflow': 'monthly_close',
        'status': 'RUNNING',
        'current_step_index': 0,
        'total_steps': 6,
    }
    staged_indices: List[int] = []

    async def fake_ensure(org_id: str, workflow_key: str, **_kwargs):
        assert org_id == 'org-1'
        assert workflow_key == 'monthly_close'
        return dict(run_state)

    async def fake_complete(run: Dict[str, Any], workflow_key: str, *, step_index: int, **_kwargs):
        assert workflow_key == 'monthly_close'
        staged_indices.append(step_index)
        run_state['current_step_index'] = step_index + 1
        run_state['status'] = 'RUNNING'
        return dict(run_state)

    async def fake_table_request(method: str, table: str, **_kwargs):
        if table == 'approval_queue' and method == 'GET':
            return DummyResponse(200, [{'id': 'approval-1', 'kind': 'CLOSE_LOCK', 'stage': 'PARTNER'}], count=1)
        if table == 'telemetry_alerts' and method == 'GET':
            return DummyResponse(200, [], count=0)
        raise AssertionError(f'unexpected call {method} {table}')

    monkeypatch.setattr(main, 'ensure_workflow_run', fake_ensure)
    monkeypatch.setattr(main, 'complete_workflow_step', fake_complete)
    monkeypatch.setattr(main, 'supabase_table_request', fake_table_request)
    monkeypatch.setattr(main, 'iso_now', lambda: '2025-01-01T00:00:00Z')
    monkeypatch.setattr(
        main,
        'get_workflow_definitions',
        lambda: _workflow_definition(
            'monthly_close',
            ['close.snapshot_tb', 'recon.bank', 'je.analytics', 'variance.analyze', 'cashflow.build_indirect', 'prepare_lock'],
            ['close.lock -> PARTNER'],
        ),
    )

    result = await main._handle_autopilot_close_cycle({'id': 'job-1', 'org_id': 'org-1', 'kind': 'close_cycle'})

    assert result['domain'] == 'close'
    assert result['run']['steps']['staged'] == len(staged_indices) == 5
    assert result['run']['steps']['remaining'] == 1
    assert result['approvals']['pending'] == 1
    assert validate_manifest(result['manifest'])


@pytest.mark.anyio
async def test_tax_cycle_autopilot_completes_all_steps(monkeypatch):
    run_state: Dict[str, Any] = {
        'id': 'run-9',
        'org_id': 'org-1',
        'workflow': 'tax_cycle',
        'status': 'RUNNING',
        'current_step_index': 0,
        'total_steps': 5,
    }
    staged_indices: List[int] = []

    async def fake_ensure(org_id: str, workflow_key: str, **_kwargs):
        assert workflow_key == 'tax_cycle'
        return dict(run_state)

    async def fake_complete(run: Dict[str, Any], workflow_key: str, *, step_index: int, **_kwargs):
        staged_indices.append(step_index)
        run_state['current_step_index'] = step_index + 1
        if run_state['current_step_index'] >= run_state['total_steps']:
            run_state['status'] = 'COMPLETED'
        return dict(run_state)

    async def fake_table_request(method: str, table: str, **_kwargs):
        if table == 'approval_queue' and method == 'GET':
            return DummyResponse(200, [{'id': 'approval-7', 'kind': 'TAX_RETURN_SUBMIT', 'stage': 'MANAGER'}], count=1)
        if table == 'telemetry_alerts' and method == 'GET':
            return DummyResponse(200, [{'id': 'alert-1', 'alert_type': 'TAX_ALERT', 'severity': 'INFO'}], count=1)
        raise AssertionError(f'unexpected call {method} {table}')

    monkeypatch.setattr(main, 'ensure_workflow_run', fake_ensure)
    monkeypatch.setattr(main, 'complete_workflow_step', fake_complete)
    monkeypatch.setattr(main, 'supabase_table_request', fake_table_request)
    monkeypatch.setattr(main, 'iso_now', lambda: '2025-01-02T00:00:00Z')
    monkeypatch.setattr(
        main,
        'get_workflow_definitions',
        lambda: _workflow_definition(
            'tax_cycle',
            ['mt.cit.compute', 'mt.vat.prepare', 'dac6.classify', 'p2.scope', 'p2.compute'],
            ['tax.return.submit -> MANAGER'],
        ),
    )

    result = await main._handle_autopilot_tax_cycle({'id': 'job-9', 'org_id': 'org-1', 'kind': 'tax_cycle'})

    assert result['domain'] == 'tax'
    assert result['run']['steps']['staged'] == len(staged_indices) == 5
    assert result['run']['steps']['remaining'] == 0
    assert result['telemetry']['open'] == 1
    assert validate_manifest(result['manifest'])
