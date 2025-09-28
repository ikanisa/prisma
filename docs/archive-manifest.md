# Engagement Archive Manifest (Phase T‑4B)

## Purpose
Maintain a canonical snapshot of key engagement artefacts (acceptance, TCWG pack, module statuses) with a hashed manifest to satisfy ISA 230 documentation and ISQM 1 monitoring requirements.

## Data flow
- `engagement_archives` holds one row per engagement with a JSON manifest and `sha256` checksum.
- `/functions/v1/archive-sync` aggregates acceptance, TCWG, and audit module status data, writes the manifest, and logs `ARCHIVE_MANIFEST_UPDATED` in `activity_log`.
- The manifest structure:

```json
{
  "engagementId": "...",
  "generatedAt": "ISO timestamp",
  "acceptance": { "status": "APPROVED", "decision": "ACCEPT", ... },
  "tcwg": { "status": "SENT", "zipDocumentId": "..." },
  "modules": [
    { "moduleCode": "KAM", "status": "APPROVED", "approvalState": "LOCKED" },
    ...
  ]
}
```

## Usage
1. Trigger the sync after critical workflow steps (acceptance approvals, TCWG issuance, report release):

```bash
curl -X POST \
  https://<YOUR_SUPABASE_PROJECT>.supabase.co/functions/v1/archive-sync \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"orgSlug":"acme-audit","engagementId":"00000000-0000-0000-0000-000000000000"}'
```

2. The function upserts the manifest and returns the updated JSON and checksum.
3. Use the returned `sha256` in downstream evidence packs or QC checklists.

## Verification
- Query `select manifest, sha256 from engagement_archives where engagement_id = ...;`
- Compare `sha256` against independent JSON digest when exporting audit artefacts.
- Review `activity_log` for `ARCHIVE_MANIFEST_UPDATED` entries (module `ARCHIVE`).

## Next steps
- Extend the manifest builder with additional modules (e.g., report release bundle) as workflows mature.
- Schedule periodic syncs or trigger via automation upon key ActivityLog events.
