-- RLS policies for SOC-1 tables

ALTER TABLE public.service_organisations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_organisations_select" ON public.service_organisations;
CREATE POLICY "service_organisations_select" ON public.service_organisations
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "service_organisations_insert" ON public.service_organisations;
CREATE POLICY "service_organisations_insert" ON public.service_organisations
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "service_organisations_update" ON public.service_organisations;
CREATE POLICY "service_organisations_update" ON public.service_organisations
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "service_organisations_delete" ON public.service_organisations;
CREATE POLICY "service_organisations_delete" ON public.service_organisations
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

ALTER TABLE public.soc_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "soc_reports_select" ON public.soc_reports;
CREATE POLICY "soc_reports_select" ON public.soc_reports
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "soc_reports_insert" ON public.soc_reports;
CREATE POLICY "soc_reports_insert" ON public.soc_reports
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "soc_reports_update" ON public.soc_reports;
CREATE POLICY "soc_reports_update" ON public.soc_reports
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "soc_reports_delete" ON public.soc_reports;
CREATE POLICY "soc_reports_delete" ON public.soc_reports
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

ALTER TABLE public.cuec_controls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cuec_controls_select" ON public.cuec_controls;
CREATE POLICY "cuec_controls_select" ON public.cuec_controls
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "cuec_controls_insert" ON public.cuec_controls;
CREATE POLICY "cuec_controls_insert" ON public.cuec_controls
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "cuec_controls_update" ON public.cuec_controls;
CREATE POLICY "cuec_controls_update" ON public.cuec_controls
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "cuec_controls_delete" ON public.cuec_controls;
CREATE POLICY "cuec_controls_delete" ON public.cuec_controls
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));
