import pytest

from scripts.operations import backfill_openai_retrieval as backfill


@pytest.mark.parametrize(
    "row,expected",
    [
        ({"deleted": True, "storage_path": "foo", "mime_type": "application/pdf"}, "deleted"),
        ({"deleted": False, "storage_path": "", "mime_type": "application/pdf"}, "missing_storage_path"),
        ({"storage_path": "foo", "mime_type": "text/plain"}, "unsupported_mime:text/plain"),
        ({"storage_path": "foo", "mime_type": "APPLICATION/PDF"}, None),
        ({"storage_path": "foo", "mime_type": "application/pdf", "file_size": 0}, "empty_file"),
    ],
)
def test_should_skip_document(row, expected):
    assert backfill.should_skip_document(row) == expected


def test_build_filename_prefers_order():
    row = {"id": "doc-1", "name": "Name.pdf", "filename": "file.pdf"}
    assert backfill.build_filename(row) == "file.pdf"
    row = {"id": "doc-2", "name": "Name.pdf", "filename": None}
    assert backfill.build_filename(row) == "Name.pdf"
    row = {"id": "doc-3", "name": None, "filename": None}
    assert backfill.build_filename(row) == "doc-3.pdf"


def test_build_extra_attributes_normalises_values():
    row = {
        "repo_folder": "03_Accounting",
        "entity_id": "entity-7",
        "uploaded_by": "user-9",
        "file_size": 1024,
        "created_at": "2024-10-01T00:00:00Z",
    }
    attrs = backfill.build_extra_attributes(row)
    assert attrs["source"] == "pgvector_backfill_v1"
    assert attrs["repo_folder"] == "03_Accounting"
    assert attrs["entity_id"] == "entity-7"
    assert attrs["uploaded_by"] == "user-9"
    assert attrs["file_size"] == "1024"
    assert attrs["created_at"] == "2024-10-01T00:00:00Z"


def test_encode_path_handles_spaces():
    assert backfill._encode_path("foo bar/baz qux.pdf") == "foo%20bar/baz%20qux.pdf"


@pytest.mark.asyncio
async def test_process_document_invokes_ingest(monkeypatch):
    captured = {}

    async def fake_ingest_document(**kwargs):
        captured.update(kwargs)
        return {"vectorStoreId": "vs_test", "fileId": "file-1"}

    monkeypatch.setattr(backfill.openai_retrieval, "ingest_document", fake_ingest_document)

    row = {
        "id": "doc-1",
        "org_id": "org-1",
        "filename": "sample.pdf",
        "mime_type": "application/pdf",
    }

    result = await backfill.process_document(row, storage_bytes=b"pdf-bytes")

    assert result == {"vectorStoreId": "vs_test", "fileId": "file-1"}
    assert captured["org_id"] == "org-1"
    assert captured["document_id"] == "doc-1"
    assert captured["filename"] == "sample.pdf"
    assert captured["mime_type"] == "application/pdf"
    assert captured["data"] == b"pdf-bytes"
