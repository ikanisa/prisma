import asyncio
from datetime import datetime, timedelta, timezone

import pytest

pytest.importorskip('fastapi')
from fastapi import HTTPException

import server.main as main


@pytest.mark.asyncio
async def test_require_recent_whatsapp_mfa_accepts_recent_challenge(monkeypatch):
    async def fake_supabase_table_request(_method, _table, *, params=None, **_):
        assert params['consumed'] == 'eq.true'
        return type('Resp', (), {
            'status_code': 200,
            'json': lambda: [{'created_at': datetime.now(timezone.utc).isoformat()}],
        })

    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)

    await main.require_recent_whatsapp_mfa('org-1', 'user-1')


@pytest.mark.asyncio
async def test_require_recent_whatsapp_mfa_rejects_stale_challenge(monkeypatch):
    async def fake_supabase_table_request(_method, _table, *, params=None, **_):
        old = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        return type('Resp', (), {
            'status_code': 200,
            'json': lambda: [{'created_at': old}],
        })

    monkeypatch.setattr(main, 'supabase_table_request', fake_supabase_table_request)

    with pytest.raises(HTTPException) as exc:
        await main.require_recent_whatsapp_mfa('org-1', 'user-1')
    assert exc.value.status_code == 403
    assert exc.value.detail == 'mfa_required'
