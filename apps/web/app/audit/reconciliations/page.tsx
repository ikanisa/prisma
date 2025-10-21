'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { clientEnv } from '@/src/env.client';

// Read once at build-time for client code (must be NEXT_PUBLIC_)
const RUNTIME_MODE = clientEnv.NEXT_PUBLIC_RECONCILIATION_MODE;

/* -------------------------------------------------------------------
   MODE ROUTER
   ------------------------------------------------------------------- */

export default function ReconciliationPage() {
  return RUNTIME_MODE === 'memory' ? (
    <ReconciliationWorkbench />
  ) : (
    <ReconciliationsWorkspace />
  );
}

/* ===================================================================
   MEMORY MODE (Codex branch): Audit Reconciliation Workbench
   Endpoints expected:
     - GET  /api/recon
     - POST /api/recon
     - GET  /api/recon/:id
     - POST /api/recon/:id/statements
     - POST /api/recon/:id/match
     - POST /api/recon/items/:itemId/resolve
     - POST /api/recon/:id/close
   =================================================================== */

import type {
  MatchStrategy,
  ReconItem,
  ReconciliationSnapshot,
  ReconciliationSummary,
  ReconciliationType,
  ReconMatchGroup,
  ReconStatement,
  StatementSide,
} from '@/lib/audit/reconciliation-types';

const RECON_TYPES: { value: ReconciliationType; label: string }[] = [
  { value: 'BANK', label: 'Bank' },
  { value: 'ACCOUNTS_RECEIVABLE', label: 'Accounts Receivable' },
  { value: 'ACCOUNTS_PAYABLE', label: 'Accounts Payable' },
];

const STATEMENT_SIDES: { value: StatementSide; label: string }[] = [
  { value: 'LEDGER', label: 'Ledger / GL' },
  { value: 'EXTERNAL', label: 'External Statement' },
];

interface CreateFormState {
  name: string;
  type: ReconciliationType;
  periodStart: string;
  periodEnd: string;
  currency: string;
  controlReference: string;
}

interface StatementFormState {
  side: StatementSide;
  sourceName: string;
  statementDate: string;
  raw: string;
  importedBy: string;
}

interface ResolutionFormState {
  note: string;
  followUpDate: string;
  cleared: boolean;
  flaggedAsMisstatement: boolean;
  evidenceLink: string;
  resolvedBy: string;
}

interface CloseFormState {
  closedBy: string;
  summary: string;
  reviewNotes: string;
  controlReference: string;
}

const INITIAL_CREATE_FORM: CreateFormState = {
  name: '',
  type: 'BANK',
  periodStart: '',
  periodEnd: '',
  currency: 'USD',
  controlReference: '',
};

const INITIAL_STATEMENT_FORM: StatementFormState = {
  side: 'LEDGER',
  sourceName: '',
  statementDate: '',
  raw: '',
  importedBy: '',
};

const INITIAL_RESOLUTION_FORM: ResolutionFormState = {
  note: '',
  followUpDate: '',
  cleared: true,
  flaggedAsMisstatement: false,
  evidenceLink: '',
  resolvedBy: '',
};

const INITIAL_CLOSE_FORM: CloseFormState = {
  closedBy: '',
  summary: '',
  reviewNotes: '',
  controlReference: '',
};

function formatCurrencyGeneric(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function parseStatementLines(raw: string) {
  const rows = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rows.length) {
    throw new Error('Provide at least one row of statement data');
  }

  return rows.map((row, index) => {
    const parts = row.split(',');
    if (parts.length < 3) {
      throw new Error(`Row ${index + 1} must include date, description, and amount`);
    }
    const [date, description, amountPart, reference] = parts.map((part) => part.trim());
    if (!date || !description || !amountPart) {
      throw new Error(`Row ${index + 1} is missing required fields`);
    }
    const numeric = amountPart.replace(/[^0-9.-]/g, '');
    const amount = Number(numeric);
    if (Number.isNaN(amount)) {
      throw new Error(`Row ${index + 1} contains an invalid amount`);
    }
    return {
      date,
      description,
      amount,
      reference: reference ?? undefined,
    };
  });
}

function snapshotToSummary(snapshot: ReconciliationSnapshot): ReconciliationSummary {
  const outstanding = snapshot.items.filter((item) => item.status === 'OUTSTANDING');
  const outstandingTotal = outstanding.reduce((sum, item) => sum + item.amount, 0);
  return {
    id: snapshot.id,
    orgId: snapshot.orgId,
    engagementId: snapshot.engagementId,
    controlReference: snapshot.controlReference,
    name: snapshot.name,
    type: snapshot.type,
    currency: snapshot.currency,
    status: snapshot.status,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    lastMatchedAt: snapshot.lastMatchedAt,
    closedAt: snapshot.closedAt,
    closedBy: snapshot.closedBy,
    summary: snapshot.summary,
    outstandingItems: outstanding.length,
    outstandingTotal: Math.round(outstandingTotal * 100) / 100,
  };
}

function scheduleFor(snapshot: ReconciliationSnapshot): string {
  const lines: string[] = [];
  const header = `Schedule for ${snapshot.name} (${snapshot.periodStart} → ${snapshot.periodEnd})`;
  lines.push(header, '');
  const rows = snapshot.items.filter((item) => item.status === 'OUTSTANDING' || item.followUpDate);
  if (!rows.length) {
    lines.push('No outstanding or follow-up items.');
  } else {
    lines.push('Date | Description | Amount | Status');
    for (const item of rows) {
      const statusLabel =
        item.status === 'OUTSTANDING' ? 'Outstanding' : item.isMisstatement ? 'Misstatement' : 'Resolved';
      const dateLabel = item.followUpDate ?? 'TBD';
      lines.push(
        `${dateLabel} | ${item.reason} | ${formatCurrencyGeneric(item.amount, snapshot.currency)} | ${statusLabel}`,
      );
    }
  }
  return lines.join('\n');
}

function ReconciliationWorkbench() {
  const [summaries, setSummaries] = useState<ReconciliationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationSnapshot | null>(null);
  const [createForm, setCreateForm] = useState<CreateFormState>(INITIAL_CREATE_FORM);
  const [statementForm, setStatementForm] = useState<StatementFormState>(INITIAL_STATEMENT_FORM);
  const [resolutionForm, setResolutionForm] = useState<ResolutionFormState>(INITIAL_RESOLUTION_FORM);
  const [closeForm, setCloseForm] = useState<CloseFormState>(INITIAL_CLOSE_FORM);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [matchStrategies, setMatchStrategies] = useState<{ amountAndDate: boolean; amountOnly: boolean }>({
    amountAndDate: true,
    amountOnly: true,
  });
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduleExport, setScheduleExport] = useState<string>('');

  const outstandingItems = useMemo(
    () => reconciliation?.items.filter((item) => item.status === 'OUTSTANDING') ?? [],
    [reconciliation],
  );
  const matchGroups = useMemo(() => reconciliation?.matches ?? [], [reconciliation]);

  const updateSummariesWithSnapshot = useCallback((snapshot: ReconciliationSnapshot) => {
    const summary = snapshotToSummary(snapshot);
    setSummaries((current) => {
      const others = current.filter((entry) => entry.id !== summary.id);
      return [summary, ...others].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
  }, []);

  const loadReconciliation = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/recon/${id}`);
        if (!response.ok) throw new Error('Failed to load reconciliation details');
        const payload = (await response.json()) as { reconciliation: ReconciliationSnapshot };
        setSelectedId(id);
        setReconciliation(payload.reconciliation);
        updateSummariesWithSnapshot(payload.reconciliation);
      } catch (err) {
        setError((err as Error).message || 'Unable to load reconciliation');
      } finally {
        setDetailLoading(false);
      }
    },
    [updateSummariesWithSnapshot],
  );

  const refreshSummaries = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/recon');
      if (!response.ok) throw new Error('Failed to load reconciliations');
      const payload = (await response.json()) as { reconciliations: ReconciliationSummary[] };
      setSummaries(payload.reconciliations ?? []);
      if (selectedId && payload.reconciliations.some((item) => item.id === selectedId)) {
        await loadReconciliation(selectedId);
      } else if (selectedId) {
        setSelectedId(null);
        setReconciliation(null);
      }
    } catch (err) {
      setError((err as Error).message || 'Unable to load reconciliations');
    } finally {
      setListLoading(false);
    }
  }, [loadReconciliation, selectedId]);

  useEffect(() => {
    void refreshSummaries();
  }, [refreshSummaries]);

  useEffect(() => {
    if (!reconciliation) {
      setSelectedItemId(null);
      return;
    }
    if (selectedItemId && reconciliation.items.some((item) => item.id === selectedItemId)) return;
    const outstanding = reconciliation.items.filter((item) => item.status === 'OUTSTANDING');
    setSelectedItemId(outstanding[0]?.id ?? null);
  }, [reconciliation, selectedItemId]);

  const handleCreateChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setCreateForm((current) => ({ ...current, [name]: value }));
  };

  const handleStatementChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setStatementForm((current) => ({ ...current, [name]: value }));
  };

  const handleResolutionChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    if (type === 'checkbox') {
      setResolutionForm((current) => ({ ...current, [name]: checked }));
    } else {
      setResolutionForm((current) => ({ ...current, [name]: value }));
    }
  };

  const handleCloseFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setCloseForm((current) => ({ ...current, [name]: value }));
  };

  const handleStrategyToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setMatchStrategies((current) => ({ ...current, [name]: checked }));
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setError(null);
    try {
      const response = await fetch('/api/recon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          type: createForm.type,
          periodStart: createForm.periodStart,
          periodEnd: createForm.periodEnd,
          currency: createForm.currency,
          controlReference: createForm.controlReference || undefined,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to create reconciliation');
      }
      const payload = (await response.json()) as { reconciliation: ReconciliationSnapshot };
      setCreateForm(INITIAL_CREATE_FORM);
      setReconciliation(payload.reconciliation);
      setSelectedId(payload.reconciliation.id);
      updateSummariesWithSnapshot(payload.reconciliation);
      setStatusMessage('Reconciliation created successfully');
    } catch (err) {
      setError((err as Error).message || 'Unable to create reconciliation');
    }
  };

  const handleImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId) {
      setError('Select a reconciliation before importing statements');
      return;
    }
    let lines;
    try {
      lines = parseStatementLines(statementForm.raw);
    } catch (err) {
      setError((err as Error).message);
      return;
    }

    setImportLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/recon/${selectedId}/statements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          side: statementForm.side,
          sourceName: statementForm.sourceName,
          statementDate: statementForm.statementDate,
          lines,
          importedBy: statementForm.importedBy || undefined,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to import statement');
      }
      const payload = (await response.json()) as { statement: ReconStatement; reconciliation: ReconciliationSnapshot };
      setReconciliation(payload.reconciliation);
      updateSummariesWithSnapshot(payload.reconciliation);
      setStatementForm((current) => ({ ...current, raw: '' }));
      setStatusMessage(`Imported ${payload.statement.lines.length} rows from ${payload.statement.sourceName}`);
    } catch (err) {
      setError((err as Error).message || 'Unable to import statement');
    } finally {
      setImportLoading(false);
    }
  };

  const handleMatch = async () => {
    if (!selectedId) {
      setError('Select a reconciliation before running matching');
      return;
    }
    const strategies: MatchStrategy[] = [];
    if (matchStrategies.amountAndDate) strategies.push('AMOUNT_AND_DATE');
    if (matchStrategies.amountOnly) strategies.push('AMOUNT_ONLY');

    setDetailLoading(true);
    setError(null);
    try {
      const init: RequestInit = { method: 'POST' };
      if (strategies.length) {
        init.headers = { 'Content-Type': 'application/json' };
        init.body = JSON.stringify({ strategies });
      }
      const response = await fetch(`/api/recon/${selectedId}/match`, init);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to run matching');
      }
      const payload = (await response.json()) as {
        matches: ReconMatchGroup[];
        outstanding: ReconItem[];
        reconciliation: ReconciliationSnapshot;
      };
      setReconciliation(payload.reconciliation);
      updateSummariesWithSnapshot(payload.reconciliation);
      setStatusMessage(`Matched ${payload.matches.length} items with ${payload.outstanding.length} remaining outstanding`);
    } catch (err) {
      setError((err as Error).message || 'Unable to run deterministic matching');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResolve = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItemId) {
      setError('Select an outstanding item to resolve');
      return;
    }

    setResolutionLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/recon/items/${selectedItemId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutionNote: resolutionForm.note,
          followUpDate: resolutionForm.followUpDate || undefined,
          cleared: resolutionForm.cleared,
          evidenceLink: resolutionForm.evidenceLink || undefined,
          flaggedAsMisstatement: resolutionForm.flaggedAsMisstatement,
          resolvedBy: resolutionForm.resolvedBy || undefined,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to resolve item');
      }
      const payload = (await response.json()) as { item: ReconItem; reconciliation: ReconciliationSnapshot };
      setReconciliation(payload.reconciliation);
      updateSummariesWithSnapshot(payload.reconciliation);
      setResolutionForm(INITIAL_RESOLUTION_FORM);
      setStatusMessage('Reconciling item updated');
    } catch (err) {
      setError((err as Error).message || 'Unable to resolve reconciling item');
    } finally {
      setResolutionLoading(false);
    }
  };

  const handleClose = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId) {
      setError('Select a reconciliation before closing it');
      return;
    }

    setCloseLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/recon/${selectedId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closedBy: closeForm.closedBy,
          summary: closeForm.summary,
          reviewNotes: closeForm.reviewNotes || undefined,
          controlReference: closeForm.controlReference || reconciliation?.controlReference,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to close reconciliation');
      }
      const payload = (await response.json()) as { reconciliation: ReconciliationSnapshot };
      setReconciliation(payload.reconciliation);
      updateSummariesWithSnapshot(payload.reconciliation);
      setCloseForm(INITIAL_CLOSE_FORM);
      setStatusMessage('Reconciliation closed and evidence generated');
    } catch (err) {
      setError((err as Error).message || 'Unable to close reconciliation');
    } finally {
      setCloseLoading(false);
    }
  };

  const handleScheduleExport = async () => {
    if (!reconciliation) {
      setError('Nothing to export yet');
    } else {
      const text = scheduleFor(reconciliation);
      setScheduleExport(text);
      try {
        await navigator.clipboard.writeText(text);
        setStatusMessage('Schedule copied to clipboard');
      } catch {
        setError('Unable to copy schedule to clipboard');
      }
    }
  };

  const renderStatements = (side: StatementSide) => {
    if (!reconciliation) return <p className="text-sm text-muted-foreground">No data imported yet.</p>;
    const statements = reconciliation.statements.filter((statement) => statement.side === side);
    if (!statements.length) {
      return <p className="text-sm text-muted-foreground">No {side.toLowerCase()} statements imported.</p>;
    }
    return (
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="px-3 py-2 text-left font-medium">Reference</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 text-center font-medium">Matched</th>
            </tr>
          </thead>
          <tbody>
            {statements.flatMap((statement) =>
              statement.lines.map((line) => (
                <tr key={line.id} className="odd:bg-background even:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap">{line.date ?? '—'}</td>
                  <td className="px-3 py-2">{line.description}</td>
                  <td className="px-3 py-2">{line.reference ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatCurrencyGeneric(line.amount, reconciliation.currency)}
                  </td>
                  <td className="px-3 py-2 text-center">{line.matchGroupId ? '✔︎' : ''}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Audit Reconciliation Workbench</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import statements, run deterministic matching, manage reconciling items, and generate audit evidence ready for ISA 500 review.
        </p>
        <div className="mt-2 text-xs text-amber-700">
          Mode: <strong>memory</strong> (set NEXT_PUBLIC_RECONCILIATION_MODE to &quot;db&quot; for live view)
        </div>
      </header>

      {error ? <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {statusMessage ? (
        <div className="rounded border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{statusMessage}</div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <aside className="space-y-4">
          <div className="rounded border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Reconciliations</h2>
            <div className="mt-3 space-y-2">
              {listLoading && !summaries.length ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : summaries.length ? (
                summaries.map((summary) => {
                  const isActive = summary.id === selectedId;
                  return (
                    <button
                      key={summary.id}
                      type="button"
                      onClick={() => void loadReconciliation(summary.id)}
                      className={`w-full rounded border px-3 py-2 text-left text-sm transition ${
                        isActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{summary.name}</span>
                        <span className="text-xs uppercase text-muted-foreground">{summary.status}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {summary.periodStart} → {summary.periodEnd}
                      </div>
                      <div className="mt-1 text-xs">Outstanding: {summary.outstandingItems}</div>
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No reconciliations yet. Create one below.</p>
              )}
            </div>
          </div>

          <form onSubmit={handleCreate} className="rounded border bg-card p-4 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Create reconciliation</h2>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={createForm.name}
                onChange={handleCreateChange}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground" htmlFor="type">
                Type
              </label>
              <select
                id="type"
                name="type"
                value={createForm.type}
                onChange={handleCreateChange}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                {RECON_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="periodStart">
                  Period start
                </label>
                <input
                  id="periodStart"
                  name="periodStart"
                  type="date"
                  required
                  value={createForm.periodStart}
                  onChange={handleCreateChange}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="periodEnd">
                  Period end
                </label>
                <input
                  id="periodEnd"
                  name="periodEnd"
                  type="date"
                  required
                  value={createForm.periodEnd}
                  onChange={handleCreateChange}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="currency">
                  Currency
                </label>
                <input
                  id="currency"
                  name="currency"
                  type="text"
                  value={createForm.currency}
                  onChange={handleCreateChange}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="controlReference">
                  Control ref (optional)
                </label>
                <input
                  id="controlReference"
                  name="controlReference"
                  type="text"
                  value={createForm.controlReference}
                  onChange={handleCreateChange}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              disabled={!createForm.name.trim() || !createForm.periodStart || !createForm.periodEnd}
            >
              Launch reconciliation
            </button>
          </form>
        </aside>

        <div className="space-y-6">
          {detailLoading && !reconciliation ? (
            <div className="rounded border bg-card p-6 text-sm text-muted-foreground">Loading details…</div>
          ) : reconciliation ? (
            <>
              <section className="rounded border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{reconciliation.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {reconciliation.type.replace('_', ' ')} · {reconciliation.periodStart} → {reconciliation.periodEnd}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>Status: {reconciliation.status}</div>
                    <div>Outstanding items: {outstandingItems.length}</div>
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded border bg-card p-5 shadow-sm">
                <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold">Import statements</h3>
                    <p className="text-sm text-muted-foreground">
                      Paste CSV rows in the format: <code>YYYY-MM-DD,Description,Amount,Reference</code>
                    </p>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="amountAndDate"
                        checked={matchStrategies.amountAndDate}
                        onChange={handleStrategyToggle}
                      />
                      Amount + date match
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="amountOnly"
                        checked={matchStrategies.amountOnly}
                        onChange={handleStrategyToggle}
                      />
                      Amount-only match
                    </label>
                  </div>
                </header>
                <form onSubmit={handleImport} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground" htmlFor="side">
                        Statement side
                      </label>
                      <select
                        id="side"
                        name="side"
                        value={statementForm.side}
                        onChange={handleStatementChange}
                        className="w-full rounded border px-3 py-2 text-sm"
                      >
                        {STATEMENT_SIDES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground" htmlFor="sourceName">
                        Source name
                      </label>
                      <input
                        id="sourceName"
                        name="sourceName"
                        type="text"
                        required
                        value={statementForm.sourceName}
                        onChange={handleStatementChange}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground" htmlFor="statementDate">
                        Statement date
                      </label>
                      <input
                        id="statementDate"
                        name="statementDate"
                        type="date"
                        value={statementForm.statementDate}
                        onChange={handleStatementChange}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground" htmlFor="importedBy">
                        Imported by
                      </label>
                      <input
                        id="importedBy"
                        name="importedBy"
                        type="text"
                        value={statementForm.importedBy}
                        onChange={handleStatementChange}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      disabled={importLoading || !statementForm.sourceName.trim() || !statementForm.raw.trim()}
                    >
                      {importLoading ? 'Importing…' : 'Import statement'}
                    </button>
                    <button
                      type="button"
                      onClick={handleMatch}
                      className="w-full rounded border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      Run deterministic match
                    </button>
                  </div>
                  <div className="space-y-2">
                    <textarea
                      id="raw"
                      name="raw"
                      value={statementForm.raw}
                      onChange={handleStatementChange}
                      rows={12}
                      placeholder="2024-03-01,Opening balance,12000.00,GL-001"
                      className="h-full w-full rounded border px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </form>
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4 rounded border bg-card p-5 shadow-sm">
                  <h3 className="text-base font-semibold">Ledger lines</h3>
                  {renderStatements('LEDGER')}
                </div>
                <div className="space-y-4 rounded border bg-card p-5 shadow-sm">
                  <h3 className="text-base font-semibold">External lines</h3>
                  {renderStatements('EXTERNAL')}
                </div>
              </section>

              <section className="rounded border bg-card p-5 shadow-sm">
                <h3 className="text-base font-semibold">Auto-match review</h3>
                {matchGroups.length ? (
                  <div className="mt-3 space-y-2">
                    {matchGroups.map((match) => (
                      <div key={match.id} className="rounded border border-dashed px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{match.strategy.replace('_', ' ')}</span>
                          <span className="text-xs text-muted-foreground">{match.createdAt}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Ledger lines: {match.ledgerLineIds.length} · External lines: {match.externalLineIds.length}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No matches yet. Import statements and run the matcher.
                  </p>
                )}
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4 rounded border bg-card p-5 shadow-sm">
                  <h3 className="text-base font-semibold">Outstanding items</h3>
                  {outstandingItems.length ? (
                    <ul className="space-y-2 text-sm">
                      {outstandingItems.map((item) => (
                        <li
                          key={item.id}
                          className={`rounded border px-3 py-2 transition ${
                            item.id === selectedItemId ? 'border-primary bg-primary/10' : 'border-border'
                          }`}
                        >
                          <button type="button" className="w-full text-left" onClick={() => setSelectedItemId(item.id)}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{item.reason}</span>
                              <span className="font-mono">
                                {formatCurrencyGeneric(item.amount, reconciliation.currency)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Side: {item.side.toLowerCase()} · Created {item.createdAt}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No outstanding items remain.</p>
                  )}
                </div>

                <form onSubmit={handleResolve} className="space-y-3 rounded border bg-card p-5 shadow-sm">
                  <h3 className="text-base font-semibold">Resolution workflow</h3>
                  <div className="text-xs text-muted-foreground">
                    Document how items were cleared or escalated. Evidence links will be stored for ISA 500 traceability.
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="cleared" checked={resolutionForm.cleared} onChange={handleResolutionChange} />
                      Cleared through subsequent statements
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="flaggedAsMisstatement"
                        checked={resolutionForm.flaggedAsMisstatement}
                        onChange={handleResolutionChange}
                      />
                      Escalate as misstatement
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground" htmlFor="note">
                      Resolution notes
                    </label>
                    <textarea
                      id="note"
                      name="note"
                      required
                      value={resolutionForm.note}
                      onChange={handleResolutionChange}
                      rows={4}
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground" htmlFor="followUpDate">
                        Follow-up date
                      </label>
                      <input
                        id="followUpDate"
                        name="followUpDate"
                        type="date"
                        value={resolutionForm.followUpDate}
                        onChange={handleResolutionChange}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground" htmlFor="resolvedBy">
                        Resolved by
                      </label>
                      <input
                        id="resolvedBy"
                        name="resolvedBy"
                        type="text"
                        value={resolutionForm.resolvedBy}
                        onChange={handleResolutionChange}
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground" htmlFor="evidenceLink">
                      Evidence link
                    </label>
                    <input
                      id="evidenceLink"
                      name="evidenceLink"
                      type="url"
                      value={resolutionForm.evidenceLink}
                      onChange={handleResolutionChange}
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    disabled={resolutionLoading || !selectedItemId}
                  >
                    {resolutionLoading ? 'Saving…' : 'Record resolution'}
                  </button>
                </form>
              </section>

              <section className="grid gap-6 md:grid-cols-2">
                <form onSubmit={handleClose} className="space-y-3 rounded border bg-card p-5 shadow-sm">
                  <h3 className="text-base font-semibold">Close reconciliation</h3>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground" htmlFor="closedBy">
                      Closed by
                    </label>
                    <input
                      id="closedBy"
                      name="closedBy"
                      type="text"
                      required
                      value={closeForm.closedBy}
                      onChange={handleCloseFormChange}
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground" htmlFor="summary">
                      Closure summary
                    </label>
                    <textarea
                      id="summary"
                      name="summary"
                      required
                      value={closeForm.summary}
                      onChange={handleCloseFormChange}
                      rows={4}
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground" htmlFor="reviewNotes">
                      Review notes
                    </label>
                    <textarea
                      id="reviewNotes"
                      name="reviewNotes"
                      value={closeForm.reviewNotes}
                      onChange={handleCloseFormChange}
                      rows={3}
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground" htmlFor="controlReferenceClose">
                      Control reference
                    </label>
                    <input
                      id="controlReferenceClose"
                      name="controlReference"
                      type="text"
                      value={closeForm.controlReference}
                      onChange={handleCloseFormChange}
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    disabled={closeLoading}
                  >
                    {closeLoading ? 'Closing…' : 'Close and document'}
                  </button>
                </form>

                <div className="space-y-3 rounded border bg-card p-5 shadow-sm">
                  <h3 className="text-base font-semibold">Evidence & activity</h3>
                  {reconciliation?.evidence.length ? (
                    <ul className="space-y-2 text-sm">
                      {reconciliation.evidence.map((entry) => (
                        <li key={entry.id} className="rounded border border-dashed px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{entry.evidenceType}</span>
                            <span className="text-xs text-muted-foreground">{entry.createdAt}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{entry.description}</p>
                          {entry.link ? (
                            <a
                              href={entry.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              Evidence link
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Evidence will appear after resolutions and closure.</p>
                  )}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleScheduleExport}
                      className="w-full rounded border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                    >
                      Export follow-up schedule
                    </button>
                    <textarea
                      readOnly
                      value={scheduleExport}
                      className="w-full rounded border px-3 py-2 text-xs"
                      rows={6}
                      placeholder="Schedule preview will appear here after export."
                    />
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="rounded border bg-card p-6 text-sm text-muted-foreground">
              Select or create a reconciliation to begin importing statements.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ===================================================================
   DB MODE (main branch): Live Supabase Workspace
   Endpoints expected:
     - GET  /api/recon?orgId=&entityId=&periodId=
     - POST /api/recon/create
     - POST /api/recon/add-item
     - POST /api/recon/close
   =================================================================== */

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
      { id: 'item-demo-1', category: 'OUTSTANDING_CHECKS', amount: 300, reference: 'CHK-445', note: 'Payroll run 28 Feb', resolved: false },
      { id: 'item-demo-2', category: 'DEPOSITS_IN_TRANSIT', amount: 200, reference: 'DEP-221', note: 'Card settlements 1 Mar', resolved: false },
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

type CreateState = { type: string; externalBalance: string; controlAccountId: string };
type ItemState = { category: string; amount: string; reference: string; note: string };

type ReconciliationApiRecord = Partial<AuditReconciliation> & {
  id: string;
  gl_balance?: number | string | null;
  external_balance?: number | string | null;
  difference?: number | string | null;
  items?: Array<Partial<AuditReconciliation['items'][number]>>;
};

function normalizeReconciliations(records: ReconciliationApiRecord[]): AuditReconciliation[] {
  return (records ?? []).map((rec) => {
    const {
      id,
      org_id = '',
      entity_id = '',
      period_id = '',
      type = 'BANK',
      control_account_id = null,
      prepared_by_user_id = null,
      reviewed_by_user_id = null,
      status = 'DRAFT',
      closed_at = null,
      schedule_document_id = null,
      created_at = new Date().toISOString(),
      updated_at = new Date().toISOString(),
      gl_balance,
      external_balance,
      difference,
      items = [],
    } = rec;

    const toNumber = (value: number | string | null | undefined) =>
      typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0;

    return {
      id,
      org_id,
      entity_id,
      period_id,
      type,
      control_account_id,
      prepared_by_user_id,
      reviewed_by_user_id,
      status,
      closed_at,
      schedule_document_id,
      created_at,
      updated_at,
      gl_balance: toNumber(gl_balance),
      external_balance: toNumber(external_balance),
      difference: toNumber(difference),
      items: items.map((item) => ({
        id: item.id ?? crypto.randomUUID(),
        category: item.category ?? 'OTHER',
        amount: toNumber(item.amount),
        reference: item.reference ?? null,
        note: item.note ?? null,
        resolved: Boolean(item.resolved),
      })),
    };
  });
}

const reconciliationTypes = ['BANK', 'AR', 'AP', 'GRNI', 'PAYROLL', 'OTHER'];
const itemCategories = ['OUTSTANDING_CHECKS', 'DEPOSITS_IN_TRANSIT', 'UNIDENTIFIED', 'OTHER'];

function formatCurrencyUSD(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0);
}

function ReconciliationsWorkspace() {
  const [mode, setMode] = useState<'demo' | 'live'>('live'); // default to live in db mode
  const [orgId, setOrgId] = useState('demo-org');
  const [engagementId, setEngagementId] = useState('demo-engagement');
  const [entityId, setEntityId] = useState('demo-entity');
  const [periodId, setPeriodId] = useState('demo-period');
  const [userId, setUserId] = useState('demo-user');

  const [reconciliations, setReconciliations] = useState<AuditReconciliation[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'info' | 'success' | 'error' | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [createState, setCreateState] = useState<CreateState>({
    type: 'BANK',
    externalBalance: '0',
    controlAccountId: '',
  });
  const [itemState, setItemState] = useState<ItemState>({
    category: 'OUTSTANDING_CHECKS',
    amount: '0',
    reference: '',
    note: '',
  });
  const [closingDocId, setClosingDocId] = useState('');

  const selectedReconciliation = useMemo(
    () => reconciliations.find((rec) => rec.id === selectedId) ?? null,
    [reconciliations, selectedId],
  );

  useEffect(() => {
    const controller = new AbortController();

    const primeDemo = () => {
      setReconciliations(demoReconcilations);
      setSelectedId(demoReconcilations[0]?.id ?? '');
      setStatusMessage('Showing deterministic demo data. Switch to live mode to pull reconciliations from Supabase.');
      setStatusTone('info');
    };

    const fetchLive = async () => {
      if (!orgId || !engagementId || !entityId || !periodId) {
        setStatusMessage('Provide organisation, engagement, entity, and period identifiers to load live reconciliations.');
        setStatusTone('info');
        return;
      }
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
        setSelectedId((prev) => (normalised?.some((rec) => rec.id === prev) ? prev : normalised?.[0]?.id ?? ''));
        setStatusMessage(normalised?.length ? 'Reconciliations loaded from Supabase.' : 'No reconciliations recorded for this period.');
        setStatusTone(normalised?.length ? 'success' : 'info');
      } catch (error) {
        if (!controller.signal.aborted) {
          const message = error instanceof Error ? error.message : 'Unable to fetch reconciliations';
          setFetchError(message);
          setStatusMessage('Fell back to last known data.');
          setStatusTone('error');
        }
      } finally {
        setLoading(false);
      }
    };

    if (mode === 'demo') {
      primeDemo();
    } else {
      void fetchLive();
    }

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
    setSelectedId((prev) => (normalised?.some((rec) => rec.id === prev) ? prev : normalised?.[0]?.id ?? ''));
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
      if (!response.ok) throw new Error(body.error ?? 'Failed to create reconciliation');
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
      if (!response.ok) throw new Error(body.error ?? 'Failed to add reconciliation item');
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
      if (!response.ok) throw new Error(body.error ?? 'Failed to close reconciliation');
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

  const totalOutstanding = useMemo(() => {
    if (!selectedReconciliation) return 0;
    return selectedReconciliation.items
      .filter((item) => !item.resolved)
      .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  }, [selectedReconciliation]);

  const differenceClass = (value: number) => {
    if (Math.abs(value) < 0.01) return 'text-emerald-600';
    if (value > 0) return 'text-amber-600';
    return 'text-destructive';
  };

  return (
    <section className="space-y-6 p-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Reconciliation workbench</h2>
        <p className="text-sm text-slate-600">
          Capture supporting schedules for bank, AR/AP, and other reconciliations. Outstanding items roll forward to the
          misstatement evaluation workflow when differences remain.
        </p>
        <div className="text-xs text-amber-700">
          Mode: <strong>db</strong> (toggle below to demo)
        </div>
      </header>

      <div className="grid gap-4 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === 'demo' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
            onClick={() => setMode('demo')}
          >
            Demo data
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === 'live' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
            onClick={() => setMode('live')}
          >
            Live Supabase
          </button>
          {fetchError && <span className="text-xs text-destructive">{fetchError}</span>}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <label className="flex flex-col text-xs text-slate-600">
            Organisation ID
            <input className="mt-1 rounded border px-2 py-1" value={orgId} onChange={(e) => setOrgId(e.target.value)} placeholder="org UUID" />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Engagement ID
            <input className="mt-1 rounded border px-2 py-1" value={engagementId} onChange={(e) => setEngagementId(e.target.value)} placeholder="engagement UUID" />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Entity ID
            <input className="mt-1 rounded border px-2 py-1" value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="client/entity UUID" />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            Period ID
            <input className="mt-1 rounded border px-2 py-1" value={periodId} onChange={(e) => setPeriodId(e.target.value)} placeholder="close period UUID" />
          </label>
          <label className="flex flex-col text-xs text-slate-600">
            User ID
            <input className="mt-1 rounded border px-2 py-1" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="prepared by user UUID" />
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
            <p className="mt-1 text-xs text-slate-500">
              Specify control area and balances. GL balance is fetched automatically when a control account is provided.
            </p>
            <form className="mt-3 space-y-3" onSubmit={handleCreate}>
              <label className="flex flex-col text-xs text-slate-600">
                Type
                <select
                  className="mt-1 rounded border px-2 py-1"
                  value={createState.type}
                  onChange={(e) => setCreateState((prev) => ({ ...prev, type: e.target.value }))}
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
                  onChange={(e) => setCreateState((prev) => ({ ...prev, controlAccountId: e.target.value }))}
                  placeholder="ledger account UUID"
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                External balance
                <input
                  className="mt-1 rounded border px-2 py-1"
                  value={createState.externalBalance}
                  onChange={(e) => setCreateState((prev) => ({ ...prev, externalBalance: e.target.value }))}
                  type="number"
                  step="0.01"
                />
              </label>
              <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={loading}>
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
                    onChange={(e) => setItemState((prev) => ({ ...prev, category: e.target.value }))}
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
                    onChange={(e) => setItemState((prev) => ({ ...prev, amount: e.target.value }))}
                    type="number"
                    step="0.01"
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Reference
                  <input
                    className="mt-1 rounded border px-2 py-1"
                    value={itemState.reference}
                    onChange={(e) => setItemState((prev) => ({ ...prev, reference: e.target.value }))}
                    placeholder="e.g. CHK-123"
                  />
                </label>
                <label className="flex flex-col text-xs text-slate-600">
                  Note
                  <textarea
                    className="mt-1 rounded border px-2 py-1"
                    rows={2}
                    value={itemState.note}
                    onChange={(e) => setItemState((prev) => ({ ...prev, note: e.target.value }))}
                  />
                </label>
                <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={loading}>
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
                  <div className="mt-1 text-xs text-slate-500">
                    GL {formatCurrencyUSD(rec.gl_balance)} vs external {formatCurrencyUSD(rec.external_balance)}
                  </div>
                  <div className={`mt-1 text-xs font-medium ${differenceClass(rec.difference)}`}>
                    Difference {formatCurrencyUSD(rec.difference)} • Outstanding items{` `}
                    {rec.items.filter((item) => !item.resolved).length}
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
                      {formatCurrencyUSD(selectedReconciliation.difference)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="w-48 rounded border px-2 py-1 text-xs"
                    placeholder="Schedule document ID (optional)"
                    value={closingDocId}
                    onChange={(e) => setClosingDocId(e.target.value)}
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
                  <div className="text-slate-900">{formatCurrencyUSD(selectedReconciliation.gl_balance)}</div>
                </div>
                <div className="rounded border bg-slate-50 p-3">
                  <div className="font-semibold text-slate-800">External balance</div>
                  <div className="text-slate-900">{formatCurrencyUSD(selectedReconciliation.external_balance)}</div>
                </div>
                <div className="rounded border bg-slate-50 p-3">
                  <div className="font-semibold text-slate-800">Outstanding difference</div>
                  <div className={`font-semibold ${differenceClass(selectedReconciliation.difference)}`}>
                    {formatCurrencyUSD(selectedReconciliation.difference)}
                  </div>
                </div>
                <div className="rounded border bg-slate-50 p-3">
                  <div className="font-semibold text-slate-800">Open adjustments</div>
                  <div className={`font-semibold ${differenceClass(totalOutstanding)}`}>{formatCurrencyUSD(totalOutstanding)}</div>
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
                        <td className={`py-1 ${differenceClass(item.amount)}`}>{formatCurrencyUSD(item.amount)}</td>
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
  );
}
