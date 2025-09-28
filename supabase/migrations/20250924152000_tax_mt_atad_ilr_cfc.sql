-- ATAD ILR & CFC schema (T-1C)

BEGIN;

CREATE TABLE IF NOT EXISTS public.interest_limitation_computations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  exceeding_borrowing_costs NUMERIC(18,2) NOT NULL,
  tax_ebitda NUMERIC(18,2) NOT NULL,
  standalone_allowance NUMERIC(18,2) DEFAULT 0,
  safe_harbour_amount NUMERIC(18,2) DEFAULT 3000000,
  carryforward_interest NUMERIC(18,2) DEFAULT 0,
  carryforward_capacity NUMERIC(18,2) DEFAULT 0,
  disallowed_carryforward NUMERIC(18,2) DEFAULT 0,
  allowed_interest NUMERIC(18,2) NOT NULL,
  disallowed_interest NUMERIC(18,2) NOT NULL,
  updated_carryforward_interest NUMERIC(18,2) NOT NULL,
  updated_carryforward_capacity NUMERIC(18,2) NOT NULL,
  adjustment_amount NUMERIC(18,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interest_limitation_org_period
  ON public.interest_limitation_computations(org_id, tax_entity_id, period);

CREATE TRIGGER trg_interest_limitation_touch
  BEFORE UPDATE ON public.interest_limitation_computations
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.cfc_inclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  cfc_entity_name TEXT,
  cfc_profit NUMERIC(18,2) NOT NULL,
  foreign_tax_paid NUMERIC(18,2) NOT NULL,
  foreign_rate NUMERIC(10,6) DEFAULT 0,
  domestic_rate NUMERIC(10,6) DEFAULT 0.35,
  participation_percentage NUMERIC(5,4) DEFAULT 1,
  profit_attribution_ratio NUMERIC(5,4) DEFAULT 1,
  inclusion_amount NUMERIC(18,2) NOT NULL,
  tax_credit_eligible NUMERIC(18,2) NOT NULL,
  adjustment_amount NUMERIC(18,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cfc_inclusions_org_period
  ON public.cfc_inclusions(org_id, tax_entity_id, period);

CREATE TRIGGER trg_cfc_inclusions_touch
  BEFORE UPDATE ON public.cfc_inclusions
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

COMMIT;
