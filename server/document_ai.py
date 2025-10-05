"""Document AI pipeline orchestration helpers."""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Dict, Iterable, List, Optional, Protocol

from .config_loader import get_document_ai_settings
from .rag import (
    chunk_text,
    embed_chunks,
    get_primary_index_config,
    get_vector_index_configs,
    remove_document_chunks,
    store_chunks,
)


class DocumentAIError(RuntimeError):
    """Raised when the document AI pipeline cannot complete."""


@dataclass
class DocumentContext:
    document_id: str
    org_id: str
    name: Optional[str] = None
    classification: Optional[str] = None
    storage_path: Optional[str] = None
    mime_type: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    expected_fields: List[str] = field(default_factory=list)


@dataclass
class DocumentAIOCRResult:
    text: str
    pages: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class DocumentAIClassificationResult:
    label: str
    confidence: Optional[float] = None


@dataclass
class DocumentAIExtractionResult:
    fields: Dict[str, Any]
    confidence: Optional[float] = None
    provenance: List[Dict[str, Any]] = field(default_factory=list)
    summary: Optional[str] = None


@dataclass
class DocumentAIIndexRecord:
    tokens: str
    extracted_meta: Dict[str, Any] = field(default_factory=dict)
    index_name: Optional[str] = None


@dataclass
class DocumentAIProcessResult:
    classification: str
    fields: Dict[str, Any]
    provenance: List[Dict[str, Any]]
    confidence: float
    index_records: List[DocumentAIIndexRecord] = field(default_factory=list)
    summary: Optional[str] = None


async def ingest_document_vectors(
    context: DocumentContext,
    records: Iterable[DocumentAIIndexRecord],
    *,
    logger,
) -> None:
    items = [record for record in records if isinstance(record, DocumentAIIndexRecord)]
    if not items:
        return

    primary = get_primary_index_config()
    index_map = {entry.get("name"): entry for entry in get_vector_index_configs() if entry.get("name")}
    if primary.get("name") and primary.get("name") not in index_map:
        index_map[primary.get("name")] = primary

    grouped: Dict[str, List[DocumentAIIndexRecord]] = defaultdict(list)
    default_index = primary.get("name") or "finance_docs_v1"
    for record in items:
        index_name = record.index_name or default_index
        grouped[index_name].append(record)

    for index_name, index_records in grouped.items():
        config = index_map.get(index_name) or primary
        chunk_size = int(config.get("chunk_size") or primary.get("chunk_size") or 1000)
        chunk_overlap = int(config.get("chunk_overlap") or primary.get("chunk_overlap") or 150)
        embed_model = config.get("embedding_model") or primary.get("embedding_model")

        chunks: List[str] = []
        for record in index_records:
            text = (record.tokens or "").strip()
            if not text:
                continue
            pieces = chunk_text(text, max_tokens=chunk_size, overlap=chunk_overlap)
            for piece in pieces:
                snippet = piece.strip()
                if snippet:
                    chunks.append(snippet)

        if not chunks:
            continue

        try:
            await remove_document_chunks(context.org_id, context.document_id, index_name)
            embeddings = await embed_chunks(chunks, model=embed_model)
            await store_chunks(
                document_id=context.document_id,
                org_id=context.org_id,
                index_name=index_name,
                embed_model=embed_model,
                chunks=chunks,
                embeds=embeddings,
            )
            logger.info(
                "document_ai.vector_ingest", index=index_name, document_id=context.document_id, chunks=len(chunks)
            )
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.error(
                "document_ai.vector_ingest_failed",
                index=index_name,
                document_id=context.document_id,
                error=str(exc),
            )


class DocumentAIProvider(Protocol):
    async def run_ocr(self, context: DocumentContext) -> DocumentAIOCRResult:
        ...

    async def classify(
        self, context: DocumentContext, ocr: DocumentAIOCRResult
    ) -> DocumentAIClassificationResult:
        ...

    async def extract(
        self,
        context: DocumentContext,
        ocr: DocumentAIOCRResult,
        classification: DocumentAIClassificationResult,
    ) -> DocumentAIExtractionResult:
        ...

    async def index(
        self,
        context: DocumentContext,
        ocr: DocumentAIOCRResult,
        extraction: DocumentAIExtractionResult,
    ) -> List[DocumentAIIndexRecord]:
        ...


class DefaultDocumentAIProvider:
    """Conservative provider that surfaces configured fields without extraction."""

    async def run_ocr(self, context: DocumentContext) -> DocumentAIOCRResult:
        text = ""
        if context.metadata.get("ocr_preview"):
            text = str(context.metadata["ocr_preview"])
        return DocumentAIOCRResult(text=text, pages=[])

    async def classify(
        self, context: DocumentContext, _ocr: DocumentAIOCRResult
    ) -> DocumentAIClassificationResult:
        label = (context.classification or "OTHER").strip().upper() or "OTHER"
        return DocumentAIClassificationResult(label=label, confidence=0.25)

    async def extract(
        self,
        context: DocumentContext,
        _ocr: DocumentAIOCRResult,
        classification: DocumentAIClassificationResult,
    ) -> DocumentAIExtractionResult:
        fields = {field: None for field in context.expected_fields}
        provenance = [
            {
                "documentId": context.document_id,
                "page": 1,
                "span": "auto",
                "field": field,
                "source": "document_ai_default",
            }
            for field in context.expected_fields
        ]
        return DocumentAIExtractionResult(
            fields=fields,
            confidence=classification.confidence,
            provenance=provenance,
            summary=None,
        )

    async def index(
        self,
        context: DocumentContext,
        _ocr: DocumentAIOCRResult,
        extraction: DocumentAIExtractionResult,
    ) -> List[DocumentAIIndexRecord]:
        if extraction.summary:
            summary = extraction.summary
        elif context.name:
            summary = context.name
        else:
            summary = ""
        if not summary:
            return []
        return [
            DocumentAIIndexRecord(
                tokens=summary,
                extracted_meta={"documentId": context.document_id},
            )
        ]


class DocumentAIPipeline:
    def __init__(
        self,
        *,
        supabase_table_request,
        logger,
        iso_now,
        provider: Optional[DocumentAIProvider] = None,
        vector_ingestor: Optional[Callable[[DocumentContext, List[DocumentAIIndexRecord]], Awaitable[None]]] = None,
    ) -> None:
        self._supabase_table_request = supabase_table_request
        self._logger = logger
        self._iso_now = iso_now
        self._settings = get_document_ai_settings()
        self._steps = list(self._settings.get("steps", [])) or ["ocr", "classify", "extract", "index"]
        self._extractors: Dict[str, List[str]] = {
            key: list(values)
            for key, values in (self._settings.get("extractors") or {}).items()
        }
        self._provenance_required = bool(self._settings.get("provenance_required", True))
        self._error_handling = (self._settings.get("error_handling") or "").strip() or "quarantine_and_notify"
        self._provider: DocumentAIProvider = provider or DefaultDocumentAIProvider()
        self._vector_ingestor = vector_ingestor

    @property
    def error_handling(self) -> str:
        return self._error_handling

    @property
    def steps(self) -> List[str]:
        return list(self._steps)

    def prepare_context(self, row: Dict[str, Any]) -> DocumentContext:
        document = row.get("documents") or {}
        if not document:
            raise DocumentAIError("document metadata missing")

        document_id = str(document.get("id")) if document.get("id") else None
        org_id = str(document.get("org_id")) if document.get("org_id") else None
        if not document_id or not org_id:
            raise DocumentAIError("document context incomplete")

        return DocumentContext(
            document_id=document_id,
            org_id=org_id,
            name=document.get("name"),
            classification=document.get("classification"),
            storage_path=document.get("storage_path"),
            mime_type=document.get("mime_type"),
            metadata=document,
        )

    def _normalise_classification(self, value: Optional[str]) -> str:
        label = (value or "").strip().upper() or "OTHER"
        if self._settings.get("classifier_types"):
            allowed = set(self._settings.get("classifier_types") or [])
            if label in allowed:
                return label
        if label in self._extractors:
            return label
        return "OTHER"

    def _ensure_fields(self, classification: str, fields: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        expected = self._extractors.get(classification, [])
        provided = fields or {}
        for field_name in expected:
            result[field_name] = provided.get(field_name)
        for key, value in provided.items():
            if key not in result:
                result[key] = value
        return result

    def _normalise_provenance(
        self,
        context: DocumentContext,
        fields: Dict[str, Any],
        provenance: Optional[Iterable[Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        entries: List[Dict[str, Any]] = []
        if provenance:
            for item in provenance:
                if not isinstance(item, dict):
                    continue
                entry = dict(item)
                entry.setdefault("documentId", context.document_id)
                entry.setdefault("field", entry.get("field"))
                entry.setdefault("page", 1)
                entry.setdefault("span", entry.get("span") or "auto")
                entries.append(entry)
        if not entries and self._provenance_required:
            for field_name in fields.keys():
                entries.append(
                    {
                        "documentId": context.document_id,
                        "field": field_name,
                        "page": 1,
                        "span": "auto",
                    }
                )
        return entries

    def _normalise_index_records(
        self,
        classification: str,
        fields: Dict[str, Any],
        records: Optional[Iterable[DocumentAIIndexRecord]],
    ) -> List[DocumentAIIndexRecord]:
        normalised: List[DocumentAIIndexRecord] = []
        if records:
            for record in records:
                if not isinstance(record, DocumentAIIndexRecord):
                    continue
                tokens = record.tokens.strip()
                if not tokens:
                    continue
                meta = dict(record.extracted_meta or {})
                meta.setdefault("documentType", classification)
                meta.setdefault("fieldCount", len(fields))
                normalised.append(DocumentAIIndexRecord(tokens=tokens, extracted_meta=meta))
        if not normalised:
            tokens = " ".join(
                str(value)
                for value in fields.values()
                if isinstance(value, (str, int, float)) and str(value).strip()
            ).strip()
            if tokens:
                normalised.append(
                    DocumentAIIndexRecord(
                        tokens=tokens,
                        extracted_meta={"documentType": classification, "fieldCount": len(fields)},
                    )
                )
        return normalised

    async def process(
        self, row: Dict[str, Any], context: Optional[DocumentContext] = None
    ) -> tuple[DocumentContext, DocumentAIProcessResult]:
        context = context or self.prepare_context(row)

        ocr_result = DocumentAIOCRResult(text="")
        if "ocr" in self._steps:
            ocr_result = await self._provider.run_ocr(context)

        classification_result = DocumentAIClassificationResult(label=context.classification or "OTHER")
        if "classify" in self._steps:
            classification_result = await self._provider.classify(context, ocr_result)

        classification = self._normalise_classification(classification_result.label)
        context.classification = classification
        context.expected_fields = self._extractors.get(classification, [])

        extraction_result = DocumentAIExtractionResult(fields={})
        if "extract" in self._steps:
            extraction_result = await self._provider.extract(context, ocr_result, classification_result)

        fields = self._ensure_fields(classification, extraction_result.fields)
        provenance = self._normalise_provenance(context, fields, extraction_result.provenance)
        confidence_candidates = [classification_result.confidence, extraction_result.confidence]
        confidence = max(
            (candidate for candidate in confidence_candidates if isinstance(candidate, (int, float))),
            default=0.0,
        )

        index_records: List[DocumentAIIndexRecord] = []
        if "index" in self._steps:
            provider_records = await self._provider.index(context, ocr_result, extraction_result)
            index_records = self._normalise_index_records(classification, fields, provider_records)

        return (
            context,
            DocumentAIProcessResult(
                classification=classification,
                fields=fields,
                provenance=provenance,
                confidence=float(confidence),
                index_records=index_records,
                summary=extraction_result.summary,
            ),
        )

    async def write_index(self, context: DocumentContext, result: DocumentAIProcessResult) -> None:
        if not result.index_records:
            return
        try:
            await self._supabase_table_request(
                "DELETE",
                "document_index",
                params={"document_id": f"eq.{context.document_id}"},
            )
        except Exception as exc:  # pragma: no cover - defensive
            self._logger.error("document_ai.index_cleanup_failed", error=str(exc))
        for record in result.index_records:
            payload = {
                "document_id": context.document_id,
                "tokens": record.tokens,
                "extracted_meta": record.extracted_meta,
            }
            response = await self._supabase_table_request(
                "POST",
                "document_index",
                json=payload,
                headers={"Prefer": "return=minimal"},
            )
            if response.status_code not in (200, 201, 204):
                self._logger.error(
                    "document_ai.index_write_failed",
                    status=response.status_code,
                    body=response.text,
                    document_id=context.document_id,
                )
        if self._vector_ingestor:
            try:
                await self._vector_ingestor(context, result.index_records)
            except Exception as exc:  # pragma: no cover - defensive
                self._logger.error(
                    "document_ai.vector_ingestor_error",
                    document_id=context.document_id,
                    error=str(exc),
                )

    async def record_quarantine(
        self,
        context: DocumentContext,
        *,
        extraction_id: Optional[str],
        reason: str,
    ) -> None:
        if self._error_handling != "quarantine_and_notify":
            return
        payload = {
            "org_id": context.org_id,
            "document_id": context.document_id,
            "extraction_id": extraction_id,
            "reason": reason,
            "status": "PENDING",
        }
        response = await self._supabase_table_request(
            "POST",
            "document_quarantine",
            json=payload,
            headers={"Prefer": "return=minimal"},
        )
        if response.status_code not in (200, 201, 204):
            self._logger.error(
                "document_ai.quarantine_failed",
                status=response.status_code,
                body=response.text,
                document_id=context.document_id,
            )

        members_resp = await self._supabase_table_request(
            "GET",
            "memberships",
            params={
                "org_id": f"eq.{context.org_id}",
                "role": "in.(MANAGER,PARTNER,SYSTEM_ADMIN,EQR)",
                "select": "user_id",
            },
        )
        recipients: List[str] = []
        if members_resp.status_code == 200:
            for row in members_resp.json():
                user_id = row.get("user_id")
                if user_id:
                    recipients.append(str(user_id))
        else:
            self._logger.error(
                "document_ai.quarantine_members_lookup_failed",
                status=members_resp.status_code,
                body=members_resp.text,
                document_id=context.document_id,
            )

        for user_id in recipients:
            notification_payload = {
                "org_id": context.org_id,
                "user_id": user_id,
                "kind": "DOC",
                "title": f"Document flagged: {context.name or context.document_id}",
                "body": reason,
                "urgent": True,
            }
            await self._supabase_table_request(
                "POST",
                "notifications",
                json=notification_payload,
                headers={"Prefer": "return=minimal"},
            )


def create_document_ai_pipeline(
    *,
    supabase_table_request,
    logger,
    iso_now,
    provider: Optional[DocumentAIProvider] = None,
    vector_ingestor: Optional[Callable[[DocumentContext, List[DocumentAIIndexRecord]], Awaitable[None]]] = None,
) -> DocumentAIPipeline:
    if vector_ingestor is None:
        async def _default_ingestor(
            context: DocumentContext, records: List[DocumentAIIndexRecord]
        ) -> None:
            await ingest_document_vectors(context, records, logger=logger)

        vector_ingestor = _default_ingestor
    return DocumentAIPipeline(
        supabase_table_request=supabase_table_request,
        logger=logger,
        iso_now=iso_now,
        provider=provider,
        vector_ingestor=vector_ingestor,
    )
