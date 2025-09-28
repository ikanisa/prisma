BEGIN;

ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.close_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.close_pbc_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fs_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coa_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.je_control_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variance_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY ledger_accounts_select ON public.ledger_accounts
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY ledger_accounts_insert ON public.ledger_accounts
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY ledger_accounts_update ON public.ledger_accounts
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY ledger_accounts_delete ON public.ledger_accounts
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'SYSTEM_ADMIN'));

CREATE POLICY ledger_entries_select ON public.ledger_entries
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY ledger_entries_insert ON public.ledger_entries
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY ledger_entries_update ON public.ledger_entries
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY ledger_entries_delete ON public.ledger_entries
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY journal_batches_select ON public.journal_batches
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY journal_batches_insert ON public.journal_batches
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY journal_batches_update ON public.journal_batches
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY journal_batches_delete ON public.journal_batches
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY trial_balance_select ON public.trial_balance_snapshots
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY trial_balance_insert ON public.trial_balance_snapshots
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY trial_balance_update ON public.trial_balance_snapshots
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY trial_balance_delete ON public.trial_balance_snapshots
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'SYSTEM_ADMIN'));

CREATE POLICY close_periods_select ON public.close_periods
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY close_periods_insert ON public.close_periods
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY close_periods_update ON public.close_periods
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY close_periods_delete ON public.close_periods
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'SYSTEM_ADMIN'));

CREATE POLICY close_pbc_items_select ON public.close_pbc_items
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY close_pbc_items_insert ON public.close_pbc_items
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY close_pbc_items_update ON public.close_pbc_items
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY close_pbc_items_delete ON public.close_pbc_items
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY reconciliations_select ON public.reconciliations
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY reconciliations_insert ON public.reconciliations
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY reconciliations_update ON public.reconciliations
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY reconciliations_delete ON public.reconciliations
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY reconciliation_items_select ON public.reconciliation_items
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY reconciliation_items_insert ON public.reconciliation_items
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY reconciliation_items_update ON public.reconciliation_items
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY reconciliation_items_delete ON public.reconciliation_items
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY fs_lines_select ON public.fs_lines
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY fs_lines_insert ON public.fs_lines
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY fs_lines_update ON public.fs_lines
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY fs_lines_delete ON public.fs_lines
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'SYSTEM_ADMIN'));

CREATE POLICY coa_map_select ON public.coa_map
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY coa_map_insert ON public.coa_map
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY coa_map_update ON public.coa_map
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY coa_map_delete ON public.coa_map
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY je_control_alerts_select ON public.je_control_alerts
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY je_control_alerts_insert ON public.je_control_alerts
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY je_control_alerts_update ON public.je_control_alerts
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY je_control_alerts_delete ON public.je_control_alerts
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY variance_rules_select ON public.variance_rules
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY variance_rules_insert ON public.variance_rules
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY variance_rules_update ON public.variance_rules
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY variance_rules_delete ON public.variance_rules
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY variance_results_select ON public.variance_results
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY variance_results_insert ON public.variance_results
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
CREATE POLICY variance_results_update ON public.variance_results
  FOR UPDATE USING (public.is_member_of(org_id));
CREATE POLICY variance_results_delete ON public.variance_results
  FOR DELETE USING (public.is_member_of(org_id) AND public.has_min_role(org_id, 'MANAGER'));

COMMIT;
