# Row-Level Security Policies

PostgreSQL row-level security (RLS) is enforced across the project so that
tenants, modules, and governance data remain isolated. All policies rely on the
shared helper functions:

- `public.is_member_of(org_id)` – verifies that the authenticated user belongs
  to the organisation.
- `public.has_min_role(org_id, 'ROLE')` – enforces Manager/Partner/EQR routing
  for approval-sensitive actions.

## Identity & membership

- `public.users` has RLS enabled. Policies `users_select_self` and
  `users_update_self` scope read/write access to the user’s own row. The
  `users_admin_manage` policy allows platform administrators (flagged with
  `is_system_admin`) to perform operational tasks while everyone else remains
  sandboxed to their record.
- `audit_module_records` and `audit_record_approvals` inherit the same pattern:
  members can read module state, while inserts/updates require the appropriate
  minimum role enforced by `has_min_role`.

## Audit workspaces

- Group oversight tables (`group_components`, `group_instructions`,
  `group_reviews`, `group_workpapers`) restrict all CRUD operations to
  organisation members, raising the threshold to Manager+ for destructive
  actions where required.
- Service organisation reliance (`service_organisations`, `soc_reports`,
  `cuec_controls`) and specialist reliance (`specialist_assessments`) follow the
  same template, guaranteeing that only engagement team members can view or
  update reliance conclusions and CUEC exceptions.

## Tax engines

- Pillar Two data (`pillar_two_computations`, `tax_entity_relationships`) uses a
  single read/write policy guarded by `is_member_of`. This allows analytics jobs
  and UI components to upsert results while preventing cross-client leakage.
- Treaty withholding, MAP/APA tracking, and US overlay calculators
  (`treaty_wht_calculations`, `tax_dispute_cases`, `tax_dispute_events`,
  `us_tax_overlay_calculations`) expose combined read/write policies limited to
  organisation members. Manager-level approvals are enforced higher in the
  workflow to mirror the governance packs.

## Telemetry & governance instrumentation

- Telemetry tables (`telemetry_service_levels`, `telemetry_coverage_metrics`,
  `telemetry_refusal_events`) allow read access to organisation members and to
  firmwide rows with `org_id IS NULL`. Inserts/updates require membership; hard
  deletes additionally demand Manager+ privileges to avoid silent loss of audit
  evidence.

## Testing

`scripts/test_policies.sql` contains pgTAP assertions that RLS is enabled and
that every policy listed above exists. The test plan now covers 80 checks,
including telemetry governance tables, and should be executed against staging
whenever new tables or policies are introduced.
