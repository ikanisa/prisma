-- RLS policies for telemetry schema (GOV-CORE)
BEGIN;

ALTER TABLE public.telemetry_service_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_coverage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_refusal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY telemetry_service_levels_select ON public.telemetry_service_levels
  FOR SELECT USING (
    org_id IS NULL OR public.is_member_of(org_id)
  );

CREATE POLICY telemetry_service_levels_upsert ON public.telemetry_service_levels
  FOR INSERT WITH CHECK (org_id IS NULL OR public.is_member_of(org_id));

CREATE POLICY telemetry_service_levels_update ON public.telemetry_service_levels
  FOR UPDATE USING (org_id IS NULL OR public.is_member_of(org_id));

CREATE POLICY telemetry_service_levels_delete ON public.telemetry_service_levels
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'));

CREATE POLICY telemetry_coverage_select ON public.telemetry_coverage_metrics
  FOR SELECT USING (org_id IS NULL OR public.is_member_of(org_id));

CREATE POLICY telemetry_coverage_upsert ON public.telemetry_coverage_metrics
  FOR INSERT WITH CHECK (org_id IS NULL OR public.is_member_of(org_id));

CREATE POLICY telemetry_coverage_update ON public.telemetry_coverage_metrics
  FOR UPDATE USING (org_id IS NULL OR public.is_member_of(org_id));

CREATE POLICY telemetry_coverage_delete ON public.telemetry_coverage_metrics
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'));

CREATE POLICY telemetry_refusal_select ON public.telemetry_refusal_events
  FOR SELECT USING (org_id IS NULL OR public.is_member_of(org_id));

CREATE POLICY telemetry_refusal_upsert ON public.telemetry_refusal_events
  FOR INSERT WITH CHECK (org_id IS NULL OR public.is_member_of(org_id));

CREATE POLICY telemetry_refusal_update ON public.telemetry_refusal_events
  FOR UPDATE USING (org_id IS NULL OR public.is_member_of(org_id));

CREATE POLICY telemetry_refusal_delete ON public.telemetry_refusal_events
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'));

COMMIT;
