-- RLS policies for Pillar Two schema
BEGIN;

ALTER TABLE public.tax_entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pillar_two_computations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_entity_relationships_rw ON public.tax_entity_relationships;
CREATE POLICY tax_entity_relationships_rw
  ON public.tax_entity_relationships
  FOR ALL
  USING (app.is_member_of(org_id, 'staff'))
  WITH CHECK (app.is_member_of(org_id, 'staff'));

DROP POLICY IF EXISTS pillar_two_computations_rw ON public.pillar_two_computations;
CREATE POLICY pillar_two_computations_rw
  ON public.pillar_two_computations
  FOR ALL
  USING (app.is_member_of(org_id, 'staff'))
  WITH CHECK (app.is_member_of(org_id, 'staff'));

COMMIT;
