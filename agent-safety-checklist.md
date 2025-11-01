# Agent Safety & Governance Checklist

_Last updated: 2025-11-04_

## Policy & Configuration
- [x] Agent registry normalises autonomy defaults and tool bindings before runtime resolution.
- [x] Release-control evaluation blocks autopilot execution when approvals or autonomy gates are unmet.
- [ ] Document autonomy override escalation path and publish in operations handbook.

## Runtime Safeguards
- [x] Autopilot document extraction pipeline enforces provenance tracking and quarantines failed documents.
- [x] Workflow suggestions limited to two high-confidence actions per request to minimise overreach.
- [ ] Capture red-team transcript exercising escalation and refusal flows.

## Audit Trail
- [x] Provenance metadata appended to processed documents with timestamps and job identifiers.
- [ ] Export weekly agent action log sample and attach to `/GO-LIVE/artifacts/agents/`.

## Evidence to Attach
- Configuration snapshot from `server/config_loader.py` (agent registry + autonomy levels).
- Autopilot handler execution log demonstrating quarantine path in `server/autopilot_handlers.py`.
- Release-control check response showing blocked state when approvals missing.
