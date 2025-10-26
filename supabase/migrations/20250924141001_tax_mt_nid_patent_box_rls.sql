-- RLS policies for Malta tax calculators (T-1B)

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.is_member_of(
  p_org uuid,
  p_min_role text DEFAULT 'staff'
) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = app, public
AS $$
  SELECT app.is_org_member(p_org, p_min_role::org_role);
$$;

ALTER TABLE public.nid_computations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patent_box_computations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nid_computations_select ON public.nid_computations;
CREATE POLICY nid_computations_select ON public.nid_computations
  FOR SELECT
  USING (app.is_member_of(org_id, 'staff'));

DROP POLICY IF EXISTS nid_computations_write ON public.nid_computations;
CREATE POLICY nid_computations_write ON public.nid_computations
  FOR ALL
  USING (app.is_member_of(org_id, 'manager'))
  WITH CHECK (app.is_member_of(org_id, 'manager'));

DROP POLICY IF EXISTS patent_box_computations_select ON public.patent_box_computations;
CREATE POLICY patent_box_computations_select ON public.patent_box_computations
  FOR SELECT
  USING (app.is_member_of(org_id, 'staff'));

DROP POLICY IF EXISTS patent_box_computations_write ON public.patent_box_computations;
CREATE POLICY patent_box_computations_write ON public.patent_box_computations
  FOR ALL
  USING (app.is_member_of(org_id, 'manager'))
  WITH CHECK (app.is_member_of(org_id, 'manager'));
