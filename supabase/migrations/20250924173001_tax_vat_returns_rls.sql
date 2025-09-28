-- RLS for VAT filings

ALTER TABLE public.vat_filings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vat_filings_rw ON public.vat_filings;
CREATE POLICY vat_filings_rw ON public.vat_filings
  FOR ALL
  USING (app.is_member_of(org_id, 'staff'))
  WITH CHECK (app.is_member_of(org_id, 'staff'));
