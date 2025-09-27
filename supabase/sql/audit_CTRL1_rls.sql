-- RLS policies for Audit Controls Matrix & ITGC tables (CTRL-1)

ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "controls_select" ON public.controls;
CREATE POLICY "controls_select" ON public.controls
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "controls_insert" ON public.controls;
CREATE POLICY "controls_insert" ON public.controls
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "controls_update" ON public.controls;
CREATE POLICY "controls_update" ON public.controls
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "controls_delete" ON public.controls;
CREATE POLICY "controls_delete" ON public.controls
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

ALTER TABLE public.control_walkthroughs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "control_walkthroughs_select" ON public.control_walkthroughs;
CREATE POLICY "control_walkthroughs_select" ON public.control_walkthroughs
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "control_walkthroughs_insert" ON public.control_walkthroughs;
CREATE POLICY "control_walkthroughs_insert" ON public.control_walkthroughs
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "control_walkthroughs_update" ON public.control_walkthroughs;
CREATE POLICY "control_walkthroughs_update" ON public.control_walkthroughs
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "control_walkthroughs_delete" ON public.control_walkthroughs;
CREATE POLICY "control_walkthroughs_delete" ON public.control_walkthroughs
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

ALTER TABLE public.control_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "control_tests_select" ON public.control_tests;
CREATE POLICY "control_tests_select" ON public.control_tests
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "control_tests_insert" ON public.control_tests;
CREATE POLICY "control_tests_insert" ON public.control_tests
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "control_tests_update" ON public.control_tests;
CREATE POLICY "control_tests_update" ON public.control_tests
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "control_tests_delete" ON public.control_tests;
CREATE POLICY "control_tests_delete" ON public.control_tests
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

ALTER TABLE public.itgc_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "itgc_groups_select" ON public.itgc_groups;
CREATE POLICY "itgc_groups_select" ON public.itgc_groups
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "itgc_groups_insert" ON public.itgc_groups;
CREATE POLICY "itgc_groups_insert" ON public.itgc_groups
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "itgc_groups_update" ON public.itgc_groups;
CREATE POLICY "itgc_groups_update" ON public.itgc_groups
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "itgc_groups_delete" ON public.itgc_groups;
CREATE POLICY "itgc_groups_delete" ON public.itgc_groups
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

ALTER TABLE public.deficiencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deficiencies_select" ON public.deficiencies;
CREATE POLICY "deficiencies_select" ON public.deficiencies
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "deficiencies_insert" ON public.deficiencies;
CREATE POLICY "deficiencies_insert" ON public.deficiencies
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "deficiencies_update" ON public.deficiencies;
CREATE POLICY "deficiencies_update" ON public.deficiencies
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "deficiencies_delete" ON public.deficiencies;
CREATE POLICY "deficiencies_delete" ON public.deficiencies
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));
