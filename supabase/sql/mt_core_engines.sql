-- Malta core engine schemas covering CIT, NID, ATAD ILR, and fiscal unity workflows
-- Each table mirrors the workflow steps surfaced in the web experience and
-- enforces access with the shared `is_member_of` / `has_min_role` helpers.

-- Corporate income tax computations
CREATE TABLE IF NOT EXISTS public.mt_cit_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  revenue NUMERIC(14,2) NOT NULL,
  deductions NUMERIC(14,2) NOT NULL,
  carry_forward_losses NUMERIC(14,2) DEFAULT 0,
  adjustments NUMERIC(14,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) NOT NULL,
  taxable_income NUMERIC(14,2) NOT NULL,
  tax_due NUMERIC(14,2) NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REVIEW', 'REFUSED')),
  reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  prepared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mt_cit_calculations_org_idx ON public.mt_cit_calculations(org_id);

ALTER TABLE public.mt_cit_calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_cit_calculations_select" ON public.mt_cit_calculations
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "mt_cit_calculations_insert" ON public.mt_cit_calculations
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
CREATE POLICY "mt_cit_calculations_update" ON public.mt_cit_calculations
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'));
CREATE POLICY "mt_cit_calculations_delete" ON public.mt_cit_calculations
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

-- Participation exemption / NID portfolio tracking
CREATE TABLE IF NOT EXISTS public.mt_nid_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  equity_base NUMERIC(14,2) NOT NULL,
  risk_free_rate NUMERIC(6,4) NOT NULL,
  risk_premium NUMERIC(6,4) DEFAULT 0,
  statutory_cap NUMERIC(14,2) NOT NULL,
  computed_deduction NUMERIC(14,2) NOT NULL,
  capped_deduction NUMERIC(14,2) NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REVIEW', 'REFUSED')),
  reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  prepared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mt_nid_positions_org_idx ON public.mt_nid_positions(org_id);

ALTER TABLE public.mt_nid_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_nid_positions_select" ON public.mt_nid_positions
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "mt_nid_positions_insert" ON public.mt_nid_positions
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
CREATE POLICY "mt_nid_positions_update" ON public.mt_nid_positions
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'));
CREATE POLICY "mt_nid_positions_delete" ON public.mt_nid_positions
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

-- ATAD interest limitation testing
CREATE TABLE IF NOT EXISTS public.mt_atad_ilr_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  ebitda NUMERIC(14,2) NOT NULL,
  exceeding_borrowing_costs NUMERIC(14,2) NOT NULL,
  safe_harbour_allowance NUMERIC(14,2) DEFAULT 0,
  interest_barrier NUMERIC(14,2) NOT NULL,
  disallowed_interest NUMERIC(14,2) NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REVIEW', 'REFUSED')),
  reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  prepared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mt_atad_ilr_evaluations_org_idx ON public.mt_atad_ilr_evaluations(org_id);

ALTER TABLE public.mt_atad_ilr_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_atad_ilr_evaluations_select" ON public.mt_atad_ilr_evaluations
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "mt_atad_ilr_evaluations_insert" ON public.mt_atad_ilr_evaluations
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
CREATE POLICY "mt_atad_ilr_evaluations_update" ON public.mt_atad_ilr_evaluations
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'));
CREATE POLICY "mt_atad_ilr_evaluations_delete" ON public.mt_atad_ilr_evaluations
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

-- Fiscal unity pooling assessments
CREATE TABLE IF NOT EXISTS public.mt_fiscal_unity_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  parent_profit NUMERIC(14,2) NOT NULL,
  subsidiary_profit NUMERIC(14,2) NOT NULL,
  adjustments NUMERIC(14,2) DEFAULT 0,
  elections NUMERIC(14,2) DEFAULT 0,
  consolidated_profit NUMERIC(14,2) NOT NULL,
  pooling_benefit NUMERIC(14,2) NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REVIEW', 'REFUSED')),
  reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  prepared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mt_fiscal_unity_reviews_org_idx ON public.mt_fiscal_unity_reviews(org_id);

ALTER TABLE public.mt_fiscal_unity_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_fiscal_unity_reviews_select" ON public.mt_fiscal_unity_reviews
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "mt_fiscal_unity_reviews_insert" ON public.mt_fiscal_unity_reviews
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
CREATE POLICY "mt_fiscal_unity_reviews_update" ON public.mt_fiscal_unity_reviews
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'));
CREATE POLICY "mt_fiscal_unity_reviews_delete" ON public.mt_fiscal_unity_reviews
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));
