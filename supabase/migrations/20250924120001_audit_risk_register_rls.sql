-- RLS policies for audit risk register (AP-PLAN-2)
BEGIN;

ALTER TABLE public.audit_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_risk_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_risk_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_risks_select ON public.audit_risks
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY audit_risks_insert ON public.audit_risks
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY audit_risks_update ON public.audit_risks
  FOR UPDATE USING (public.is_member_of(org_id));

CREATE POLICY audit_risks_delete ON public.audit_risks
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY audit_risk_signals_select ON public.audit_risk_signals
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY audit_risk_signals_insert ON public.audit_risk_signals
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY audit_risk_signals_update ON public.audit_risk_signals
  FOR UPDATE USING (public.is_member_of(org_id));

CREATE POLICY audit_risk_signals_delete ON public.audit_risk_signals
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY audit_risk_activity_select ON public.audit_risk_activity
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY audit_risk_activity_insert ON public.audit_risk_activity
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY audit_risk_activity_update ON public.audit_risk_activity
  FOR UPDATE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY audit_risk_activity_delete ON public.audit_risk_activity
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'::public.role_level));

COMMIT;
