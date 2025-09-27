-- RLS for fiscal unity computations

ALTER TABLE public.fiscal_unity_computations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fiscal_unity_rw ON public.fiscal_unity_computations;
CREATE POLICY fiscal_unity_rw ON public.fiscal_unity_computations
  FOR ALL
  USING (app.is_member_of(org_id, 'staff'))
  WITH CHECK (app.is_member_of(org_id, 'staff'));
