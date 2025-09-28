-- Telemetry schema for coverage, SLA, and refusal metrics (GOV-CORE)
BEGIN;

CREATE TABLE IF NOT EXISTS public.telemetry_service_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  workflow_event TEXT NOT NULL,
  target_hours INTEGER NOT NULL,
  breaches INTEGER NOT NULL DEFAULT 0,
  last_breach_at TIMESTAMPTZ,
  open_breaches INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ON_TRACK',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_sla_org_module ON public.telemetry_service_levels(org_id, module);

CREATE TABLE IF NOT EXISTS public.telemetry_coverage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  metric TEXT NOT NULL,
  measured_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  population NUMERIC(18,2) NOT NULL DEFAULT 0,
  coverage_ratio NUMERIC(6,3) GENERATED ALWAYS AS (
    CASE
      WHEN population = 0 THEN 0
      ELSE ROUND(measured_value / NULLIF(population, 0), 3)
    END
  ) STORED,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_coverage_org_module ON public.telemetry_coverage_metrics(org_id, module);

CREATE TABLE IF NOT EXISTS public.telemetry_refusal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  event TEXT NOT NULL,
  reason TEXT,
  severity TEXT DEFAULT 'INFO',
  count INTEGER NOT NULL DEFAULT 1,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_refusal_org_module ON public.telemetry_refusal_events(org_id, module);

COMMIT;
