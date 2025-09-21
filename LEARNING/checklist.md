# Learning Loop Checklist

## Weekly
- [ ] Extract prior week traces (excluding regulated tools) and sanitize (hash user IDs).
- [ ] Review approval-tagged traces for exemplar candidates; update `/LEARNING/exemplars/<date>.json`.
- [ ] Update prompt/persona patch notes with any adjustments.
- [ ] Refresh vector index with approved memos only; log index version.
- [ ] Validate telemetry dashboard (groundedness %, refusals) for anomalies; escalate if drift detected.

## Monthly
- [ ] Run staging A/B test comparing new prompt pack vs baseline (record metrics).
- [ ] Present findings to QMS lead; document decisions in monitoring checklist.
- [ ] Update traceability matrix rows (TM-032, TM-019) with new evidence links if changed.

## Quarterly
- [ ] Rotate service keys/secrets for learning infrastructure.
- [ ] Conduct policy review (calculator dominance, approval workflow, data privacy) with stakeholders.
- [ ] Perform rollback drill: revert to prior prompt/persona and ensure recovery docs are current.
- [ ] Archive exemplar set snapshots to cold storage.

## References
- `LEARNING/pipeline.md`
- `LEARNING/governance.md`
- `STANDARDS/QMS/monitoring_checklist.md`

