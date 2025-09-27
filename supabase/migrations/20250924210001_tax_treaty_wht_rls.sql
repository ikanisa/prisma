-- RLS policies for treaty WHT & dispute tracking
BEGIN;

ALTER TABLE public.treaty_wht_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_dispute_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_dispute_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS treaty_wht_calculations_rw ON public.treaty_wht_calculations;
CREATE POLICY treaty_wht_calculations_rw
  ON public.treaty_wht_calculations
  FOR ALL
  USING (app.is_member_of(org_id, 'staff'))
  WITH CHECK (app.is_member_of(org_id, 'staff'));

DROP POLICY IF EXISTS tax_dispute_cases_rw ON public.tax_dispute_cases;
CREATE POLICY tax_dispute_cases_rw
  ON public.tax_dispute_cases
  FOR ALL
  USING (app.is_member_of(org_id, 'staff'))
  WITH CHECK (app.is_member_of(org_id, 'staff'));

DROP POLICY IF EXISTS tax_dispute_events_rw ON public.tax_dispute_events;
CREATE POLICY tax_dispute_events_rw
  ON public.tax_dispute_events
  FOR ALL
  USING (app.is_member_of(org_id, 'staff'))
  WITH CHECK (app.is_member_of(org_id, 'staff'));

COMMIT;
