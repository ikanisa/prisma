# Agent Learning Pipeline

## Online Loop (Continuous)
- **Trace retention (no PII):** Persist `agent_traces` payloads excluding raw document text; store references (docIds) only. Obfuscate user emails via hashing.
- **Approval tagging:** When approvals are granted/denied, append metadata (`approvalId`, `decision`, `comment`) to trace records for supervised fine-tuning signal.
- **Weekly compaction:** Every Sunday, run job to aggregate traces by toolKey/status, keeping representative samples (success, refusal, blocked). Store in `learning/weekly_compaction` bucket with manifest.
- **Telemetry sync:** Feed key counters (groundedness %, refusal reasons, latency) into learning dashboard for drift detection.

## Offline Loop (Weekly cadence)
1. **Curate exemplars (non-regulated tasks only):**
   - Filter traces where `toolKey` not in regulated list (VAT filing, CIT submission, period lock).
   - Select high-quality outputs with manager approval; store in `/LEARNING/exemplars/YYYY-MM-DD.json`.
2. **Patch notes:** Document prompt/persona adjustments in `PROMPTS/CHANGELOG.md` summarising motivation and expected behavior.
3. **Vector refresh:** Re-ingest only approved memos and documents into embeddings index; remove prior versions.

## Monthly Activities
- Stage A/B of updated prompt packs in staging org.
- Compare groundedness %, refusal accuracy, latency vs baseline.
- Promote prompt/persona version and update `traceability matrix` row TM-032 references.

## Quarterly Activities
- Rotate API keys/secrets used in learning infrastructure.
- Review policies (calculator dominance, approval workflow) for updates and propagate to prompts.
- Present learning outcomes to governance board; log in monitoring checklist.

## Safeguards
- No PII or client confidential data exported outside secure storage.
- Regulated cases (tax filings, approvals) excluded from training data unless explicit QMS sign-off.
- Maintain rollback snapshots of prompt/persona before each release.

