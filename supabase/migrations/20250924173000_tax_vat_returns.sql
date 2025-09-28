-- VAT / OSS return storage (T-2A)

BEGIN;

CREATE TABLE IF NOT EXISTS public.vat_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  taxable_outputs NUMERIC(18,2) NOT NULL,
  output_vat NUMERIC(18,2) NOT NULL,
  input_vat NUMERIC(18,2) NOT NULL,
  net_vat_due NUMERIC(18,2) NOT NULL,
  manual_adjustments NUMERIC(18,2) NOT NULL,
  net_payable_after_adjustments NUMERIC(18,2) NOT NULL,
  adjustment_amount NUMERIC(18,2) NOT NULL,
  payload JSONB NOT NULL,
  filing_type TEXT NOT NULL DEFAULT 'VAT',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vat_filings_org_period
  ON public.vat_filings(org_id, tax_entity_id, period);

CREATE TRIGGER trg_vat_filings_touch
  BEFORE UPDATE ON public.vat_filings
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

COMMIT;
