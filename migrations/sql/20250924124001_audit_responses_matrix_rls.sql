-- RLS policies for audit responses (AP-PLAN-3)
BEGIN;

ALTER TABLE public.audit_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_response_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_responses_select ON public.audit_responses
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY audit_responses_insert ON public.audit_responses
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY audit_responses_update ON public.audit_responses
  FOR UPDATE USING (public.is_member_of(org_id));

CREATE POLICY audit_responses_delete ON public.audit_responses
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY audit_response_checks_select ON public.audit_response_checks
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY audit_response_checks_insert ON public.audit_response_checks
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY audit_response_checks_update ON public.audit_response_checks
  FOR UPDATE USING (public.is_member_of(org_id));

CREATE POLICY audit_response_checks_delete ON public.audit_response_checks
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'::public.role_level));

COMMIT;
