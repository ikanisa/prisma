-- RLS policies for fraud plan & JE strategy (AP-PLAN-4)
BEGIN;

ALTER TABLE public.fraud_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_plan_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY fraud_plans_select ON public.fraud_plans
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY fraud_plans_insert ON public.fraud_plans
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY fraud_plans_update ON public.fraud_plans
  FOR UPDATE USING (public.is_member_of(org_id));

CREATE POLICY fraud_plans_delete ON public.fraud_plans
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY fraud_plan_actions_select ON public.fraud_plan_actions
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY fraud_plan_actions_insert ON public.fraud_plan_actions
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY fraud_plan_actions_update ON public.fraud_plan_actions
  FOR UPDATE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY fraud_plan_actions_delete ON public.fraud_plan_actions
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY je_strategy_select ON public.journal_entry_strategies
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY je_strategy_insert ON public.journal_entry_strategies
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY je_strategy_update ON public.journal_entry_strategies
  FOR UPDATE USING (public.is_member_of(org_id));

CREATE POLICY je_strategy_delete ON public.journal_entry_strategies
  FOR DELETE USING (public.is_member_of(org_id) AND has_min_role(org_id, 'MANAGER'::public.role_level));

COMMIT;
