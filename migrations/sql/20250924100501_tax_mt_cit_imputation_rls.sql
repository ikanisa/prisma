BEGIN;

ALTER TABLE public.tax_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cit_computations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participation_exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY tax_entities_select ON public.tax_entities
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY tax_entities_insert ON public.tax_entities
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY tax_entities_update ON public.tax_entities
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY tax_entities_delete ON public.tax_entities
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level));

CREATE POLICY tax_accounts_select ON public.tax_accounts
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY tax_accounts_insert ON public.tax_accounts
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY tax_accounts_update ON public.tax_accounts
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY tax_accounts_delete ON public.tax_accounts
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level));

CREATE POLICY cit_computations_select ON public.cit_computations
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY cit_computations_insert ON public.cit_computations
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY cit_computations_update ON public.cit_computations
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY cit_computations_delete ON public.cit_computations
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level));

CREATE POLICY participation_exemptions_select ON public.participation_exemptions
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY participation_exemptions_insert ON public.participation_exemptions
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY participation_exemptions_update ON public.participation_exemptions
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY participation_exemptions_delete ON public.participation_exemptions
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level));

CREATE POLICY return_files_select ON public.return_files
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY return_files_insert ON public.return_files
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY return_files_update ON public.return_files
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY return_files_delete ON public.return_files
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level));

COMMIT;
