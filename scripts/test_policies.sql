-- pgTAP tests for RLS policies
BEGIN;
SELECT plan(80);

-- RLS should be enabled on users
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.users'::regclass),
    'RLS enabled on users table'
);

-- users_select_self policy should exist
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'users'
          AND policyname = 'users_select_self'
    ),
    'users_select_self policy exists'
);

-- users_admin_manage policy should exist
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'users'
          AND policyname = 'users_admin_manage'
    ),
    'users_admin_manage policy exists'
);

-- audit_module_records RLS should be enabled
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.audit_module_records'::regclass),
    'RLS enabled on audit_module_records table'
);

-- audit_module_records policies should exist
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_module_records' AND policyname = 'audit_module_records_select'),
    'audit_module_records_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_module_records' AND policyname = 'audit_module_records_insert'),
    'audit_module_records_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_module_records' AND policyname = 'audit_module_records_update'),
    'audit_module_records_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_module_records' AND policyname = 'audit_module_records_delete'),
    'audit_module_records_delete policy exists'
);

-- audit_record_approvals RLS should be enabled
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.audit_record_approvals'::regclass),
    'RLS enabled on audit_record_approvals table'
);

-- audit_record_approvals policies should exist
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_record_approvals' AND policyname = 'audit_record_approvals_select'),
    'audit_record_approvals_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_record_approvals' AND policyname = 'audit_record_approvals_insert'),
    'audit_record_approvals_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_record_approvals' AND policyname = 'audit_record_approvals_update'),
    'audit_record_approvals_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_record_approvals' AND policyname = 'audit_record_approvals_delete'),
    'audit_record_approvals_delete policy exists'
);

-- group_components RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.group_components'::regclass),
    'RLS enabled on group_components table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_components' AND policyname = 'group_components_select'),
    'group_components_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_components' AND policyname = 'group_components_insert'),
    'group_components_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_components' AND policyname = 'group_components_update'),
    'group_components_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_components' AND policyname = 'group_components_delete'),
    'group_components_delete policy exists'
);

-- group_instructions RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.group_instructions'::regclass),
    'RLS enabled on group_instructions table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_instructions' AND policyname = 'group_instructions_select'),
    'group_instructions_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_instructions' AND policyname = 'group_instructions_insert'),
    'group_instructions_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_instructions' AND policyname = 'group_instructions_update'),
    'group_instructions_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_instructions' AND policyname = 'group_instructions_delete'),
    'group_instructions_delete policy exists'
);

-- group_reviews RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.group_reviews'::regclass),
    'RLS enabled on group_reviews table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_reviews' AND policyname = 'group_reviews_select'),
    'group_reviews_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_reviews' AND policyname = 'group_reviews_insert'),
    'group_reviews_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_reviews' AND policyname = 'group_reviews_update'),
    'group_reviews_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_reviews' AND policyname = 'group_reviews_delete'),
    'group_reviews_delete policy exists'
);

-- group_workpapers RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.group_workpapers'::regclass),
    'RLS enabled on group_workpapers table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_workpapers' AND policyname = 'group_workpapers_select'),
    'group_workpapers_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_workpapers' AND policyname = 'group_workpapers_insert'),
    'group_workpapers_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_workpapers' AND policyname = 'group_workpapers_update'),
    'group_workpapers_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_workpapers' AND policyname = 'group_workpapers_delete'),
    'group_workpapers_delete policy exists'
);

-- service_organisations RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.service_organisations'::regclass),
    'RLS enabled on service_organisations table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_organisations' AND policyname = 'service_organisations_select'),
    'service_organisations_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_organisations' AND policyname = 'service_organisations_insert'),
    'service_organisations_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_organisations' AND policyname = 'service_organisations_update'),
    'service_organisations_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'service_organisations' AND policyname = 'service_organisations_delete'),
    'service_organisations_delete policy exists'
);

-- soc_reports RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.soc_reports'::regclass),
    'RLS enabled on soc_reports table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'soc_reports' AND policyname = 'soc_reports_select'),
    'soc_reports_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'soc_reports' AND policyname = 'soc_reports_insert'),
    'soc_reports_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'soc_reports' AND policyname = 'soc_reports_update'),
    'soc_reports_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'soc_reports' AND policyname = 'soc_reports_delete'),
    'soc_reports_delete policy exists'
);

-- cuec_controls RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.cuec_controls'::regclass),
    'RLS enabled on cuec_controls table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cuec_controls' AND policyname = 'cuec_controls_select'),
    'cuec_controls_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cuec_controls' AND policyname = 'cuec_controls_insert'),
    'cuec_controls_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cuec_controls' AND policyname = 'cuec_controls_update'),
    'cuec_controls_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cuec_controls' AND policyname = 'cuec_controls_delete'),
    'cuec_controls_delete policy exists'
);

-- specialist_assessments RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.specialist_assessments'::regclass),
    'RLS enabled on specialist_assessments table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'specialist_assessments' AND policyname = 'specialist_assessments_select'
    ),
    'specialist_assessments_select policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'specialist_assessments' AND policyname = 'specialist_assessments_insert'
    ),
    'specialist_assessments_insert policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'specialist_assessments' AND policyname = 'specialist_assessments_update'
    ),
    'specialist_assessments_update policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'specialist_assessments' AND policyname = 'specialist_assessments_delete'
    ),
    'specialist_assessments_delete policy exists'
);

-- tax_entity_relationships RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.tax_entity_relationships'::regclass),
    'RLS enabled on tax_entity_relationships table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tax_entity_relationships' AND policyname = 'tax_entity_relationships_rw'
    ),
    'tax_entity_relationships_rw policy exists'
);

-- pillar_two_computations RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.pillar_two_computations'::regclass),
    'RLS enabled on pillar_two_computations table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pillar_two_computations' AND policyname = 'pillar_two_computations_rw'
    ),
    'pillar_two_computations_rw policy exists'
);

-- treaty_wht_calculations RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.treaty_wht_calculations'::regclass),
    'RLS enabled on treaty_wht_calculations table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'treaty_wht_calculations' AND policyname = 'treaty_wht_calculations_rw'
    ),
    'treaty_wht_calculations_rw policy exists'
);

-- tax_dispute_cases RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.tax_dispute_cases'::regclass),
    'RLS enabled on tax_dispute_cases table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tax_dispute_cases' AND policyname = 'tax_dispute_cases_rw'
    ),
    'tax_dispute_cases_rw policy exists'
);

-- tax_dispute_events RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.tax_dispute_events'::regclass),
    'RLS enabled on tax_dispute_events table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tax_dispute_events' AND policyname = 'tax_dispute_events_rw'
    ),
    'tax_dispute_events_rw policy exists'
);

-- us_tax_overlay_calculations RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.us_tax_overlay_calculations'::regclass),
    'RLS enabled on us_tax_overlay_calculations table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'us_tax_overlay_calculations' AND policyname = 'us_tax_overlay_calculations_rw'
    ),
    'us_tax_overlay_calculations_rw policy exists'
);

-- telemetry_service_levels RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.telemetry_service_levels'::regclass),
    'RLS enabled on telemetry_service_levels table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'telemetry_service_levels' AND policyname = 'telemetry_service_levels_select'
    ),
    'telemetry_service_levels_select policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'telemetry_service_levels' AND policyname = 'telemetry_service_levels_upsert'
    ),
    'telemetry_service_levels_upsert policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'telemetry_service_levels' AND policyname = 'telemetry_service_levels_update'
    ),
    'telemetry_service_levels_update policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'telemetry_service_levels' AND policyname = 'telemetry_service_levels_delete'
    ),
    'telemetry_service_levels_delete policy exists'
);

-- telemetry_coverage_metrics RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.telemetry_coverage_metrics'::regclass),
    'RLS enabled on telemetry_coverage_metrics table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'telemetry_coverage_metrics' AND policyname = 'telemetry_coverage_select'
    ),
    'telemetry_coverage_select policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'telemetry_coverage_metrics' AND policyname = 'telemetry_coverage_upsert'
    ),
    'telemetry_coverage_upsert policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'telemetry_coverage_metrics' AND policyname = 'telemetry_coverage_update'
    ),
    'telemetry_coverage_update policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'telemetry_coverage_metrics' AND policyname = 'telemetry_coverage_delete'
    ),
    'telemetry_coverage_delete policy exists'
);

-- telemetry_refusal_events RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.telemetry_refusal_events'::regclass),
    'RLS enabled on telemetry_refusal_events table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'telemetry_refusal_events' AND policyname = 'telemetry_refusal_select'
    ),
    'telemetry_refusal_select policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'telemetry_refusal_events' AND policyname = 'telemetry_refusal_upsert'
    ),
    'telemetry_refusal_upsert policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'telemetry_refusal_events' AND policyname = 'telemetry_refusal_update'
    ),
    'telemetry_refusal_update policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'telemetry_refusal_events' AND policyname = 'telemetry_refusal_delete'
    ),
    'telemetry_refusal_delete policy exists'
);

SELECT * FROM finish();
ROLLBACK;
