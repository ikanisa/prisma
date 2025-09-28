-- International tooling schemas for treaty resolver runs and US overlay analytics

-- Treaty resolver tracking of escalations
CREATE TABLE IF NOT EXISTS public.intl_treaty_resolver_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  case_reference TEXT NOT NULL,
  residence_country TEXT NOT NULL,
  source_country TEXT NOT NULL,
  issue TEXT NOT NULL,
  recommended_route TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REVIEW', 'REFUSED')),
  reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  prepared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intl_treaty_resolver_runs_org_idx ON public.intl_treaty_resolver_runs(org_id);

ALTER TABLE public.intl_treaty_resolver_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intl_treaty_resolver_runs_select" ON public.intl_treaty_resolver_runs
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "intl_treaty_resolver_runs_insert" ON public.intl_treaty_resolver_runs
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
CREATE POLICY "intl_treaty_resolver_runs_update" ON public.intl_treaty_resolver_runs
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'));
CREATE POLICY "intl_treaty_resolver_runs_delete" ON public.intl_treaty_resolver_runs
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

-- US overlay (e.g. GILTI) analytics
CREATE TABLE IF NOT EXISTS public.us_overlay_gilti_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  tested_income NUMERIC(14,2) NOT NULL,
  qbai NUMERIC(14,2) NOT NULL,
  interest_expense NUMERIC(14,2) DEFAULT 0,
  gilti_base NUMERIC(14,2) NOT NULL,
  gilti_tax NUMERIC(14,2) NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REVIEW', 'REFUSED')),
  reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  prepared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS us_overlay_gilti_runs_org_idx ON public.us_overlay_gilti_runs(org_id);

ALTER TABLE public.us_overlay_gilti_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "us_overlay_gilti_runs_select" ON public.us_overlay_gilti_runs
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "us_overlay_gilti_runs_insert" ON public.us_overlay_gilti_runs
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
CREATE POLICY "us_overlay_gilti_runs_update" ON public.us_overlay_gilti_runs
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'));
CREATE POLICY "us_overlay_gilti_runs_delete" ON public.us_overlay_gilti_runs
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));
