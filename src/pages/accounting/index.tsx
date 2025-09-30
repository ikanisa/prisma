import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CalendarCheck2, FileSpreadsheet, Loader2, Lock, Unlock, ActivitySquare, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAccountingCloseDashboard } from '@/hooks/use-accounting-close-dashboard';
import {
  advanceClosePeriod,
  lockClosePeriod,
  closeReconciliation,
  snapshotTrialBalance,
  runVariance,
} from '@/lib/accounting-close-service';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizations } from '@/hooks/use-organizations';
import { useWhatsappMfa } from '@/hooks/use-whatsapp-mfa';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const CLOSE_FLOW: Array<'OPEN' | 'SUBSTANTIVE_REVIEW' | 'READY_TO_LOCK' | 'LOCKED'> = [
  'OPEN',
  'SUBSTANTIVE_REVIEW',
  'READY_TO_LOCK',
  'LOCKED',
];

const PBC_COMPLETED_STATUS = 'APPROVED';
const RECON_CLOSED_STATUS = 'CLOSED';
const JOURNAL_POSTED_STATUS = 'POSTED';
const VARIANCE_OPEN_STATUS = 'OPEN';

export default function Accounting() {
  const { toast } = useToast();
  const { currentOrg } = useOrganizations();
  const {
    orgSlug,
    closePeriod,
    pbcItems,
    reconciliations,
    journalBatches,
    varianceResults,
    activity,
    isLoading,
    refetch,
  } = useAccountingCloseDashboard();

  const summary = useMemo(() => {
    if (!closePeriod) {
      return {
        pbcProgress: 0,
        reconciliationProgress: 0,
        pendingJournals: 0,
        openVariance: 0,
      };
    }

    const completedPbc = pbcItems.filter((item) => (item.status ?? '').toUpperCase() === PBC_COMPLETED_STATUS).length;
    const closedReconciliations = reconciliations.filter((item) => (item.status ?? '').toUpperCase() === RECON_CLOSED_STATUS).length;
    const postedJournals = journalBatches.filter((batch) => (batch.status ?? '').toUpperCase() === JOURNAL_POSTED_STATUS).length;
    const openVariance = varianceResults.filter((variance) => (variance.status ?? '').toUpperCase() === VARIANCE_OPEN_STATUS).length;

    return {
      pbcProgress: pbcItems.length === 0 ? 0 : Math.round((completedPbc / pbcItems.length) * 100),
      reconciliationProgress:
        reconciliations.length === 0 ? 0 : Math.round((closedReconciliations / reconciliations.length) * 100),
      pendingJournals: journalBatches.length - postedJournals,
      openVariance,
    };
  }, [closePeriod, journalBatches, pbcItems, reconciliations, varianceResults]);

  const whatsappMfa = useWhatsappMfa();
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const [mfaPhone, setMfaPhone] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    if (whatsappMfa.state.phone && !mfaPhone) {
      setMfaPhone(whatsappMfa.state.phone);
    }
  }, [mfaPhone, whatsappMfa.state.phone]);

  const advanceCloseMutation = useMutation({
    mutationFn: async () => {
      if (!orgSlug || !closePeriod?.id) throw new Error('No close period available.');
      return advanceClosePeriod({ orgSlug, closePeriodId: closePeriod.id });
    },
    onSuccess: () => {
      toast({ title: 'Close advanced', description: 'Close period moved to the next milestone.' });
      void refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to advance close',
        description: error?.message ?? 'Unexpected error advancing the close period.',
        variant: 'destructive',
      });
    },
  });

  const lockCloseMutation = useMutation({
    mutationFn: async () => {
      if (!orgSlug || !closePeriod?.id) throw new Error('No close period available.');
      return lockClosePeriod({ orgSlug, closePeriodId: closePeriod.id });
    },
    onSuccess: () => {
      toast({ title: 'Close locked', description: 'The close period has been locked.' });
      void refetch();
    },
    onError: (error: any) => {
      if (error?.message === 'mfa_required') {
        setMfaDialogOpen(true);
        toast({
          title: 'Verification required',
          description: 'Complete WhatsApp verification to lock the close period.',
        });
        return;
      }
      toast({
        title: 'Unable to lock close',
        description: error?.message ?? 'Unexpected error locking the close period.',
        variant: 'destructive',
      });
    },
  });

  const closeReconciliationMutation = useMutation({
    mutationFn: async (reconciliationId: string) => {
      if (!orgSlug) throw new Error('No organisation selected.');
      return closeReconciliation({ orgSlug, reconciliationId });
    },
    onSuccess: () => {
      toast({ title: 'Reconciliation closed' });
      void refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to close reconciliation',
        description: error?.message ?? 'Unexpected error closing the reconciliation.',
        variant: 'destructive',
      });
    },
  });

  const varianceExplainMutation = useMutation({
    mutationFn: async (varianceId: string) => {
      const { error } = await supabase
        .from('variance_results')
        .update({ status: 'EXPLAINED', updated_at: new Date().toISOString() })
        .eq('id', varianceId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: 'Variance marked as explained' });
      void refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to update variance',
        description: error?.message ?? 'Unexpected error updating variance result.',
        variant: 'destructive',
      });
    },
  });

  const snapshotMutation = useMutation({
    mutationFn: async () => {
      if (!orgSlug || !closePeriod?.id) throw new Error('No close period available.');
      return snapshotTrialBalance({ orgSlug, periodId: closePeriod.id });
    },
    onSuccess: (result) => {
      toast({
        title: 'Trial balance captured',
        description: `Snapshot ${result.snapshotId} stored (${result.totalDebit.toLocaleString()} debit).`,
      });
      void refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to snapshot trial balance',
        description: error?.message ?? 'Unexpected error capturing the trial balance.',
        variant: 'destructive',
      });
    },
  });

  const varianceRunMutation = useMutation({
    mutationFn: async () => {
      if (!orgSlug || !closePeriod?.id) throw new Error('No close period available.');
      return runVariance({ orgSlug, periodId: closePeriod.id });
    },
    onSuccess: (result) => {
      toast({
        title: 'Variance analytics queued',
        description: `${result.triggered} variance signals will be refreshed shortly.`,
      });
      void refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Unable to run variance analytics',
        description: error?.message ?? 'Unexpected error running variance analytics.',
        variant: 'destructive',
      });
    },
  });

  const disableAdvance = !closePeriod || closePeriod.status === 'LOCKED';
  const disableLock = !closePeriod || closePeriod.status !== 'READY_TO_LOCK';

  if (!currentOrg) {
    return (
      <main className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Accounting close workspace</h1>
        <p className="text-muted-foreground">Join or select an organisation to orchestrate the monthly close.</p>
      </main>
    );
  }

  return (
    <main className="space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Accounting close</h1>
        <p className="text-sm text-slate-600">
          Manage close milestones, PBC requests, reconciliations, and approvals for {currentOrg.name}.
        </p>
        {closePeriod ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold uppercase text-slate-700">Current period:</span>
            <span>{closePeriod.name}</span>
            {closePeriod.start_date && <span>from {formatDate(closePeriod.start_date)}</span>}
            {closePeriod.end_date && <span>to {formatDate(closePeriod.end_date)}</span>}
            <StatusPill tone={closePeriod.status === 'LOCKED' ? 'success' : 'info'}>
              {closePeriod.status.toLowerCase()}
            </StatusPill>
          </div>
        ) : (
          <p className="text-xs text-amber-600">
            No close period found. Use the accounting close tools to create a new period via the API or edge
            function.
          </p>
        )}
      </header>

      <Dialog open={mfaDialogOpen} onOpenChange={setMfaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify with WhatsApp</DialogTitle>
            <DialogDescription>
              A fresh WhatsApp verification is required before locking the close period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2" htmlFor="close-mfa-phone">
                <Phone className="h-4 w-4" /> WhatsApp number (E.164)
              </label>
              <Input
                id="close-mfa-phone"
                value={mfaPhone}
                onChange={(event) => setMfaPhone(event.target.value)}
                disabled={whatsappMfa.state.loading}
              />
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await whatsappMfa.sendCode(mfaPhone.trim());
                    toast({ title: 'Verification code sent', description: 'Check WhatsApp for your 6-digit code.' });
                  } catch (error: any) {
                    toast({ title: 'Unable to send code', description: error.message, variant: 'destructive' });
                  }
                }}
                disabled={!mfaPhone.trim() || whatsappMfa.state.loading || Boolean(whatsappMfa.cooldown)}
              >
                {whatsappMfa.cooldownMessage ?? 'Send verification code'}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="close-mfa-code">Verification code</label>
              <div className="flex flex-wrap gap-3">
                <Input
                  id="close-mfa-code"
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  className="max-w-xs"
                  disabled={whatsappMfa.state.loading}
                />
                <Button
                  onClick={async () => {
                    try {
                      await whatsappMfa.verifyCode(mfaCode.trim());
                      toast({ title: 'WhatsApp verified', description: 'Attempting to lock the close again.' });
                      setMfaDialogOpen(false);
                      setMfaCode('');
                      lockCloseMutation.mutate();
                    } catch (error: any) {
                      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' });
                    }
                  }}
                  disabled={!mfaCode.trim() || whatsappMfa.state.loading}
                >
                  Verify and continue
                </Button>
              </div>
            </div>

            {whatsappMfa.state.lastVerifiedAt ? (
              <p className="text-xs text-muted-foreground">
                Last verification {whatsappMfa.state.lastVerifiedAt.toLocaleString()}.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Codes expire after 5 minutes. Three failed attempts will lock verification for 10 minutes.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading close data…
        </div>
      )}

      <section aria-label="Close summary" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<CalendarCheck2 className="h-5 w-5" />}
          label="PBC progress"
          value={`${summary.pbcProgress}%`}
          helper="Approved PBC requests"
        />
        <SummaryCard
          icon={<FileSpreadsheet className="h-5 w-5" />}
          label="Reconciliations closed"
          value={`${summary.reconciliationProgress}%`}
          helper="Schedules fully reconciled"
        />
        <SummaryCard
          icon={<ActivitySquare className="h-5 w-5" />}
          label="Journals awaiting action"
          value={`${summary.pendingJournals}`}
          helper="Batches not yet posted"
        />
        <SummaryCard
          icon={<Loader2 className="h-5 w-5" />}
          label="Open variance items"
          value={`${summary.openVariance}`}
          helper="Exceptions needing explanation"
        />
      </section>

      <section aria-label="Close controls" className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => advanceCloseMutation.mutate()}
          disabled={disableAdvance || advanceCloseMutation.isPending}
        >
          <div>
            <div className="text-sm font-semibold text-slate-800">Advance close stage</div>
            <p className="mt-1 text-xs text-slate-500">
              Moves the close period to the next milestone (currently {closePeriod?.status ?? 'n/a'}).
            </p>
          </div>
          <Unlock className="h-5 w-5 text-slate-400" />
        </button>
        <button
          type="button"
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => lockCloseMutation.mutate()}
          disabled={disableLock || lockCloseMutation.isPending}
        >
          <div>
            <div className="text-sm font-semibold text-slate-800">Lock close period</div>
            <p className="mt-1 text-xs text-slate-500">Seals the close period and prevents further postings.</p>
          </div>
          <Lock className="h-5 w-5 text-emerald-500" />
        </button>
      </section>

      <section aria-label="PBC queue" className="space-y-3">
        <SectionHeading title="Prepared-by-client requests" description="Track document requests aligned with ISA 505." />
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200" aria-label="PBC items">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {pbcItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    No PBC items captured for this close period.
                  </td>
                </tr>
              ) : (
                pbcItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium uppercase tracking-wide text-xs text-slate-500">{item.area}</td>
                    <td className="px-4 py-3">{item.title}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{item.assignee_user_id ?? 'Unassigned'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {item.due_at ? formatDate(item.due_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={item.status === PBC_COMPLETED_STATUS ? 'success' : 'info'}>
                        {item.status.toLowerCase()}
                      </StatusPill>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Reconciliations" className="space-y-3">
        <SectionHeading title="Reconciliations" description="Ensure control accounts agree to external evidence." />
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200" aria-label="Reconciliations">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Difference</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {reconciliations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                    No reconciliations recorded for this close period.
                  </td>
                </tr>
              ) : (
                reconciliations.map((item) => {
                  const isClosed = (item.status ?? '').toUpperCase() === RECON_CLOSED_STATUS;
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium uppercase tracking-wide text-xs text-slate-500">{item.type}</td>
                      <td className="px-4 py-3">{formatCurrency(item.difference ?? 0)}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={isClosed ? 'success' : 'warning'}>
                          {(item.status ?? '').toLowerCase()}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => closeReconciliationMutation.mutate(item.id)}
                          disabled={isClosed || closeReconciliationMutation.isPending}
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Journal batches" className="space-y-3">
        <SectionHeading title="Journal batches" description="Approve and post journals after control review." />
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200" aria-label="Journal batches">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Preparer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Posted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {journalBatches.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                    No journal batches for this close period.
                  </td>
                </tr>
              ) : (
                journalBatches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="px-4 py-3 font-medium">{batch.reference ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{batch.prepared_by_user_id ?? 'Unknown'}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={(batch.status ?? '').toUpperCase() === JOURNAL_POSTED_STATUS ? 'success' : 'info'}>
                        {(batch.status ?? '').toLowerCase()}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {batch.posted_at ? formatDate(batch.posted_at) : 'Pending'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Variance analytics" className="space-y-3">
        <SectionHeading title="Variance analytics" description="Explain movements to comply with IAS 1.138 and management review controls." />
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200" aria-label="Variance exceptions">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Current</th>
                <th className="px-4 py-3 text-right">Baseline</th>
                <th className="px-4 py-3 text-right">Delta</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {varianceResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    No variance exceptions recorded yet.
                  </td>
                </tr>
              ) : (
                varianceResults.map((item) => {
                  const open = (item.status ?? '').toUpperCase() === VARIANCE_OPEN_STATUS;
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium uppercase tracking-wide text-xs text-slate-500">{item.target_code}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.explanation ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.value ?? 0)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.baseline ?? 0)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span>{formatCurrency(item.delta_abs ?? 0)}</span>
                          <span className="text-xs text-slate-500">{formatPercent(item.delta_pct ?? 0)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={open ? 'warning' : 'success'}>{(item.status ?? '').toLowerCase()}</StatusPill>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => varianceExplainMutation.mutate(item.id)}
                          disabled={!open || varianceExplainMutation.isPending}
                        >
                          Mark explained
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="Analytics controls" className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          onClick={() => snapshotMutation.mutate()}
          disabled={snapshotMutation.isPending || !closePeriod}
        >
          Capture trial balance snapshot
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Stores ledger totals and balances for audit evidence.
          </span>
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          onClick={() => varianceRunMutation.mutate()}
          disabled={varianceRunMutation.isPending || !closePeriod}
        >
          Run variance analytics
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Refreshes IAS 1 variance calculations and exception tracking.
          </span>
        </button>
      </section>

      <section aria-label="Activity log" className="space-y-3">
        <SectionHeading title="Activity log" description="Recent automated and manual events captured for the close." />
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-200" role="list">
            {activity.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">No accounting close activity recorded yet.</li>
            ) : (
              activity.map((entry) => (
                <li key={entry.id} className="px-4 py-3 text-sm text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{entry.message}</span>
                    <time className="text-xs text-slate-500" dateTime={entry.timestamp}>
                      {new Intl.DateTimeFormat(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(entry.timestamp))}
                    </time>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="rounded-full bg-slate-100 p-2 text-slate-500">{icon}</div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
        <p className="mt-1 text-xs text-slate-500">{helper}</p>
      </div>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function StatusPill({ tone, children }: { tone: 'success' | 'info' | 'warning'; children: ReactNode }) {
  const toneClasses: Record<'success' | 'info' | 'warning', string> = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  const formatted = Number.isFinite(value) ? value.toFixed(1) : '0.0';
  return `${value >= 0 ? '+' : ''}${formatted}%`;
}
