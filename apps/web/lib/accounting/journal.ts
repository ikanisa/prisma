import type { SupabaseClient } from '@supabase/supabase-js';
import { differenceInCalendarDays, isWeekend, parseISO } from 'date-fns';
import type { Database } from '../../src/integrations/supabase/types';
import { JE_CONTROL_SEVERITIES, MAX_JE_IMBALANCE, ROUND_AMOUNT_STEP, SENSITIVE_ACCOUNT_TYPES } from './constants';

interface ControlContext {
  orgId: string;
  batchId: string;
  userId: string;
}

export async function evaluateAndPersistJournalAlerts(
  supabase: SupabaseClient<Database>,
  ctx: ControlContext
): Promise<{ severity: 'LOW' | 'MEDIUM' | 'HIGH'; rule: string }[]> {
  const { orgId, batchId } = ctx;
  const alerts: { rule: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; details: Record<string, unknown> }[] = [];

  const { data: batch } = await supabase
    .from('journal_batches')
    .select('id, org_id, entity_id, period_id, attachment_id, submitted_at')
    .eq('id', batchId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!batch) {
    return [];
  }

  const { data: entries } = await supabase
    .from('ledger_entries')
    .select('id, account_id, debit, credit, date')
    .eq('org_id', orgId)
    .eq('batch_id', batchId);

  const accountIds = entries?.map((entry) => entry.account_id) ?? [];
  const { data: accounts } = await supabase
    .from('ledger_accounts')
    .select('id, type, code, name')
    .in('id', accountIds.length ? accountIds : ['00000000-0000-0000-0000-000000000000']);

  const accountMap = new Map(accounts?.map((acct) => [acct.id, acct]));

  // LATE_POSTING check
  if (batch.period_id) {
    const { data: period } = await supabase
      .from('close_periods')
      .select('end_date')
      .eq('id', batch.period_id)
      .maybeSingle();
    if (period?.end_date) {
      const end = parseISO(period.end_date);
      if (differenceInCalendarDays(new Date(), end) > 0) {
        alerts.push({
          rule: 'LATE_POSTING',
          severity: JE_CONTROL_SEVERITIES.LATE_POSTING,
          details: { endDate: period.end_date },
        });
      }
    }
  }

  if (isWeekend(new Date())) {
    alerts.push({
      rule: 'WEEKEND_USER',
      severity: JE_CONTROL_SEVERITIES.WEEKEND_USER,
      details: {},
    });
  }

  const hasRoundAmount = (entries ?? []).some((entry) => {
    const amount = entry.debit > 0 ? entry.debit : entry.credit;
    return amount >= ROUND_AMOUNT_STEP && Math.abs(amount % ROUND_AMOUNT_STEP) < 1e-6;
  });
  if (hasRoundAmount) {
    alerts.push({
      rule: 'ROUND_AMOUNT',
      severity: JE_CONTROL_SEVERITIES.ROUND_AMOUNT,
      details: {},
    });
  }

  const manualSensitive = (entries ?? []).some((entry) => {
    const acct = accountMap.get(entry.account_id);
    return acct ? SENSITIVE_ACCOUNT_TYPES.has(acct.type) : false;
  });
  if (manualSensitive) {
    alerts.push({
      rule: 'MANUAL_TO_SENSITIVE',
      severity: JE_CONTROL_SEVERITIES.MANUAL_TO_SENSITIVE,
      details: { accounts: accountIds },
    });
  }

  if (!batch.attachment_id) {
    alerts.push({
      rule: 'MISSING_ATTACHMENT',
      severity: JE_CONTROL_SEVERITIES.MISSING_ATTACHMENT,
      details: {},
    });
  }

  // Persist alerts (replace existing of same rule)
  for (const alert of alerts) {
    await supabase
      .from('je_control_alerts')
      .delete()
      .eq('batch_id', batchId)
      .eq('rule', alert.rule);

    await supabase.from('je_control_alerts').insert({
      org_id: orgId,
      entity_id: batch.entity_id,
      batch_id: batchId,
      period_id: batch.period_id,
      rule: alert.rule,
      severity: alert.severity,
      details: alert.details,
      resolved: false,
    });
  }

  return alerts.map(({ rule, severity }) => ({ rule, severity }));
}

export function validateJournalBalance(lines: { debit: number; credit: number }[]): boolean {
  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
  return Math.abs(totalDebit - totalCredit) <= MAX_JE_IMBALANCE;
}
