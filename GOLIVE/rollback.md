# Rollback Plan

## Trigger Conditions
- Critical incident (data exposure, regulatory breach, sustained outage).
- Key SLI breach lasting > 1 hour with no mitigation.
- Safety failure (red-team scenario succeeding in production).

## Immediate Actions
1. **Disable high-risk features**
   - Toggle feature flags: `FEATURE_REQUIRE_MANAGER_APPROVAL`, `FEATURE_QMS_MONITORING_ENABLED`, calculator overrides.
   - Revert to safe agent persona via deployment pipeline.
2. **Scale down services if needed**
   - Reduce agent worker replicas to zero to halt automation.
   - Keep API gateway up for status communications.
3. **Restore from backup**
   - Identify last known good archive (Document manifest with SHA-256).
   - Restore Supabase snapshot or document store as required.
4. **Communicate**
   - Issue incident update using `/GOLIVE/comms_templates.md` (incident form).
   - Notify leadership and affected customers.

## Verification
- After rollback, re-run smoke tests (red-team quick checks, key acceptance steps) to confirm stability.
- Update monitoring dashboards to confirm approvals and telemetry normalized.

## Documentation
- Log incident in `STANDARDS/QMS/monitoring_checklist.md` with root cause analysis.
- Update traceability matrix with reference to incident evidence if necessary.

