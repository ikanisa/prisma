-- Create telemetry_alerts table and RLS policies (centralised alerts)
BEGIN;

CREATE TABLE IF NOT EXISTS public.telemetry_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  message TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_alerts_org_created
  ON public.telemetry_alerts(org_id, created_at DESC);

ALTER TABLE public.telemetry_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY telemetry_alerts_select ON public.telemetry_alerts
  FOR SELECT USING (org_id IS NULL OR public.is_member_of(org_id));

CREATE POLICY telemetry_alerts_insert ON public.telemetry_alerts
  FOR INSERT WITH CHECK (org_id IS NULL OR public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

CREATE POLICY telemetry_alerts_update ON public.telemetry_alerts
  FOR UPDATE USING (org_id IS NULL OR public.has_min_role(org_id, 'MANAGER'::public.role_level))
  WITH CHECK (org_id IS NULL OR public.has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY telemetry_alerts_delete ON public.telemetry_alerts
  FOR DELETE USING (public.has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level));

COMMENT ON TABLE public.telemetry_alerts IS 'Centralised telemetry alert stream for SLA breaches, rate limits, and cache health.';

COMMIT;
