-- EU overlay schemas for VAT/OSS/IOSS, DAC6, and Pillar Two calculations

-- VAT/OSS/IOSS period preparation entries
CREATE TABLE IF NOT EXISTS public.eu_vat_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  scheme TEXT NOT NULL,
  sales NUMERIC(14,2) NOT NULL,
  purchases NUMERIC(14,2) NOT NULL,
  output_vat NUMERIC(14,2) NOT NULL,
  input_vat NUMERIC(14,2) NOT NULL,
  net_vat NUMERIC(14,2) NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REVIEW', 'REFUSED')),
  reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  prepared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eu_vat_periods_org_idx ON public.eu_vat_periods(org_id);

ALTER TABLE public.eu_vat_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eu_vat_periods_select" ON public.eu_vat_periods
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "eu_vat_periods_insert" ON public.eu_vat_periods
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
CREATE POLICY "eu_vat_periods_update" ON public.eu_vat_periods
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'));
CREATE POLICY "eu_vat_periods_delete" ON public.eu_vat_periods
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

-- DAC6 arrangement scans
CREATE TABLE IF NOT EXISTS public.eu_dac6_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  hallmark_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  cross_border BOOLEAN DEFAULT false,
  main_benefit BOOLEAN DEFAULT false,
  risk_score NUMERIC(6,2) NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REVIEW', 'REFUSED')),
  reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  prepared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eu_dac6_assessments_org_idx ON public.eu_dac6_assessments(org_id);

ALTER TABLE public.eu_dac6_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eu_dac6_assessments_select" ON public.eu_dac6_assessments
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "eu_dac6_assessments_insert" ON public.eu_dac6_assessments
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
CREATE POLICY "eu_dac6_assessments_update" ON public.eu_dac6_assessments
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'));
CREATE POLICY "eu_dac6_assessments_delete" ON public.eu_dac6_assessments
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

-- Pillar Two effective tax rate monitoring
CREATE TABLE IF NOT EXISTS public.eu_pillar_two_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  jurisdiction TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  globe_income NUMERIC(14,2) NOT NULL,
  covered_taxes NUMERIC(14,2) NOT NULL,
  effective_rate NUMERIC(8,4) NOT NULL,
  top_up_tax NUMERIC(14,2) NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REVIEW', 'REFUSED')),
  reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  prepared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eu_pillar_two_monitoring_org_idx ON public.eu_pillar_two_monitoring(org_id);

ALTER TABLE public.eu_pillar_two_monitoring ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eu_pillar_two_monitoring_select" ON public.eu_pillar_two_monitoring
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "eu_pillar_two_monitoring_insert" ON public.eu_pillar_two_monitoring
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
CREATE POLICY "eu_pillar_two_monitoring_update" ON public.eu_pillar_two_monitoring
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'));
CREATE POLICY "eu_pillar_two_monitoring_delete" ON public.eu_pillar_two_monitoring
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));
