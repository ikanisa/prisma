# Google Drive Ingestion Runbook

This runbook outlines how to operate the secure Google Drive ingestion pipeline for Avocat-AI.

## Prerequisites

- Service account configured with `drive.readonly` scope and access only to the designated folder or
  shared drive.
- Environment variables set:
  - `GDRIVE_FOLDER_ID` or `GDRIVE_SHARED_DRIVE_ID`
  - `GDRIVE_SERVICE_ACCOUNT_EMAIL`
  - `GDRIVE_SERVICE_ACCOUNT_KEY`
  - `GDRIVE_WATCH_CHANNEL_TOKEN`
- Supabase tables: `gdrive_connectors`, `gdrive_change_queue`, `gdrive_documents`.

## Initial Backfill

1. Verify the service account can see the folder (upload a test file if needed).
2. Trigger backfill:

   ```bash
   curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     https://api.example.com/api/gdrive/backfill \
     -d '{"orgSlug": "acme", "limit": 25}'
   ```
3. Response includes `connectorId`, `queued`, `processed`, `skipped`, `failed`, `remaining`.
4. Repeat if `remaining > 0` until queue drained.
5. Confirm documents appear (`documents`, `document_chunks`, `gdrive_documents`).
6. Verify embeddings in OpenAI vector store (`vector_store_ready` telemetry event).

## Incremental Sync

1. Ensure watch channel is active (`watch_channel_id`, `watch_expires_at` in `gdrive_connectors`).
2. Scheduler (`scheduler-process-changes`) posts to `/api/gdrive/process-changes` every 5 minutes.
3. Manual run:

   ```bash
   curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     https://api.example.com/api/gdrive/process-changes \
     -d '{"orgSlug": "acme", "limit": 25}'
   ```
4. Response reports queued changes, new page token, processed/skipped/failed counts.

## Handling Queue Failures

- Inspect `gdrive_change_queue` rows with `error` column populated.
- Common issues:
  - `unsupported_mime_type`: add handling rules or mark file as quarantined.
  - `empty_text_content`: processed but no text extracted (likely scan without OCR-friendly output).
  - Download/export failures: re-run after addressing service outage.
- Reprocess by deleting `processed_at` or requeueing via manual insert.

When a manifest (for example `manifests/manifest.jsonl` or `manifest.csv`) is updated, the worker
parses each entry and upserts `gdrive_file_metadata`. Entries must include `file_id` and optionally
`allowlisted_domain`. Files marked with `allowlisted_domain=false` are skipped during ingestion and
logged for reviewer follow-up.

## Quarantine & Manifests

- Files outside allowlisted domains or missing metadata should be flagged and routed to the
  quarantine workflow (future enhancement).
- Manifests (`manifest.jsonl` or `.csv`) can provide metadata overrides (jurisdiction, source type,
  publisher, consolidation status). Ensure the ingestion worker reads manifests before chunking.

## On-Demand Re-index

- For a specific file, insert an `UPDATE` entry into `gdrive_change_queue` (or re-upload in Drive).
- Run `/api/gdrive/process-changes` with `limit=1` to refresh.

## Incident Response

- Revoke compromised service account keys, generate new JSON, update `GDRIVE_SERVICE_ACCOUNT_KEY`.
- Remove expired watch channels and re-run `/api/gdrive/install` (future endpoint).
- Run `/api/gdrive/backfill` without `sourceId` to rebuild `gdrive_documents` after recovery.

## Monitoring

- Key telemetry events: `gdrive.queue_processed`, `gdrive.queue_skipped`, `gdrive.queue_failed`.
- Metrics to watch:
  - Queue depth (`SELECT count(*) FROM gdrive_change_queue WHERE processed_at IS NULL`).
  - Connector freshness (`last_sync_at`, `watch_expires_at`).
  - Document counts per connector (`SELECT count(*) FROM gdrive_documents WHERE connector_id=...`).
- REST status endpoint: `GET /v1/knowledge/drive/status?orgSlug=<slug>` returns config, queue counts,
  blocked metadata entries, and recent failures for dashboards.

## Known Limitations

- OCR fallback uses Tesseract; large scans may exceed CPU quotas (limit concurrency to 3).
- Google Docs export currently targets PDF/CSV; adjust mapping if other formats needed.
- No automatic manifest ingestion yet; manual enforcement required until Phase P1.
