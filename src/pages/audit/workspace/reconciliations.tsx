import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AuditWorkspaceLayout } from './layout';

const demoReconcilations: AuditReconciliation[] = [
  {
    id: 'rec-demo-1',
    org_id: 'demo-org',
    entity_id: 'demo-entity',
    period_id: 'demo-period',
    type: 'BANK',
    gl_balance: 125_000,
    external_balance: 124_500,
    difference: 500,
    status: 'IN_PROGRESS',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    prepared_by_user_id: 'demo-user',
    reviewed_by_user_id: null,
    control_account_id: null,
    closed_at: null,
    schedule_document_id: null,
    items: [
      {
        id: 'item-demo-1',
        category: 'OUTSTANDING_CHECKS',
        amount: 300,
        reference: 'CHK-445',
        note: 'Payroll run 28 Feb',
        resolved: false,
      },
      {
        id: 'item-demo-2',
        category: 'DEPOSITS_IN_TRANSIT',
        amount: 200,
        reference: 'DEP-221',
        note: 'Card settlements 1 Mar',
        resolved: false,
      },
    ],
  },
  {
    id: 'rec-demo-2',
    org_id: 'demo-org',
    entity_id: 'demo-entity',
    period_id: 'demo-period',
    type: 'AR',
    gl_balance: 82_340,
    external_balance: 82_340,
    difference: 0,
    status: 'CLOSED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    prepared_by_user_id: 'demo-user',
    reviewed_by_user_id: 'manager-demo',
    control_account_id: null,
    closed_at: new Date().toISOString(),
    schedule_document_id: null,
    items: [],
  },
];

type AuditReconciliationStatus = 'DRAFT' | 'IN_PROGRESS' | 'CLOSED' | 'READY_FOR_REVIEW';

type AuditReconciliation = {
  id: string;
  org_id: string;
  entity_id: string;
  period_id: string;
  type: string;
  control_account_id: string | null;
  gl_balance: number;
  external_balance: number;
  difference: number;
  status: AuditReconciliationStatus | string;
  prepared_by_user_id: string | null;
  reviewed_by_user_id: string | null;
  closed_at: string | null;
  schedule_document_id: string | null;
  created_at: string;
  updated_at: string;
  items: Array<{
    id: string;
    category: string;
    amount: number;
    reference: string | null;
    note: string | null;
    resolved: boolean;
  }>;
};

type CreateState = {
  type: string;
  externalBalance: string;
  controlAccountId: string;
};

type ItemState = {
  category: string;
  amount: string;
  reference: string;
  note: string;
};

function normalizeReconciliations(records: any[]): AuditReconciliation[] {
  return (records ?? []).map((rec) => ({
    ...rec,
    gl_balance: Number(rec?.gl_balance ?? 0),
    external_balance: Number(rec?.external_balance ?? 0),
    difference: Number(rec?.difference ?? 0),
    items: (rec?.items ?? []).map((item: any) => ({
      ...item,
      amount: Number(item?.amount ?? 0),
      resolved: Boolean(item?.resolved),
    })),
  }));
}

const reconciliationTypes = ['BANK', 'AR', 'AP', 'GRNI', 'PAYROLL', 'OTHER'];
const itemCategories = ['OUTSTANDING_CHECKS', 'DEPOSITS_IN_TRANSIT', 'UNIDENTIFIED', 'OTHER'];

export default function ReconciliationsWorkspace() {
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [orgId, setOrgId] = useState('demo-org');
  const [engagementId, setEngagementId] = useState('demo-engagement');
  const [entityId, setEntityId] = useState('demo-entity');
  const [periodId, setPeriodId] = useState('demo-period');
  const [userId, setUserId] = useState('demo-user');

  const [reconciliations, setReconciliations] = useState<AuditReconciliation[]>(demoReconcilations);
  const [selectedId, setSelectedId] = useState<string>(demoReconcilations[0]?.id ?? '');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'error' | null>('info');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [createState, setCreateState] = useState<CreateState>({ type: 'BANK', externalBalance: '0', controlAccountId: '' });
  const [itemState, setItemState] = useState<ItemState>({ category: 'OUTSTANDING_CHECKS', amount: '0', reference: '', note: '' });
  const [closingDocId, setClosingDocId] = useState('');

  const selectedReconciliation = useMemo(
    () => reconciliations.find((rec) => rec.id === selectedId) ?? null,
    [reconciliations, selectedId],
  );

  useEffect(() => {
    if (mode === 'demo') {
      setReconciliations(demoReconcilations);
      setSelectedId(demoReconcilations[0]?.id ?? '');
      setStatusMessage('Showing deterministic demo data. Switch to live mode to pull reconciliations from Supabase.');
      setStatusTone('info');
      return;
    }

    if (!orgId || !engagementId || !entityId || !periodId) {
      setStatusMessage('Provide organisation, engagement, entity, and period identifiers to load live reconciliations.');
      setStatusTone('info');
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const params = new URLSearchParams({ orgId, entityId, periodId });
        const response = await fetch(`/api/recon?${params}`, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? 'Failed to load reconciliations');
        }
        const body = (await response.json()) as { reconciliations: AuditReconciliation[] };
        const normalised = normalizeReconciliations(body.reconciliations ?? []);
        setReconciliations(normalised);
        setSelectedId((prev) => {
          if (normalised?.some((rec) => rec.id === prev)) {
            return prev;
          }
          return normalised?.[0]?.id ?? '';
        });
        setStatusMessage(normalised?.length ? 'Reconciliations loaded from Supabase.' : 'No reconciliations recorded for this period.');
        setStatusTone(normalised?.length ? 'success' : 'info');
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Unable to fetch reconciliations';
        setFetchError(message);
        setStatusMessage('Fell back to last known data.');
        setStatusTone('error');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();

    return () => controller.abort();
  }, [mode, orgId, engagementId, entityId, periodId]);

  const showStatus = (message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setStatusMessage(message);
    setStatusTone(tone);
  };

  const resetStatus = () => {
    setStatusMessage(null);
    setStatusTone(null);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to create reconciliations.', 'error');
      return;
    }
    if (!orgId || !engagementId || !entityId || !periodId || !userId) {
      showStatus('Provide organisation, engagement, entity, period, and user identifiers.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/recon/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          engagementId,
          entityId,
          periodId,
          type: createState.type,
          controlAccountId: createState.controlAccountId || null,
          externalBalance: Number(createState.externalBalance ?? 0),
          preparedByUserId: userId,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { reconciliation?: { id: string }; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to create reconciliation');
      }
      await refreshReconciliations();
      showStatus('Reconciliation created.', 'success');
      if (body.reconciliation?.id) setSelectedId(body.reconciliation.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create reconciliation';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (event: FormEvent) => {
    event.preventDefault();
    if (mode !== 'live') {
      showStatus('Switch to live mode to add items.', 'error');
      return;
    }
    if (!selectedReconciliation) {
      showStatus('Select a reconciliation first.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/recon/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          reconciliationId: selectedReconciliation.id,
          item: {
            category: itemState.category,
            amount: Number(itemState.amount ?? 0),
            reference: itemState.reference || null,
            note: itemState.note || null,
            resolved: false,
          },
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to add reconciliation item');
      }
      await refreshReconciliations();
      showStatus('Item added.', 'success');
      setItemState({ category: 'OUTSTANDING_CHECKS', amount: '0', reference: '', note: '' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to add item';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (mode !== 'live') {
      showStatus('Switch to live mode to close reconciliations.', 'error');
      return;
    }
    if (!selectedReconciliation) {
      showStatus('Select a reconciliation first.', 'error');
      return;
    }
    try {
      setLoading(true);
      resetStatus();
      const response = await fetch('/api/recon/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          reconciliationId: selectedReconciliation.id,
          userId,
          scheduleDocumentId: closingDocId || null,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to close reconciliation');
      }
      await refreshReconciliations();
      showStatus('Reconciliation closed.', 'success');
      setClosingDocId('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to close reconciliation';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshReconciliations = async () => {
    if (mode !== 'live') {
      setReconciliations(demoReconcilations);
      setSelectedId(demoReconcilations[0]?.id ?? '');
      return;
    }
    if (!orgId || !entityId || !periodId) return;
    const params = new URLSearchParams({ orgId, entityId, periodId });
    const response = await fetch(`/api/recon?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'Failed to load reconciliations');
    }
    const body = (await response.json()) as { reconciliations: AuditReconciliation[] };
    const normalised = normalizeReconciliations(body.reconciliations ?? []);
    setReconciliations(normalised);
    setSelectedId((prev) => {
      if (normalised?.some((rec) => rec.id === prev)) {
        return prev;
      }
      return normalised?.[0]?.id ?? '';
    });
  };

  const totalOutstanding = useMemo(() => {
    if (!selectedReconciliation) return 0;
    return selectedReconciliation.items.filter((item) => !item.resolved).reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  }, [selectedReconciliation]);

  const differenceClass = (value: number) => {
    if (Math.abs(value) < 0.01) return 'text-emerald-600';
    if (value > 0) return 'text-amber-600';
    return 'text-destructive';
  };

  return (
    <AuditWorkspaceLayout>
      <section className="space-y-6">
        <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Reconciliation workbench</h2>
        <p className="text-sm text-slate-600">
          Capture supporting schedules for bank, AR/AP, and other reconciliations. Outstanding items roll forward to the
          misstatement evaluation workflow when differences remain.
        </p>
      </header>

      <div className="grid gap-4 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'demo' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            onClick={() => setMode('demo')}
          >
            Demo data
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium ${mode === 'live' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            onClick={() => setMode('live')}
          >
            Live Supabase
          </button>
          {fetchError && <span className="text-xs text-destructive">{fetchError}</span>}
        </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <label className="flex flex-col text-xs text-slate-600">
            Organisation ID
            <input
              className="mt-1 rounded border px-2 py-1"
              value={orgId}
              onChange={(event) => setOrgId(event.target.value)}
              placeholder="org UUID"
            />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Engagement ID
            <input
              className="mt-1 rounded border px-2 py-1"
              value={engagementId}
              onChange={(event) => setEngagementId(event.target.value)}
              placeholder="engagement UUID"
            />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Entity ID
            <input
              className="mt-1 rounded border px-2 py-1"
              value={entityId}
              onChange={(event) => setEntityId(event.target.value)}
              placeholder="client/entity UUID"
            />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Period ID
            <input
              className="mt-1 rounded border px-2 py-1"
              value={periodId}
              onChange={(event) => setPeriodId(event.target.value)}
              placeholder="close period UUID"
            />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            User ID
            <input
              className="mt-1 rounded border px-2 py-1"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="prepared by user UUID"
            />
          </label>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            statusTone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : statusTone === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <aside className="space-y-4 lg:col-span-1">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Create reconciliation</h3>
            <p className="mt-1 text-xs text-slate-500">Specify control area and balances. GL balance is fetched automatically when a control account is provided.</p>
            <form className="mt-3 space-y-3" onSubmit={handleCreate}>
              <label className="flex flex-col text-xs text-slate-600">
                Type
                <select
                  className="mt-1 rounded border px-2 py-1"
                  value={createState.type}
                  onChange={(event) => setCreateState((prev) => ({ ...prev, type: event.target.value }))}
                >
                  {reconciliationTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                Control account ID (optional)
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={createState.controlAccountId}
                  onChange={(event) => setCreateState((prev) => ({ ...prev, controlAccountId: event.target.value }))}
                  placeholder="ledger account UUID"
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                External balance
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={createState.externalBalance}
                  onChange={(event) => setCreateState((prev) => ({ ...prev, externalBalance: event.target.value }))}
                  type="number"
                  step="0.01"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Working…' : 'Create reconciliation'}
              </button>
            </form>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Add outstanding item</h3>
            {selectedReconciliation ? (
              <form className="mt-3 space-y-3" onSubmit={handleAddItem}>
                <label className="flex flex-col text-xs text-slate-600">
                  Category
                  <select
                    className="mt-1 rounded border px-2 py-1"
                    value={itemState.category}
                    onChange={(event) => setItemState((prev) => ({ ...prev, category: event.target.value }))}
                  >
                    {itemCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Amount
                  <input
                    className="mt-1 rounded border px-2 py-1"
                    value={itemState.amount}
                    onChange={(event) => setItemState((prev) => ({ ...prev, amount: event.target.value }))}
                    type="number"
                    step="0.01"
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Reference
                  <input
                    className="mt-1 rounded border px-2 py-1"
                    value={itemState.reference}
                    onChange={(event) => setItemState((prev) => ({ ...prev, reference: event.target.value }))}
                    placeholder="e.g. CHK-123"
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Note
                  <textarea
                    className="mt-1 rounded border px-2 py-1"
                    rows={2}
                    value={itemState.note}
                    onChange={(event) => setItemState((prev) => ({ ...prev, note: event.target.value }))}
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Working…' : 'Add item'}
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Select a reconciliation to add items.</p>
            )}
          </div>
        </aside>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Reconciliation register</h3>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {reconciliations.map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => setSelectedId(rec.id)}
                  className={`rounded border px-3 py-2 text-left transition hover:border-slate-400 ${
                    selectedId === rec.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{rec.type}</span>
                    <span className={`text-xs uppercase ${differenceClass(rec.difference)}`}>{rec.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">GL {formatCurrency(rec.gl_balance)} vs external {formatCurrency(rec.external_balance)}</div>
                  <div className={`mt-1 text-xs font-medium ${differenceClass(rec.difference)}`}>
                    Difference {formatCurrency(rec.difference)} • Outstanding items {rec.items.filter((item) => !item.resolved).length}
                  </div>
                </button>
              ))}
              {reconciliations.length === 0 && <p className="text-sm text-slate-500">No reconciliations yet.</p>}
            </div>
          </div>

          {selectedReconciliation && (
            <div className="rounded-lg border bg-white p-4 shadow-sm space-y-4">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{selectedReconciliation.type} reconciliation</h4>
                  <p className="text-xs text-slate-500">
                    Prepared by {selectedReconciliation.prepared_by_user_id ?? 'n/a'} · Difference
                    <span className={`ml-1 font-semibold ${differenceClass(selectedReconciliation.difference)}`}>
                      {formatCurrency(selectedReconciliation.difference)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="w-48 rounded border px-2 py-1 text-xs"
                    placeholder="Schedule document ID (optional)"
                    value={closingDocId}
                    onChange={(event) => setClosingDocId(event.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    onClick={handleClose}
                    disabled={loading || Math.abs(selectedReconciliation.difference) > 0.01}
                  >
                    {loading ? 'Closing…' : 'Close reconciliation'}
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                <div className="rounded border bg-slate-50 p-3">
                  <div className="font-semibold text-slate-800">GL balance</div>
                  <div className="text-slate-900">{formatCurrency(selectedReconciliation.gl_balance)}</div>
                </div>
                <div className="rounded border bg-slate-50 p-3">
                  <div className="font-semibold text-slate-800">External balance</div>
                  <div className="text-slate-900">{formatCurrency(selectedReconciliation.external_balance)}</div>
                </div>
                <div className="rounded border bg-slate-50 p-3">
                  <div className="font-semibold text-slate-800">Outstanding difference</div>
                  <div className={`font-semibold ${differenceClass(selectedReconciliation.difference)}`}>
                    {formatCurrency(selectedReconciliation.difference)}
                  </div>
                </div>
                <div className="rounded border bg-slate-50 p-3">
                  <div className="font-semibold text-slate-800">Open adjustments</div>
                  <div className={`font-semibold ${differenceClass(totalOutstanding)}`}>{formatCurrency(totalOutstanding)}</div>
                </div>
              </div>

              <div>
                <h5 className="text-sm font-semibold text-slate-900">Reconciling items</h5>
                <table className="mt-2 w-full text-xs">
                  <thead className="text-slate-500">
                    <tr className="border-b">
                      <th className="py-1 text-left">Category</th>
                      <th className="py-1 text-left">Amount</th>
                      <th className="py-1 text-left">Reference</th>
                      <th className="py-1 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReconciliation.items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-1">{item.category}</td>
                        <td className={`py-1 ${differenceClass(item.amount)}`}>{formatCurrency(item.amount)}</td>
                        <td className="py-1 text-slate-500">{item.reference ?? '—'}</td>
                        <td className="py-1 text-slate-500">{item.resolved ? 'Resolved' : 'Open'}</td>
                      </tr>
                    ))}
                    {selectedReconciliation.items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-2 text-center text-slate-500">
                          No adjustments captured yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      </section>
    </AuditWorkspaceLayout>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);
}
