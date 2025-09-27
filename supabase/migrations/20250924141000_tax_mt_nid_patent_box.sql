-- Malta tax calculators (T-1B) schema additions for NID & Patent Box

BEGIN;

CREATE TABLE IF NOT EXISTS public.nid_computations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  equity_base NUMERIC(18,2) NOT NULL,
  risk_free_rate NUMERIC(10,6) DEFAULT 0,
  risk_premium NUMERIC(10,6) DEFAULT 0.05,
  reference_rate NUMERIC(10,6) NOT NULL,
  prior_deduction NUMERIC(18,2) DEFAULT 0,
  chargeable_income_before_nid NUMERIC(18,2),
  cap_ratio NUMERIC(5,4) DEFAULT 0.9,
  gross_deduction NUMERIC(18,2) NOT NULL,
  capped_deduction NUMERIC(18,2) NOT NULL,
  deduction_after_carryforward NUMERIC(18,2) NOT NULL,
  adjustment_amount NUMERIC(18,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nid_computations_org_period
  ON public.nid_computations(org_id, tax_entity_id, period);

CREATE TRIGGER trg_nid_computations_touch
  BEFORE UPDATE ON public.nid_computations
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.patent_box_computations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  qualifying_ip_income NUMERIC(18,2) NOT NULL,
  qualifying_expenditure NUMERIC(18,2) NOT NULL,
  overall_expenditure NUMERIC(18,2) NOT NULL,
  routine_return_rate NUMERIC(10,6) DEFAULT 0.1,
  uplift_cap NUMERIC(10,6) DEFAULT 0.3,
  deduction_rate NUMERIC(10,6) DEFAULT 0.95,
  routine_return NUMERIC(18,2) NOT NULL,
  uplift NUMERIC(18,2) NOT NULL,
  nexus_fraction NUMERIC(10,6) NOT NULL,
  deduction_base NUMERIC(18,2) NOT NULL,
  deduction_amount NUMERIC(18,2) NOT NULL,
  adjustment_amount NUMERIC(18,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patent_box_computations_org_period
  ON public.patent_box_computations(org_id, tax_entity_id, period);

CREATE TRIGGER trg_patent_box_computations_touch
  BEFORE UPDATE ON public.patent_box_computations
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

COMMIT;
