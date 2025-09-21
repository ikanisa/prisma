# Learning Governance & Approvals

## Roles
- **AI Safety Lead:** Owns refusal logic, approves new exemplars, signs off on prompt updates.
- **QMS Lead:** Ensures learning changes align with ISQM requirements; maintains monitoring checklist.
- **Product Manager:** Coordinates feature rollouts, records change log entries.
- **Security Lead:** Reviews data handling and storage compliance.

## Change Approval Process
1. Draft change proposal (scope, rationale, telemetry impact) and log in `PROMPTS/CHANGELOG.md`.
2. Circulate to AI Safety Lead and QMS Lead for review.
3. Obtain sign-off via recorded meeting minutes or approval ticket (link to Activity log entry).
4. Merge prompt/persona updates only after approvals captured.

## Rollback Procedure
- Maintain previous prompt/persona versions in version control (`lib/agents/prompt_versions.json`).
- If regression detected:
  1. Disable affected feature flag or revert commit.
  2. Redeploy previous prompt/persona artifacts.
  3. Notify stakeholders using `/GOLIVE/comms_templates.md` incident update.
  4. Document incident and remediation in monitoring checklist.

## Audit & Logging
- All prompt changes logged with timestamp, approvers, telemetry snapshot.
- Exemplar additions/removals recorded in `/LEARNING/exemplars/log.md` (to be created).
- Quarterly governance review notes stored in Documents module with checksum.

## References
- `LEARNING/pipeline.md`
- `LEARNING/checklist.md`
- `STANDARDS/QMS/monitoring_checklist.md`
- Traceability matrix rows TM-019, TM-032

