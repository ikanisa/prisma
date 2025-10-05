import json
import sys
from pathlib import Path
from typing import Any, Dict, List

import pytest

sys.path.append(str(Path(__file__).resolve().parent.parent))

from server.autopilot_handlers import handle_extract_documents
from server.document_ai import (
    DocumentAIClassificationResult,
    DocumentAIError,
    DocumentAIExtractionResult,
    DocumentAIIndexRecord,
    DocumentAIOCRResult,
    DocumentAIProvider,
    create_document_ai_pipeline,
)


@pytest.fixture
def anyio_backend():
    return "asyncio"


class DummyResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload
        self.text = json.dumps(payload) if payload is not None else ""
        self.content = self.text.encode()

    def json(self):
        return self._payload


class FakeSupabase:
    def __init__(self, rows: List[Dict[str, Any]], memberships: List[Dict[str, Any]] | None = None):
        self.rows = rows
        self.memberships = memberships or []
        self.calls: List[tuple[str, str, Dict[str, Any] | None, Dict[str, Any] | None]] = []
        self.extraction_updates: List[Dict[str, Any]] = []
        self.document_updates: List[Dict[str, Any]] = []
        self.index_posts: List[Dict[str, Any]] = []
        self.quarantine_entries: List[Dict[str, Any]] = []
        self.notifications: List[Dict[str, Any]] = []

    async def __call__(self, method, table, params=None, json=None, headers=None):
        self.calls.append((method, table, params, json))
        if method == "GET" and table == "document_extractions":
            return DummyResponse(200, self.rows)
        if method == "PATCH" and table == "document_extractions":
            self.extraction_updates.append(json or {})
            return DummyResponse(204, None)
        if method == "PATCH" and table == "documents":
            self.document_updates.append(json or {})
            return DummyResponse(204, None)
        if method == "DELETE" and table == "document_index":
            return DummyResponse(204, None)
        if method == "POST" and table == "document_index":
            self.index_posts.append(json or {})
            return DummyResponse(201, None)
        if method == "POST" and table == "document_quarantine":
            self.quarantine_entries.append(json or {})
            return DummyResponse(201, None)
        if method == "GET" and table == "memberships":
            return DummyResponse(200, self.memberships)
        if method == "POST" and table == "notifications":
            self.notifications.append(json or {})
            return DummyResponse(201, None)
        return DummyResponse(204, None)


class VectorRecorder:
    def __init__(self) -> None:
        self.calls: List[Dict[str, Any]] = []

    async def __call__(self, context, records):
        self.calls.append(
            {
                "document_id": context.document_id,
                "org_id": context.org_id,
                "records": list(records),
            }
        )


class SuccessfulProvider(DocumentAIProvider):
    async def run_ocr(self, context):
        return DocumentAIOCRResult(text="Prisma Labs Ltd registration")

    async def classify(self, context, _ocr):
        return DocumentAIClassificationResult(label="INCORP_CERT", confidence=0.92)

    async def extract(self, context, _ocr, classification):
        fields = {
            "company_name": "Prisma Labs Ltd",
            "reg_no": "C12345",
            "inc_date": "2020-01-01",
            "registered_address": "1 Finance Way",
            "directors[]": ["Jane Doe"],
            "shareholders[]": ["Ikanisa Holdings"],
            "share_capital": "€50,000",
        }
        provenance = [
            {"documentId": context.document_id, "field": "company_name", "page": 1, "span": "1-5"},
            {"documentId": context.document_id, "field": "reg_no", "page": 1, "span": "6-12"},
        ]
        return DocumentAIExtractionResult(fields=fields, confidence=0.88, provenance=provenance, summary="Company profile")

    async def index(self, context, _ocr, extraction):
        return [
            DocumentAIIndexRecord(
                tokens="prisma labs ltd c12345",
                extracted_meta={"company_name": "Prisma Labs Ltd"},
            )
        ]


class FailingProvider(DocumentAIProvider):
    async def run_ocr(self, context):
        return DocumentAIOCRResult(text="Bank statement unreadable")

    async def classify(self, context, _ocr):
        return DocumentAIClassificationResult(label="BANK_STMT", confidence=0.5)

    async def extract(self, context, _ocr, classification):
        raise DocumentAIError("OCR confidence below threshold")

    async def index(self, context, _ocr, extraction):
        return []


class _Logger:
    def __init__(self):
        self.errors: List[Dict[str, Any]] = []

    def error(self, *args, **kwargs):
        self.errors.append({"args": args, "kwargs": kwargs})


@pytest.mark.anyio
async def test_handle_autopilot_extract_documents_success():
    supabase = FakeSupabase(
        rows=[
            {
                "id": "extract-1",
                "document_id": "doc-1",
                "fields": {},
                "provenance": [],
                "documents": {
                    "id": "doc-1",
                    "org_id": "org-123",
                    "name": "Certificate.pdf",
                    "classification": "OTHER",
                    "storage_path": "org-123/docs/certificate.pdf",
                    "mime_type": "application/pdf",
                },
            }
        ]
    )
    logger = _Logger()
    vector_recorder = VectorRecorder()
    pipeline = create_document_ai_pipeline(
        supabase_table_request=supabase,
        logger=logger,
        iso_now=lambda: "2025-01-01T00:00:00Z",
        provider=SuccessfulProvider(),
        vector_ingestor=vector_recorder,
    )
    job = {"id": "job-1", "org_id": "org-123", "kind": "extract_documents", "payload": {}}

    result = await handle_extract_documents(
        job,
        supabase_table_request=supabase,
        iso_now=lambda: "2025-01-01T00:00:00Z",
        logger=logger,
        batch_limit=5,
        pipeline=pipeline,
    )

    assert result["processed"] == 1
    assert result["failed"] == []
    assert result["document_ids"] == ["doc-1"]
    assert result["documents"][0]["extraction"]["classification"] == "INCORP_CERT"
    assert any(update.get("status") == "DONE" for update in supabase.extraction_updates)
    final_update = supabase.extraction_updates[-1]
    assert final_update["document_type"] == "INCORP_CERT"
    assert pytest.approx(final_update["confidence"], 0.001) == 0.92
    assert "autopilotProcessedAt" in final_update["fields"]
    assert supabase.document_updates[-1]["classification"] == "INCORP_CERT"
    assert supabase.index_posts and supabase.index_posts[0]["document_id"] == "doc-1"
    assert vector_recorder.calls and vector_recorder.calls[0]["document_id"] == "doc-1"
    assert vector_recorder.calls[0]["records"][0].tokens == "prisma labs ltd c12345"
    assert not logger.errors


@pytest.mark.anyio
async def test_handle_autopilot_extract_documents_failure_quarantines():
    supabase = FakeSupabase(
        rows=[
            {
                "id": "extract-2",
                "document_id": "doc-2",
                "fields": {},
                "provenance": [],
                "documents": {
                    "id": "doc-2",
                    "org_id": "org-555",
                    "name": "Bank Statement.pdf",
                    "classification": "OTHER",
                    "storage_path": "org-555/docs/bank.pdf",
                    "mime_type": "application/pdf",
                },
            }
        ],
        memberships=[{"user_id": "manager-1"}],
    )
    logger = _Logger()
    vector_recorder = VectorRecorder()
    pipeline = create_document_ai_pipeline(
        supabase_table_request=supabase,
        logger=logger,
        iso_now=lambda: "2025-01-02T00:00:00Z",
        provider=FailingProvider(),
        vector_ingestor=vector_recorder,
    )
    job = {"id": "job-2", "org_id": "org-555", "kind": "extract_documents", "payload": {}}

    result = await handle_extract_documents(
        job,
        supabase_table_request=supabase,
        iso_now=lambda: "2025-01-02T00:00:00Z",
        logger=logger,
        batch_limit=5,
        pipeline=pipeline,
    )

    assert result["processed"] == 0
    assert result["failed"]
    assert result["failed"][0]["id"] == "doc-2"
    assert any(update.get("status") == "FAILED" for update in supabase.extraction_updates)
    assert supabase.document_updates[-1]["parse_status"] == "FAILED"
    assert supabase.quarantine_entries and supabase.quarantine_entries[0]["document_id"] == "doc-2"
    assert supabase.notifications and supabase.notifications[0]["user_id"] == "manager-1"
    assert vector_recorder.calls == []
