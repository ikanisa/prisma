-- RLS policies for group audit schema

ALTER TABLE public.group_components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_components_select" ON public.group_components;
CREATE POLICY "group_components_select" ON public.group_components
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "group_components_insert" ON public.group_components;
CREATE POLICY "group_components_insert" ON public.group_components
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "group_components_update" ON public.group_components;
CREATE POLICY "group_components_update" ON public.group_components
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "group_components_delete" ON public.group_components;
CREATE POLICY "group_components_delete" ON public.group_components
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

ALTER TABLE public.group_instructions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_instructions_select" ON public.group_instructions;
CREATE POLICY "group_instructions_select" ON public.group_instructions
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "group_instructions_insert" ON public.group_instructions;
CREATE POLICY "group_instructions_insert" ON public.group_instructions
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "group_instructions_update" ON public.group_instructions;
CREATE POLICY "group_instructions_update" ON public.group_instructions
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "group_instructions_delete" ON public.group_instructions;
CREATE POLICY "group_instructions_delete" ON public.group_instructions
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

ALTER TABLE public.group_workpapers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_workpapers_select" ON public.group_workpapers;
CREATE POLICY "group_workpapers_select" ON public.group_workpapers
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "group_workpapers_insert" ON public.group_workpapers;
CREATE POLICY "group_workpapers_insert" ON public.group_workpapers
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "group_workpapers_update" ON public.group_workpapers;
CREATE POLICY "group_workpapers_update" ON public.group_workpapers
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "group_workpapers_delete" ON public.group_workpapers;
CREATE POLICY "group_workpapers_delete" ON public.group_workpapers
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

ALTER TABLE public.group_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_reviews_select" ON public.group_reviews;
CREATE POLICY "group_reviews_select" ON public.group_reviews
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "group_reviews_insert" ON public.group_reviews;
CREATE POLICY "group_reviews_insert" ON public.group_reviews
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "group_reviews_update" ON public.group_reviews;
CREATE POLICY "group_reviews_update" ON public.group_reviews
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "group_reviews_delete" ON public.group_reviews;
CREATE POLICY "group_reviews_delete" ON public.group_reviews
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));
