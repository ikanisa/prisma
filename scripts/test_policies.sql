-- pgTAP tests for RLS policies
BEGIN;
SELECT plan(102);

-- Phase A: ensure autonomy metadata columns exist
SELECT ok(
    EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'memberships'
          AND column_name = 'autonomy_floor'
    ),
    'memberships.autonomy_floor column exists'
);

SELECT ok(
    EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'memberships'
          AND column_name = 'autonomy_ceiling'
    ),
    'memberships.autonomy_ceiling column exists'
);

SELECT ok(
    EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'memberships_autonomy_floor_ceiling_check'
          AND conrelid = 'public.memberships'::regclass
    ),
    'memberships autonomy floor/ceiling constraint exists'
);

SELECT ok(
    EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'approval_queue'
          AND column_name = 'autonomy_gate'
    ),
    'approval_queue.autonomy_gate column exists'
);

SELECT ok(
    EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'approval_queue'
          AND column_name = 'manifest_required'
    ),
    'approval_queue.manifest_required column exists'
);

SELECT ok(
    EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'company_profile_drafts'
          AND column_name = 'provenance'
    ),
    'company_profile_drafts.provenance column exists'
);

-- Autopilot job orchestration tables
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.jobs'::regclass),
    'RLS enabled on jobs table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'jobs'
          AND policyname = 'jobs_select'
    ),
    'jobs_select policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'jobs'
          AND policyname = 'jobs_insert'
    ),
    'jobs_insert policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'jobs'
          AND policyname = 'jobs_update'
    ),
    'jobs_update policy exists'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.job_schedules'::regclass),
    'RLS enabled on job_schedules table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'job_schedules'
          AND policyname = 'job_schedules_select'
    ),
    'job_schedules_select policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'job_schedules'
          AND policyname = 'job_schedules_insert'
    ),
    'job_schedules_insert policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'job_schedules'
          AND policyname = 'job_schedules_update'
    ),
    'job_schedules_update policy exists'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.mfa_challenges'::regclass),
    'RLS enabled on mfa_challenges table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'mfa_challenges'
          AND policyname = 'mfa_challenges_select'
    ),
    'mfa_challenges_select policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'mfa_challenges'
          AND policyname = 'mfa_challenges_insert'
    ),
    'mfa_challenges_insert policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'mfa_challenges'
          AND policyname = 'mfa_challenges_update'
    ),
    'mfa_challenges_update policy exists'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.telemetry_alerts'::regclass),
    'RLS enabled on telemetry_alerts table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'telemetry_alerts'
          AND policyname = 'telemetry_alerts_select'
    ),
    'telemetry_alerts_select policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'telemetry_alerts'
          AND policyname = 'telemetry_alerts_insert'
    ),
    'telemetry_alerts_insert policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'telemetry_alerts'
          AND policyname = 'telemetry_alerts_update'
    ),
    'telemetry_alerts_update policy exists'
);

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

-- controls & deficiencies RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.controls'::regclass),
    'RLS enabled on controls table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'controls' AND policyname = 'controls_select'),
    'controls_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'controls' AND policyname = 'controls_insert'),
    'controls_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'controls' AND policyname = 'controls_update'),
    'controls_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'controls' AND policyname = 'controls_delete'),
    'controls_delete policy exists'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.control_walkthroughs'::regclass),
    'RLS enabled on control_walkthroughs table'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'control_walkthroughs' AND policyname = 'control_walkthroughs_select'
    ),
    'control_walkthroughs_select policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'control_walkthroughs' AND policyname = 'control_walkthroughs_insert'
    ),
    'control_walkthroughs_insert policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'control_walkthroughs' AND policyname = 'control_walkthroughs_update'
    ),
    'control_walkthroughs_update policy exists'
);
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'control_walkthroughs' AND policyname = 'control_walkthroughs_delete'
    ),
    'control_walkthroughs_delete policy exists'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.control_tests'::regclass),
    'RLS enabled on control_tests table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'control_tests' AND policyname = 'control_tests_select'),
    'control_tests_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'control_tests' AND policyname = 'control_tests_insert'),
    'control_tests_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'control_tests' AND policyname = 'control_tests_update'),
    'control_tests_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'control_tests' AND policyname = 'control_tests_delete'),
    'control_tests_delete policy exists'
);

-- agent workspace tables
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_sessions'::regclass),
    'RLS enabled on agent_sessions table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_sessions' AND policyname = 'sessions_rw'),
    'sessions_rw policy exists on agent_sessions'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_logs'::regclass),
    'RLS enabled on agent_logs table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_logs' AND policyname = 'logs_r'),
    'logs_r policy exists on agent_logs'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_runs'::regclass),
    'RLS enabled on agent_runs table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_runs' AND policyname = 'agent_runs_select'),
    'agent_runs_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_runs' AND policyname = 'agent_runs_insert'),
    'agent_runs_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_runs' AND policyname = 'agent_runs_update'),
    'agent_runs_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_runs' AND policyname = 'agent_runs_delete'),
    'agent_runs_delete policy exists'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_actions'::regclass),
    'RLS enabled on agent_actions table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_actions' AND policyname = 'agent_actions_select'),
    'agent_actions_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_actions' AND policyname = 'agent_actions_insert'),
    'agent_actions_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_actions' AND policyname = 'agent_actions_update'),
    'agent_actions_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_actions' AND policyname = 'agent_actions_delete'),
    'agent_actions_delete policy exists'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_traces'::regclass),
    'RLS enabled on agent_traces table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_traces' AND policyname = 'agent_traces_select'),
    'agent_traces_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_traces' AND policyname = 'agent_traces_insert'),
    'agent_traces_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_traces' AND policyname = 'agent_traces_delete'),
    'agent_traces_delete policy exists'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_policy_versions'::regclass),
    'RLS enabled on agent_policy_versions table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_policy_versions' AND policyname = 'agent_policy_versions_read'),
    'agent_policy_versions_read policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_policy_versions' AND policyname = 'agent_policy_versions_write'),
    'agent_policy_versions_write policy exists'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_feedback'::regclass),
    'RLS enabled on agent_feedback table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_feedback' AND policyname = 'agent_feedback_org_read'),
    'agent_feedback_org_read policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_feedback' AND policyname = 'agent_feedback_org_write'),
    'agent_feedback_org_write policy exists'
);

-- acceptance module
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.acceptance_decisions'::regclass),
    'RLS enabled on acceptance_decisions table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'acceptance_decisions' AND policyname = 'acceptance_select'),
    'acceptance_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'acceptance_decisions' AND policyname = 'acceptance_insert'),
    'acceptance_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'acceptance_decisions' AND policyname = 'acceptance_update'),
    'acceptance_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'acceptance_decisions' AND policyname = 'acceptance_delete'),
    'acceptance_delete policy exists'
);

-- ensure PUBLIC role lacks write privileges on the public schema
SELECT ok(
    NOT EXISTS (
        SELECT 1
        FROM information_schema.role_table_grants
        WHERE grantee = 'PUBLIC'
          AND table_schema = 'public'
          AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
    ),
    'PUBLIC role does not have write privileges on public tables'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.itgc_groups'::regclass),
    'RLS enabled on itgc_groups table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'itgc_groups' AND policyname = 'itgc_groups_select'),
    'itgc_groups_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'itgc_groups' AND policyname = 'itgc_groups_insert'),
    'itgc_groups_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'itgc_groups' AND policyname = 'itgc_groups_update'),
    'itgc_groups_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'itgc_groups' AND policyname = 'itgc_groups_delete'),
    'itgc_groups_delete policy exists'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.deficiencies'::regclass),
    'RLS enabled on deficiencies table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deficiencies' AND policyname = 'deficiencies_select'),
    'deficiencies_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deficiencies' AND policyname = 'deficiencies_insert'),
    'deficiencies_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deficiencies' AND policyname = 'deficiencies_update'),
    'deficiencies_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deficiencies' AND policyname = 'deficiencies_delete'),
    'deficiencies_delete policy exists'
);

-- ADA runs and exceptions RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.ada_runs'::regclass),
    'RLS enabled on ada_runs table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ada_runs' AND policyname = 'ada_runs_select'),
    'ada_runs_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ada_runs' AND policyname = 'ada_runs_insert'),
    'ada_runs_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ada_runs' AND policyname = 'ada_runs_update'),
    'ada_runs_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ada_runs' AND policyname = 'ada_runs_delete'),
    'ada_runs_delete policy exists'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.ada_exceptions'::regclass),
    'RLS enabled on ada_exceptions table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ada_exceptions' AND policyname = 'ada_exceptions_select'),
    'ada_exceptions_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ada_exceptions' AND policyname = 'ada_exceptions_insert'),
    'ada_exceptions_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ada_exceptions' AND policyname = 'ada_exceptions_update'),
    'ada_exceptions_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ada_exceptions' AND policyname = 'ada_exceptions_delete'),
    'ada_exceptions_delete policy exists'
);

-- Reconciliations RLS
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.reconciliations'::regclass),
    'RLS enabled on reconciliations table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reconciliations' AND policyname = 'reconciliations_select'),
    'reconciliations_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reconciliations' AND policyname = 'reconciliations_insert'),
    'reconciliations_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reconciliations' AND policyname = 'reconciliations_update'),
    'reconciliations_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reconciliations' AND policyname = 'reconciliations_delete'),
    'reconciliations_delete policy exists'
);

SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.reconciliation_items'::regclass),
    'RLS enabled on reconciliation_items table'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reconciliation_items' AND policyname = 'reconciliation_items_select'),
    'reconciliation_items_select policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reconciliation_items' AND policyname = 'reconciliation_items_insert'),
    'reconciliation_items_insert policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reconciliation_items' AND policyname = 'reconciliation_items_update'),
    'reconciliation_items_update policy exists'
);
SELECT ok(
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reconciliation_items' AND policyname = 'reconciliation_items_delete'),
    'reconciliation_items_delete policy exists'
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
