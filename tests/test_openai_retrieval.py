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

    async def list(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(
            data=[
                SimpleNamespace(id="vs-1", name="Store 1"),
                SimpleNamespace(id="vs-2", name="Store 2"),
            ],
            has_more=False,
        )

    async def create(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(id="vs-created", name=kwargs.get("name", "New Store"))

    async def retrieve(self, vector_store_id: str):
        return SimpleNamespace(id=vector_store_id, name="Test Store", file_counts={"total": 5})

    async def update(self, vector_store_id: str, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(id=vector_store_id, name=kwargs.get("name", "Updated Store"))

    async def delete(self, vector_store_id: str):
        return SimpleNamespace(id=vector_store_id, deleted=True)


class DummyFiles:
    def __init__(self) -> None:
        self.kwargs: Dict[str, Any] = {}

    async def upload_and_poll(self, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(id="vsf-1", status="completed")

    async def create(self, vector_store_id: str, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(id="vsf-2", file_id=kwargs.get("file_id"), status="in_progress")

    async def create_and_poll(self, vector_store_id: str, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(id="vsf-3", file_id=kwargs.get("file_id"), status="completed")

    async def retrieve(self, vector_store_id: str, file_id: str):
        return SimpleNamespace(id="vsf-1", file_id=file_id, status="completed")

    async def update(self, vector_store_id: str, file_id: str, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(id="vsf-1", file_id=file_id, attributes=kwargs.get("attributes"))

    async def delete(self, vector_store_id: str, file_id: str):
        return SimpleNamespace(id="vsf-1", file_id=file_id, deleted=True)

    async def list(self, vector_store_id: str, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(
            data=[
                SimpleNamespace(id="vsf-1", file_id="file-1", status="completed"),
                SimpleNamespace(id="vsf-2", file_id="file-2", status="completed"),
            ],
            has_more=False,
        )


class DummyFileBatches:
    def __init__(self) -> None:
        self.kwargs: Dict[str, Any] = {}

    async def create(self, vector_store_id: str, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(id="batch-1", status="in_progress", file_counts={"total": 3})

    async def create_and_poll(self, vector_store_id: str, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(id="batch-2", status="completed", file_counts={"total": 3, "completed": 3})

    async def retrieve(self, vector_store_id: str, batch_id: str):
        return SimpleNamespace(id=batch_id, status="completed", file_counts={"total": 3, "completed": 3})

    async def cancel(self, vector_store_id: str, batch_id: str):
        return SimpleNamespace(id=batch_id, status="cancelled")

    async def list_files(self, vector_store_id: str, batch_id: str, **kwargs):
        self.kwargs = kwargs
        return SimpleNamespace(
            data=[
                SimpleNamespace(id="vsf-1", file_id="file-1", status="completed"),
                SimpleNamespace(id="vsf-2", file_id="file-2", status="completed"),
            ],
            has_more=False,
        )


@pytest.mark.asyncio
async def test_search_transforms_results(monkeypatch):
    monkeypatch.setenv("OPENAI_RETRIEVAL_VECTOR_STORE_ID", "vs_test")
    retrieval.reset_cache()

    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        search=stores.search,
        list=stores.list,
        create=stores.create,
        retrieve=stores.retrieve,
        update=stores.update,
        delete=stores.delete,
        files=files,
        file_batches=batches,
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
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(files=files, file_batches=batches))
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


@pytest.mark.asyncio
async def test_create_vector_store(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        create=stores.create,
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.create_vector_store(
        name="Test Store",
        file_ids=["file-1", "file-2"],
        expires_after={"anchor": "last_active_at", "days": 7},
    )

    assert result["id"] == "vs-created"
    assert result["name"] == "Test Store"
    assert stores.kwargs["name"] == "Test Store"
    assert stores.kwargs["file_ids"] == ["file-1", "file-2"]
    assert stores.kwargs["expires_after"]["days"] == 7


@pytest.mark.asyncio
async def test_retrieve_vector_store(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        retrieve=stores.retrieve,
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.retrieve_vector_store("vs-123")

    assert result["id"] == "vs-123"
    assert result["name"] == "Test Store"
    assert result["file_counts"]["total"] == 5


@pytest.mark.asyncio
async def test_update_vector_store(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        update=stores.update,
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.update_vector_store(
        "vs-123",
        name="Updated Store",
        expires_after={"anchor": "last_active_at", "days": 14},
    )

    assert result["id"] == "vs-123"
    assert result["name"] == "Updated Store"
    assert stores.kwargs["name"] == "Updated Store"
    assert stores.kwargs["expires_after"]["days"] == 14


@pytest.mark.asyncio
async def test_delete_vector_store(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        delete=stores.delete,
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.delete_vector_store("vs-123")

    assert result["id"] == "vs-123"
    assert result["deleted"] is True


@pytest.mark.asyncio
async def test_list_vector_stores(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        list=stores.list,
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.list_vector_stores(limit=50, order="asc")

    assert len(result["data"]) == 2
    # Access via __dict__ since SimpleNamespace objects are converted via _as_dict
    assert "vs-1" in str(result["data"])
    assert result["has_more"] is False
    assert stores.kwargs["limit"] == 50
    assert stores.kwargs["order"] == "asc"


@pytest.mark.asyncio
async def test_create_vector_store_file(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.create_vector_store_file(
        "vs-123",
        "file-abc",
        attributes={"region": "US", "category": "Marketing"},
        chunking_strategy={"type": "static", "max_chunk_size_tokens": 1200},
    )

    assert result["id"] == "vsf-2"
    assert result["file_id"] == "file-abc"
    assert files.kwargs["file_id"] == "file-abc"
    assert files.kwargs["attributes"]["region"] == "US"
    assert files.kwargs["chunking_strategy"]["max_chunk_size_tokens"] == 1200


@pytest.mark.asyncio
async def test_create_and_poll_vector_store_file(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.create_and_poll_vector_store_file(
        "vs-123",
        "file-abc",
        attributes={"region": "EU"},
    )

    assert result["id"] == "vsf-3"
    assert result["file_id"] == "file-abc"
    assert result["status"] == "completed"
    assert files.kwargs["file_id"] == "file-abc"
    assert files.kwargs["attributes"]["region"] == "EU"


@pytest.mark.asyncio
async def test_retrieve_vector_store_file(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.retrieve_vector_store_file("vs-123", "file-abc")

    assert result["id"] == "vsf-1"
    assert result["file_id"] == "file-abc"
    assert result["status"] == "completed"


@pytest.mark.asyncio
async def test_update_vector_store_file(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.update_vector_store_file(
        "vs-123",
        "file-abc",
        attributes={"region": "APAC"},
    )

    assert result["id"] == "vsf-1"
    assert result["file_id"] == "file-abc"
    assert result["attributes"]["region"] == "APAC"
    assert files.kwargs["attributes"]["region"] == "APAC"


@pytest.mark.asyncio
async def test_delete_vector_store_file(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.delete_vector_store_file("vs-123", "file-abc")

    assert result["id"] == "vsf-1"
    assert result["file_id"] == "file-abc"
    assert result["deleted"] is True


@pytest.mark.asyncio
async def test_list_vector_store_files(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.list_vector_store_files(
        "vs-123",
        limit=30,
        filter_status="completed",
    )

    assert len(result["data"]) == 2
    # Access via string representation since SimpleNamespace is converted
    assert "file-1" in str(result["data"])
    assert result["has_more"] is False
    assert files.kwargs["limit"] == 30
    assert files.kwargs["filter"] == "completed"


@pytest.mark.asyncio
async def test_create_file_batch(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.create_file_batch(
        "vs-123",
        file_ids=["file-1", "file-2", "file-3"],
    )

    assert result["id"] == "batch-1"
    assert result["status"] == "in_progress"
    assert result["file_counts"]["total"] == 3
    assert batches.kwargs["file_ids"] == ["file-1", "file-2", "file-3"]


@pytest.mark.asyncio
async def test_create_file_batch_with_objects(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.create_file_batch(
        "vs-123",
        files=[
            {"file_id": "file-1", "attributes": {"department": "finance"}},
            {"file_id": "file-2", "chunking_strategy": {"type": "static", "max_chunk_size_tokens": 1200}},
        ],
    )

    assert result["id"] == "batch-1"
    assert batches.kwargs["files"][0]["file_id"] == "file-1"
    assert batches.kwargs["files"][0]["attributes"]["department"] == "finance"


@pytest.mark.asyncio
async def test_create_and_poll_file_batch(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.create_and_poll_file_batch(
        "vs-123",
        file_ids=["file-1", "file-2", "file-3"],
    )

    assert result["id"] == "batch-2"
    assert result["status"] == "completed"
    assert result["file_counts"]["completed"] == 3
    assert batches.kwargs["file_ids"] == ["file-1", "file-2", "file-3"]


@pytest.mark.asyncio
async def test_retrieve_file_batch(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.retrieve_file_batch("vs-123", "batch-abc")

    assert result["id"] == "batch-abc"
    assert result["status"] == "completed"
    assert result["file_counts"]["total"] == 3


@pytest.mark.asyncio
async def test_cancel_file_batch(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.cancel_file_batch("vs-123", "batch-abc")

    assert result["id"] == "batch-abc"
    assert result["status"] == "cancelled"


@pytest.mark.asyncio
async def test_list_files_in_batch(monkeypatch):
    stores = DummyVectorStores()
    files = DummyFiles()
    batches = DummyFileBatches()
    client = SimpleNamespace(vector_stores=SimpleNamespace(
        files=files,
        file_batches=batches,
    ))
    monkeypatch.setattr(retrieval, "get_openai_client", lambda: client)

    result = await retrieval.list_files_in_batch(
        "vs-123",
        "batch-abc",
        limit=40,
        order="asc",
    )

    assert len(result["data"]) == 2
    # Access via string representation since SimpleNamespace is converted
    assert "file-1" in str(result["data"])
    assert result["has_more"] is False
    assert batches.kwargs["limit"] == 40
    assert batches.kwargs["order"] == "asc"
