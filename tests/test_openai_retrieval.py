from types import SimpleNamespace
from typing import Any, Dict

import pytest

import server.openai_retrieval as retrieval


class DummyVectorStores:
    def __init__(self) -> None:
        self.kwargs: Dict[str, Any] = {}

    async def search(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(
            data=[
                SimpleNamespace(
                    id="chunk-1",
                    file_id="file-123",
                    filename="policy.pdf",
                    score=0.72,
                    content=[SimpleNamespace(type="text", text="According to the policy...")],
                    attributes={
                        "document_id": "doc-123",
                        "repo": "03_Accounting",
                        "chunk_index": 2,
                    },
                ),
                SimpleNamespace(
                    id="chunk-2",
                    file_id="file-456",
                    filename="notes.pdf",
                    score=0.2,
                    content=[SimpleNamespace(type="text", text="Low confidence excerpt")],
                    attributes={},
                ),
            ],
            search_query="policy guidance",
        )

    async def list(self, **_kwargs):  # pragma: no cover - not hit when id configured
        return SimpleNamespace(data=[])

    async def create(self, **_kwargs):  # pragma: no cover - not hit when id configured
        return SimpleNamespace(id="vs-created")


class DummyFiles:
    def __init__(self) -> None:
        self.kwargs: Dict[str, Any] = {}

    async def upload_and_poll(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(id="vsf-1", status="completed")


@pytest.mark.asyncio
async def test_search_transforms_results(monkeypatch):
    monkeypatch.setenv("OPENAI_RETRIEVAL_VECTOR_STORE_ID", "vs_test")
    retrieval.reset_cache()

    stores = DummyVectorStores()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        search=stores.search,
        list=stores.list,
        create=stores.create,
        files=DummyFiles(),
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    config = {
        "reranker": "default-2024-08-21",
        "top_k": 8,
        "min_citation_confidence": 0.6,
        "require_citation": True,
    }

    result = await retrieval.search("org-1", "Explain IFRS 15", 3, config)

    assert stores.kwargs["attribute_filter"]["value"] == "org-1"
    assert stores.kwargs["ranking_options"]["score_threshold"] == pytest.approx(0.6)
    assert result["meta"]["indexes"][0]["name"] == "vs_test"
    assert result["meta"]["rewrittenQuery"] == "policy guidance"
    assert len(result["results"]) == 2
    assert result["results"][0]["documentId"] == "doc-123"
    assert result["results"][0]["meetsThreshold"] is True
    assert result["results"][1]["meetsThreshold"] is False

    monkeypatch.delenv("OPENAI_RETRIEVAL_VECTOR_STORE_ID", raising=False)
    retrieval.reset_cache()


@pytest.mark.asyncio
async def test_ingest_document_uploads_with_attributes(monkeypatch):
    monkeypatch.setenv("OPENAI_RETRIEVAL_VECTOR_STORE_ID", "vs_test")
    retrieval.reset_cache()

    files = DummyFiles()
    client = SimpleNamespace(vector_stores=SimpleNamespace(files=files))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.ingest_document(
        org_id="org-1",
        data=b"pdf-bytes",
        filename="sample.pdf",
        mime_type="application/pdf",
        document_id="doc-7",
    )

    assert result == {
        "vectorStoreId": "vs_test",
        "fileId": "vsf-1",
        "status": "completed",
    }
    assert files.kwargs["attributes"]["org_id"] == "org-1"
    assert files.kwargs["attributes"]["document_id"] == "doc-7"
    assert files.kwargs["file"][0] == "sample.pdf"

    monkeypatch.delenv("OPENAI_RETRIEVAL_VECTOR_STORE_ID", raising=False)
    retrieval.reset_cache()
