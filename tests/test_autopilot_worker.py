import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parent.parent))

from server.autopilot_handlers import handle_extract_documents


@pytest.fixture
def anyio_backend():
    return "asyncio"


class DummyResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload if payload is not None else []
        self.text = ""
        self.content = b"[]" if payload is not None else b""

    def json(self):
        return self._payload


@pytest.mark.anyio
async def test_handle_autopilot_extract_documents():
    calls = []

    async def fake_supabase_table_request(method, table, params=None, json=None, headers=None):
        calls.append((method, table, params, json, headers))
        if method == "GET" and table == "document_extractions":
            payload = [
                {
                    "id": "extract-1",
                    "document_id": "doc-1",
                    "fields": {},
                    "provenance": [],
                    "documents": {"id": "doc-1", "org_id": "org-123", "name": "Audit Plan"},
                }
            ]
            return DummyResponse(payload=payload)
        return DummyResponse(status_code=204, payload=[])

    captured_errors = []

    class _Logger:
        def error(self, *args, **kwargs):
            captured_errors.append((args, kwargs))

    job = {"id": "job-1", "org_id": "org-123", "kind": "extract_documents", "payload": {}}
    result = await handle_extract_documents(
        job,
        supabase_table_request=fake_supabase_table_request,
        iso_now=lambda: "2025-01-01T00:00:00Z",
        logger=_Logger(),
        batch_limit=5,
    )

    assert result["processed"] == 1
    assert result["document_ids"] == ["doc-1"]
    patch_calls = [call for call in calls if call[0] == "PATCH" and call[1] in {"document_extractions", "documents"}]
    assert len(patch_calls) == 3
    assert not captured_errors
