-- Audit planning strategy & materiality RLS policies (AP-PLAN-1)
BEGIN;

ALTER TABLE public.audit_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiality_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_plans_select ON public.audit_plans
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY audit_plans_insert ON public.audit_plans
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY audit_plans_update ON public.audit_plans
  FOR UPDATE USING (public.is_member_of(org_id));

CREATE POLICY audit_plans_delete ON public.audit_plans
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level));

CREATE POLICY materiality_sets_select ON public.materiality_sets
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY materiality_sets_insert ON public.materiality_sets
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY materiality_sets_update ON public.materiality_sets
  FOR UPDATE USING (public.is_member_of(org_id));

CREATE POLICY materiality_sets_delete ON public.materiality_sets
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level));

CREATE POLICY plan_change_log_select ON public.plan_change_log
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY plan_change_log_insert ON public.plan_change_log
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY plan_change_log_update ON public.plan_change_log
  FOR UPDATE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY plan_change_log_delete ON public.plan_change_log
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level));

COMMIT;
