-- Create autonomy_telemetry_events table and RLS policies (calculator telemetry)
BEGIN;

CREATE TABLE IF NOT EXISTS public.autonomy_telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  scenario TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REVIEW', 'REFUSED')),
  metrics JSONB NOT NULL,
  actor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS autonomy_telemetry_events_org_idx
  ON public.autonomy_telemetry_events(org_id, occurred_at DESC);

ALTER TABLE public.autonomy_telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY autonomy_telemetry_events_select ON public.autonomy_telemetry_events
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY autonomy_telemetry_events_insert ON public.autonomy_telemetry_events
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

CREATE POLICY autonomy_telemetry_events_update ON public.autonomy_telemetry_events
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level))
  WITH CHECK (public.has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY autonomy_telemetry_events_delete ON public.autonomy_telemetry_events
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

COMMENT ON TABLE public.autonomy_telemetry_events IS 'Decision trail for autonomy calculators and embedding workflows.';

COMMIT;
