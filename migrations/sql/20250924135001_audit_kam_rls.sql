-- Row level security policies for KAM workflow tables

ALTER TABLE public.estimate_register ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estimate_register_select ON public.estimate_register;
CREATE POLICY estimate_register_select ON public.estimate_register
  FOR SELECT USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS estimate_register_write ON public.estimate_register;
CREATE POLICY estimate_register_write ON public.estimate_register
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

DROP POLICY IF EXISTS estimate_register_update ON public.estimate_register;
CREATE POLICY estimate_register_update ON public.estimate_register
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level))
  WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

DROP POLICY IF EXISTS estimate_register_delete ON public.estimate_register;
CREATE POLICY estimate_register_delete ON public.estimate_register
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

ALTER TABLE public.going_concern_worksheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gc_worksheets_select ON public.going_concern_worksheets;
CREATE POLICY gc_worksheets_select ON public.going_concern_worksheets
  FOR SELECT USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS gc_worksheets_write ON public.going_concern_worksheets;
CREATE POLICY gc_worksheets_write ON public.going_concern_worksheets
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

DROP POLICY IF EXISTS gc_worksheets_update ON public.going_concern_worksheets;
CREATE POLICY gc_worksheets_update ON public.going_concern_worksheets
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level))
  WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

DROP POLICY IF EXISTS gc_worksheets_delete ON public.going_concern_worksheets;
CREATE POLICY gc_worksheets_delete ON public.going_concern_worksheets
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

ALTER TABLE public.audit_planned_procedures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planned_procedures_select ON public.audit_planned_procedures;
CREATE POLICY planned_procedures_select ON public.audit_planned_procedures
  FOR SELECT USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS planned_procedures_write ON public.audit_planned_procedures;
CREATE POLICY planned_procedures_write ON public.audit_planned_procedures
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

DROP POLICY IF EXISTS planned_procedures_update ON public.audit_planned_procedures;
CREATE POLICY planned_procedures_update ON public.audit_planned_procedures
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level))
  WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

DROP POLICY IF EXISTS planned_procedures_delete ON public.audit_planned_procedures;
CREATE POLICY planned_procedures_delete ON public.audit_planned_procedures
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

ALTER TABLE public.audit_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_evidence_select ON public.audit_evidence;
CREATE POLICY audit_evidence_select ON public.audit_evidence
  FOR SELECT USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS audit_evidence_write ON public.audit_evidence;
CREATE POLICY audit_evidence_write ON public.audit_evidence
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

DROP POLICY IF EXISTS audit_evidence_update ON public.audit_evidence;
CREATE POLICY audit_evidence_update ON public.audit_evidence
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level))
  WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

DROP POLICY IF EXISTS audit_evidence_delete ON public.audit_evidence;
CREATE POLICY audit_evidence_delete ON public.audit_evidence
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

ALTER TABLE public.kam_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kam_candidates_select ON public.kam_candidates;
CREATE POLICY kam_candidates_select ON public.kam_candidates
  FOR SELECT USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS kam_candidates_write ON public.kam_candidates;
CREATE POLICY kam_candidates_write ON public.kam_candidates
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

DROP POLICY IF EXISTS kam_candidates_update ON public.kam_candidates;
CREATE POLICY kam_candidates_update ON public.kam_candidates
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level))
  WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

DROP POLICY IF EXISTS kam_candidates_delete ON public.kam_candidates;
CREATE POLICY kam_candidates_delete ON public.kam_candidates
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

ALTER TABLE public.kam_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kam_drafts_select ON public.kam_drafts;
CREATE POLICY kam_drafts_select ON public.kam_drafts
  FOR SELECT USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS kam_drafts_write ON public.kam_drafts;
CREATE POLICY kam_drafts_write ON public.kam_drafts
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

DROP POLICY IF EXISTS kam_drafts_update ON public.kam_drafts;
CREATE POLICY kam_drafts_update ON public.kam_drafts
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level))
  WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

DROP POLICY IF EXISTS kam_drafts_delete ON public.kam_drafts;
CREATE POLICY kam_drafts_delete ON public.kam_drafts
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));
