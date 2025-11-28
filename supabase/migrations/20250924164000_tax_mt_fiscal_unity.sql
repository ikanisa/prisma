-- Fiscal unity computations (T-1D)

BEGIN;

CREATE TABLE IF NOT EXISTS public.fiscal_unity_computations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  members JSONB NOT NULL,
  total_chargeable_income NUMERIC(18,2) NOT NULL,
  total_adjustments NUMERIC(18,2) NOT NULL,
  tax_rate NUMERIC(10,6) NOT NULL,
  consolidated_cit NUMERIC(18,2) NOT NULL,
  total_tax_credits NUMERIC(18,2) NOT NULL,
  net_tax_payable NUMERIC(18,2) NOT NULL,
  closing_tax_account NUMERIC(18,2) NOT NULL,
  adjustment_amount NUMERIC(18,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fiscal_unity_computations IS 'Malta fiscal unity computations with review-ready evidence trail.';

CREATE INDEX IF NOT EXISTS idx_fiscal_unity_org_period
  ON public.fiscal_unity_computations(org_id, parent_tax_entity_id, period);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_fiscal_unity_touch'
      AND tgrelid = 'public.fiscal_unity_computations'::regclass
  ) THEN
    CREATE TRIGGER trg_fiscal_unity_touch
      BEFORE UPDATE ON public.fiscal_unity_computations
      FOR EACH ROW
      EXECUTE FUNCTION app.touch_updated_at();
  END IF;
END;
$$;

COMMIT;
