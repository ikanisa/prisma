-- RLS for US tax overlays
BEGIN;

ALTER TABLE public.us_tax_overlay_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS us_tax_overlay_calculations_rw ON public.us_tax_overlay_calculations;
CREATE POLICY us_tax_overlay_calculations_rw
  ON public.us_tax_overlay_calculations
  FOR ALL
  USING (app.is_member_of(org_id, 'staff'))
  WITH CHECK (app.is_member_of(org_id, 'staff'));

COMMIT;
