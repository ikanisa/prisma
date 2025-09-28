-- RLS policies for specialist assessments

ALTER TABLE public.specialist_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "specialist_assessments_select" ON public.specialist_assessments;
CREATE POLICY "specialist_assessments_select" ON public.specialist_assessments
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "specialist_assessments_insert" ON public.specialist_assessments;
CREATE POLICY "specialist_assessments_insert" ON public.specialist_assessments
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "specialist_assessments_update" ON public.specialist_assessments;
CREATE POLICY "specialist_assessments_update" ON public.specialist_assessments
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "specialist_assessments_delete" ON public.specialist_assessments;
CREATE POLICY "specialist_assessments_delete" ON public.specialist_assessments
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));
