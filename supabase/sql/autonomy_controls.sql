-- Autonomy controls covering policy packs and telemetry trail capture

-- Policy pack sign-off tracking
CREATE TABLE IF NOT EXISTS public.autonomy_policy_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pack_key TEXT NOT NULL,
  version TEXT NOT NULL,
  reviewer UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED')),
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REVIEW', 'REFUSED')),
  comments TEXT[],
  reviewed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS autonomy_policy_packs_org_idx ON public.autonomy_policy_packs(org_id);

ALTER TABLE public.autonomy_policy_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autonomy_policy_packs_select" ON public.autonomy_policy_packs
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "autonomy_policy_packs_insert" ON public.autonomy_policy_packs
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
CREATE POLICY "autonomy_policy_packs_update" ON public.autonomy_policy_packs
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'));
CREATE POLICY "autonomy_policy_packs_delete" ON public.autonomy_policy_packs
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

-- Telemetry stream storing calculator runs
CREATE TABLE IF NOT EXISTS public.autonomy_telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  scenario TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REVIEW', 'REFUSED')),
  metrics JSONB NOT NULL,
  actor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS autonomy_telemetry_events_org_idx ON public.autonomy_telemetry_events(org_id);

ALTER TABLE public.autonomy_telemetry_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autonomy_telemetry_events_select" ON public.autonomy_telemetry_events
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "autonomy_telemetry_events_insert" ON public.autonomy_telemetry_events
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
CREATE POLICY "autonomy_telemetry_events_update" ON public.autonomy_telemetry_events
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'));
CREATE POLICY "autonomy_telemetry_events_delete" ON public.autonomy_telemetry_events
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));
