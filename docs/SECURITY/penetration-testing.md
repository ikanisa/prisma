# Penetration Testing & Threat Drill Playbook

## Purpose
Provide a repeatable approach for assessing prisma-glow-15 against malicious
actors. Covers technical penetration tests (red team / ethical hacking) and
tabletop threat drills to validate response readiness.

## Cadence & Ownership
- **Cadence:** Bi-annually (April & October) or before major releases.
- **Owners:** Security Engineering (lead), Audit Platform Tech Lead (co-owner),
  DevOps for infrastructure components.
- **Change control:** Log every engagement in the security change register and
  attach the final report with mitigation status.

## Pre-Engagement Checklist
1. Define scope and testing window; obtain Partner approval.
2. Confirm staging environment parity (schema, RLS policies, edge functions).
3. Snapshot production telemetry and backups per `docs/backup-restore.md`.
4. Configure log enrichment to flag test traffic (headers `X-Pentest=true`).
5. Establish communication channel (Slack `#sec-drill`) and escalation tree per
   `docs/incident-response.md`.

## Technical Scope
- **Authentication & Authorization**
  - Attempt bypass of Supabase JWT validation on edge functions (`audit-*`,
    `tax-*`).
  - Verify `public.is_member_of`/`has_min_role` RLS safeguards using crafted JWTs.
- **Multi-tenant isolation**
  - Enumerate cross-org access vectors (API query parameters, GraphQL filters,
    direct Supabase queries).
- **Rate limiting & abuse**
  - Stress `/api/controls/test/run`, `/functions/v1/telemetry-sync`, and
    `/functions/v1/error-notify` to confirm throttles and alerts trigger (see
    `docs/telemetry.md`).
- **Supabase Database**
  - Review RLS policies against misconfigured joins, upsert bypass, and
    `is_member_of` edge cases.
- **Supabase Storage & Evidence**
  - Validate signed URL expiry, document checksum enforcement, and bucket
    versioning.
- **Third-party integrations**
  - Confirm OAuth scopes match `docs/SECURITY/oauth-scopes.md`.
  - Attempt misuse of Slack/webhook endpoints.
- **Dependency & Supply-chain**
  - Run `npm audit`, SBOM diff, and check for vulnerable Supabase versions.

## Tabletop Threat Drills
- Run twice yearly covering:
  - Compromised service-role key scenario resulting in data exfiltration.
  - Edge function exploit leading to mass approvals bypass.
  - Ransomware targeting Supabase Storage / evidence archives.
- Use the incident response guide to track decisions, notifications, and
  timelines.

## Tooling
- Dynamic: OWASP ZAP, Burp Suite, Postman with malicious JWTs.
- Static: `npm audit`, `pnpm audit`, Snyk CLI, `gitleaks`, `trivy fs .` for
  container images.
- Infrastructure: Supabase audit logs, Grafana dashboards, pgTAP RLS tests
  (`scripts/test_policies.sql`).

## Reporting & Mitigation
1. Document findings with severity (CVSS or internal scale) and evidence (HTTP
   transcripts, log snippets, SQL reproductions).
2. File remediation issues in the tracker; assign owners and due dates.
3. Update `AUDIT_REPORT.md` risk register with new or remediated items.
4. Confirm fixes by rerunning targeted tests; capture evidence.
5. Share final report with leadership and archive under
   `docs/SECURITY/penetration-reports/<year>-<sprint>.md` (create directory as
   needed).

## Success Criteria
- No unauthorised data access, privilege escalation, or persistent vulnerabilities
  remain open post-mitigation.
- Alerting and logging detect and record hostile activity within the expected
  SLA (see `docs/observability.md`).
- All action items have owners, deadlines, and verification evidence.

## References
- `docs/observability.md`
- `docs/backup-restore.md`
- `docs/telemetry.md`
- `docs/SECURITY/oauth-scopes.md`
- `docs/SECURITY/rls-policies.md`
- `PRODUCTION_READINESS_CHECKLIST.md`
