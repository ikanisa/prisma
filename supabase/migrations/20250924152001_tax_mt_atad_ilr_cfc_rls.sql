-- RLS policies for ATAD ILR & CFC tables

ALTER TABLE public.interest_limitation_computations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cfc_inclusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interest_limitation_rw ON public.interest_limitation_computations;
CREATE POLICY interest_limitation_rw ON public.interest_limitation_computations
  FOR ALL
  USING (app.is_member_of(org_id, 'staff'))
  WITH CHECK (app.is_member_of(org_id, 'staff'));

DROP POLICY IF EXISTS cfc_inclusions_rw ON public.cfc_inclusions;
CREATE POLICY cfc_inclusions_rw ON public.cfc_inclusions
  FOR ALL
  USING (app.is_member_of(org_id, 'staff'))
  WITH CHECK (app.is_member_of(org_id, 'staff'));
