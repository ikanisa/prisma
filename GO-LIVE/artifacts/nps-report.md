# NPS Instrumentation Evidence

## Automated capture
- Run `curl -X GET "$BASE_URL/api/analytics/nps?orgId=<org-id>"` to export summary.
- Responses stored in `nps_responses` with RLS policies (service-role insert only).

## Checklist
- [ ] In-app prompt displayed after login (`NpsPrompt`).
- [ ] Score + feedback successfully persisted (verify via API response or Supabase console).
- [ ] Advanced Analytics dashboard shows updated NPS metrics.
- [ ] Screenshot of dashboard attached.

## Notes
- Trace ID for latest analytics refresh: ____________________
- Additional insights / drivers:
  - 

