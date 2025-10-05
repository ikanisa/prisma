import asyncio
import hashlib
import io
import os
import time
from collections import defaultdict
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Optional

from fastapi import UploadFile, HTTPException
import structlog

try:
    from google.cloud import documentai
except Exception:  # pragma: no cover - optional
    documentai = None

from pypdf import PdfReader
import tiktoken
from openai import AsyncOpenAI

from sqlalchemy import text

from .db import Chunk, AsyncSessionLocal
from .rate_limit import RateLimiter

try:  # pragma: no cover - optional dependency for high-quality reranking
    from sentence_transformers import CrossEncoder  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    CrossEncoder = None
from .config_loader import (
    get_vector_index_configs,
    get_semantic_search_settings,
    get_retrieval_settings,
)

MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
client = AsyncOpenAI()
rate_limiter = RateLimiter(int(os.getenv("OPENAI_RPM", "60")))
logger = structlog.get_logger(__name__)

_RERANKER_CACHE: Dict[str, Any] = {}
_RERANKER_FAILED: Dict[str, bool] = {}


@lru_cache(maxsize=1)
def _vector_index_map() -> Dict[str, Dict[str, Any]]:
    mapping: Dict[str, Dict[str, Any]] = {}
    for entry in get_vector_index_configs():
        name = entry.get("name")
        if isinstance(name, str) and name:
            mapping[name] = entry
    return mapping


@lru_cache(maxsize=1)
def get_primary_index_config() -> Dict[str, Any]:
    index_name = get_semantic_search_settings().get("index") or "finance_docs_v1"
    indexes = _vector_index_map()
    if index_name not in indexes and indexes:
        # Fall back to the first configured index when the requested one is missing.
        index_name = next(iter(indexes.keys()))
    config = indexes.get(index_name)
    if not config:
        config = {
            "name": index_name,
            "backend": "pgvector",
            "embedding_model": MODEL,
            "chunk_size": 1000,
            "chunk_overlap": 150,
            "scope_filters": [],
            "seed_sets": [],
        }
    return config


@lru_cache(maxsize=1)
def get_retrieval_config() -> Dict[str, Any]:
    settings = get_retrieval_settings()
    reranker = settings.get("reranker") or "mini-lm-re-ranker-v2"
    try:
        top_k = int(settings.get("top_k") or 5)
    except (TypeError, ValueError):
        top_k = 5
    try:
        min_conf = float(settings.get("min_citation_confidence") or 0.5)
    except (TypeError, ValueError):
        min_conf = 0.5
    require_citation = bool(settings.get("require_citation", True))
    return {
        "reranker": reranker,
        "top_k": max(1, top_k),
        "min_citation_confidence": max(0.0, min(1.0, min_conf)),
        "require_citation": require_citation,
    }

def count_tokens(text: str) -> int:
    enc = tiktoken.get_encoding("cl100k_base")
    return len(enc.encode(text))

def chunk_text(text: str, max_tokens: int | None = None, overlap: int | None = None) -> List[str]:
    index_config = get_primary_index_config()
    chunk_size = max_tokens or int(index_config.get("chunk_size") or 1000)
    chunk_overlap = overlap if overlap is not None else int(index_config.get("chunk_overlap") or 150)
    chunk_size = max(1, chunk_size)
    chunk_overlap = max(0, min(chunk_overlap, chunk_size - 1)) if chunk_size > 1 else 0

    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(text)
    chunks = []
    start = 0
    step = max(1, chunk_size - chunk_overlap)
    while start < len(tokens):
        end = start + chunk_size
        chunk_tokens = tokens[start:end]
        chunks.append(enc.decode(chunk_tokens))
        start += step
    return chunks

async def extract_text(file: UploadFile) -> str:
    data = await file.read()
    if documentai and os.getenv("DOCAI_PROCESSOR_ID"):
        try:
            client = documentai.DocumentProcessorServiceClient()
            name = client.processor_path(
                os.getenv("GOOGLE_PROJECT_ID"),
                os.getenv("GOOGLE_LOCATION", "us"),
                os.getenv("DOCAI_PROCESSOR_ID"),
            )
            doc = documentai.RawDocument(content=data, mime_type=file.content_type)
            request = documentai.ProcessRequest(name=name, raw_document=doc)
            result = client.process_document(request=request)
            return result.document.text
        except Exception:
            pass
    reader = PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)

async def embed_chunks(chunks: List[str], model: str | None = None) -> List[List[float]]:
    target_model = model or get_primary_index_config().get("embedding_model") or MODEL
    embeddings = []
    for ch in chunks:
        if not rate_limiter.allow(time.time()):
            raise HTTPException(status_code=429, detail="OpenAI rate limit exceeded")
        res = await client.embeddings.create(model=target_model, input=ch)
        embeddings.append(res.data[0].embedding)
    return embeddings

async def store_chunks(
    document_id: str,
    org_id: str,
    index_name: str,
    embed_model: str | None,
    chunks: List[str],
    embeds: List[List[float]],
) -> None:
    async with AsyncSessionLocal() as session:
        for idx, (content, emb) in enumerate(zip(chunks, embeds)):
            content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
            session.add(
                Chunk(
                    org_id=org_id,
                    document_id=document_id,
                    chunk_index=idx,
                    content=content,
                    embedding=emb,
                    embed_model=embed_model,
                    index_name=index_name,
                    content_hash=content_hash,
                )
            )
        await session.commit()


async def remove_document_chunks(org_id: str, document_id: str, index_name: Optional[str] = None) -> None:
    async with AsyncSessionLocal() as session:
        if index_name:
            await session.execute(
                text(
                    "DELETE FROM chunks WHERE org_id = :org AND document_id = :doc AND index_name = :index"
                ).bindparams(org=org_id, doc=document_id, index=index_name)
            )
        else:
            await session.execute(
                text("DELETE FROM chunks WHERE org_id = :org AND document_id = :doc").bindparams(
                    org=org_id, doc=document_id
                )
            )
        await session.commit()


def _prepare_row(row: Any) -> Dict[str, Any]:
    return {
        "id": getattr(row, "id", None),
        "documentId": getattr(row, "document_id", None),
        "chunkIndex": getattr(row, "chunk_index", None),
        "content": getattr(row, "content", ""),
        "documentName": getattr(row, "document_name", None),
        "repo": getattr(row, "repo_folder", None),
        "score": getattr(row, "score", None),
        "indexName": getattr(row, "index_name", None),
    }


def _heuristic_rerank(query: str, results: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    items = list(results)
    if not items:
        return []

    tokens = [token for token in query.lower().split() if token]

    def compute_weight(item: Dict[str, Any]) -> float:
        base_score = float(item.get("score") or 0.0)
        content = str(item.get("content") or "").lower()
        lexical_hits = sum(1 for token in tokens if token and token in content)
        return base_score + (0.01 * lexical_hits)

    return sorted(items, key=compute_weight, reverse=True)


def _load_reranker(model_name: str) -> Optional[Any]:  # pragma: no cover - thin wrapper
    if not model_name:
        return None
    if CrossEncoder is None:
        return None
    if _RERANKER_FAILED.get(model_name):
        return None
    if model_name in _RERANKER_CACHE:
        return _RERANKER_CACHE[model_name]
    try:
        reranker = CrossEncoder(model_name)
    except Exception as exc:  # pragma: no cover - dependency issues
        logger.warning(
            "rag.reranker_load_failed",
            model=model_name,
            error=str(exc),
        )
        _RERANKER_FAILED[model_name] = True
        return None
    _RERANKER_CACHE[model_name] = reranker
    return reranker


async def _apply_reranker(query: str, results: Iterable[Dict[str, Any]], reranker: str) -> List[Dict[str, Any]]:
    items = list(results)
    if not items:
        return []

    reranker_model = _load_reranker(reranker)
    if reranker_model is None:
        return _heuristic_rerank(query, items)

    pairs = [(query, str(item.get("content") or "")) for item in items]
    loop = asyncio.get_running_loop()

    try:
        scores = await loop.run_in_executor(None, lambda: reranker_model.predict(pairs))  # type: ignore[arg-type]
    except Exception as exc:  # pragma: no cover - dependency issues
        logger.warning(
            "rag.reranker_inference_failed",
            model=reranker,
            error=str(exc),
        )
        return _heuristic_rerank(query, items)

    ranked_pairs = sorted(zip(items, scores), key=lambda pair: pair[1], reverse=True)
    ordered: List[Dict[str, Any]] = []
    for item, score in ranked_pairs:
        item["_rerankScore"] = float(score)
        ordered.append(item)
    return ordered


async def perform_semantic_search(org_id: str, query: str, requested_k: int) -> Dict[str, Any]:
    retrieval_config = get_retrieval_config()
    limit = max(1, min(retrieval_config["top_k"], requested_k))

    configured_indexes = get_vector_index_configs()
    primary_index = get_primary_index_config()
    seen_names = {entry.get("name") for entry in configured_indexes}
    if primary_index.get("name") and primary_index.get("name") not in seen_names:
        configured_indexes = [primary_index, *configured_indexes]
    if not configured_indexes:
        configured_indexes = [primary_index]

    embeddings: Dict[str, List[float]] = {}
    aggregated: List[Dict[str, Any]] = []
    fallback_used = False
    indexes_meta: List[Dict[str, Any]] = []

    async with AsyncSessionLocal() as session:
        for index_config in configured_indexes:
            index_name = index_config.get("name") or primary_index.get("name") or "finance_docs_v1"
            embedding_model = index_config.get("embedding_model") or primary_index.get("embedding_model") or MODEL
            chunk_size = int(index_config.get("chunk_size") or primary_index.get("chunk_size") or 1000)
            chunk_overlap = int(index_config.get("chunk_overlap") or primary_index.get("chunk_overlap") or 150)

            indexes_meta.append(
                {
                    "name": index_name,
                    "embeddingModel": embedding_model,
                    "chunkSize": chunk_size,
                    "chunkOverlap": chunk_overlap,
                }
            )

            if embedding_model not in embeddings:
                embeddings[embedding_model] = (await embed_chunks([query], model=embedding_model))[0]
            query_embedding = embeddings[embedding_model]

            res = await session.execute(
                text(
                    """
                SELECT
                    c.id,
                    c.document_id,
                    c.chunk_index,
                    c.content,
                    1 - (c.embedding <=> :vec) AS score,
                    d.name AS document_name,
                    d.repo_folder,
                    c.index_name
                FROM chunks c
                JOIN documents d ON d.id = c.document_id
                WHERE c.org_id = :org AND c.index_name = :index_name
                ORDER BY c.embedding <=> :vec
                LIMIT :limit
                """
                ).bindparams(vec=query_embedding, org=org_id, index_name=index_name, limit=limit)
            )
            rows = res.fetchall()

            if not rows:
                fallback_used = True
                res = await session.execute(
                    text(
                        """
                    SELECT
                        c.id,
                        c.document_id,
                        c.chunk_index,
                        c.content,
                        NULL::float AS score,
                        d.name AS document_name,
                        d.repo_folder,
                        c.index_name
                    FROM chunks c
                    JOIN documents d ON d.id = c.document_id
                    WHERE c.org_id = :org AND c.index_name = :index_name AND c.content ILIKE :pattern
                    LIMIT :limit
                    """
                    ).bindparams(
                        org=org_id,
                        index_name=index_name,
                        pattern=f"%{query}%",
                        limit=limit,
                    )
                )
                rows = res.fetchall()

            prepared = [_prepare_row(row) for row in rows]
            for item in prepared:
                item.setdefault("indexName", index_name)
            aggregated.extend(prepared)

    ranked = await _apply_reranker(query, aggregated, retrieval_config["reranker"])
    annotated: List[Dict[str, Any]] = []
    for item in ranked[:limit]:
        score = item.get("score")
        meets_threshold = bool(score is not None and score >= retrieval_config["min_citation_confidence"])
        annotated.append({**item, "meetsThreshold": meets_threshold})

    has_confident = any(entry["meetsThreshold"] for entry in annotated)

    return {
        "results": annotated,
        "meta": {
            "indexes": indexes_meta,
            "reranker": retrieval_config["reranker"],
            "minCitationConfidence": retrieval_config["min_citation_confidence"],
            "requireCitation": retrieval_config["require_citation"],
            "hasConfidentResult": has_confident,
            "fallbackUsed": fallback_used,
            "queried": limit,
            "totalCandidates": len(ranked),
        },
    }
