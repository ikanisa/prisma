'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ControlTestRun, SamplingAttributeResult } from '../../../lib/audit/types';

interface RunsResponse {
  runs: ControlTestRun[];
  error?: string;
}

interface RunResponse {
  run: ControlTestRun;
  error?: string;
}

type RetryState = Record<string, boolean>;

type StatusBadgeVariant = 'default' | 'warning' | 'danger';

export default function AuditControlsWorkspace() {
  const [runs, setRuns] = useState<ControlTestRun[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<RetryState>({});

  const loadRuns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/controls/test/run', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      const payload = (await response.json()) as RunsResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to fetch control test runs');
      }
      setRuns(Array.isArray(payload.runs) ? payload.runs : []);
    } catch (fetchError) {
      setError((fetchError as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const retryableRuns = useMemo(() => new Set(runs.filter(run => run.status !== 'completed').map(run => run.id)), [runs]);

  const handleRetry = useCallback(async (run: ControlTestRun) => {
    setRetrying(prev => ({ ...prev, [run.id]: true }));
    setError(null);
    try {
      const response = await fetch('/api/controls/test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: run.id,
          controlId: run.controlId,
          testPlanId: run.testPlanId,
          attributes: run.attributes.map(attribute => ({
            attributeKey: attribute.attributeKey,
            population: attribute.population,
            description: attribute.description,
          })),
        }),
      });
      const payload = (await response.json()) as RunResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to retry sampling');
      }
      setRuns(previous => previous.map(existing => (existing.id === run.id ? payload.run : existing)));
    } catch (retryError) {
      setError((retryError as Error).message);
    } finally {
      setRetrying(prev => ({ ...prev, [run.id]: false }));
    }
  }, []);

  return (
    <main className="space-y-6 p-6" aria-labelledby="audit-controls-heading">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 id="audit-controls-heading" className="text-2xl font-semibold">
            Audit Controls Sampling
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor Sampling C1 execution across your ITGC control tests and retry failed pulls.
          </p>
        </div>
        <button
          type="button"
          onClick={loadRuns}
          className="rounded-md border border-primary px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10"
        >
          Refresh
        </button>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading sampling runs…</p>
      ) : runs.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="space-y-4" aria-label="Sampling runs">
          {runs.map(run => (
            <article key={run.id} className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Control {run.controlId}</h2>
                  <p className="text-sm text-muted-foreground">
                    Test plan <span className="font-medium">{run.testPlanId}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested {new Date(run.requestedAt).toLocaleString()} • Last updated {new Date(run.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <StatusBadge status={run.status} />
                  <a
                    href={run.samplePlanUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary underline"
                  >
                    View sample plan ({run.samplePlanRef})
                  </a>
                  {retryableRuns.has(run.id) ? (
                    <button
                      type="button"
                      onClick={() => handleRetry(run)}
                      disabled={retrying[run.id]}
                      className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {retrying[run.id] ? 'Retrying…' : 'Retry sampling'}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Attribute</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Samples</th>
                      <th className="px-3 py-2">Population</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.attributes.map(attribute => (
                      <AttributeRow key={`${run.id}-${attribute.attributeKey}`} attribute={attribute} />
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      No sampling runs yet. Trigger a control test to see Sampling C1 activity.
    </div>
  );
}

function StatusBadge({ status }: { status: ControlTestRun['status'] }) {
  const { label, variant } = useMemo(() => describeStatus(status), [status]);
  const styles: Record<StatusBadgeVariant, string> = {
    default: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    danger: 'bg-destructive/10 text-destructive border border-destructive/40',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${styles[variant]}`}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

function describeStatus(status: ControlTestRun['status']): { label: string; variant: StatusBadgeVariant } {
  switch (status) {
    case 'completed':
      return { label: 'Sampling complete', variant: 'default' };
    case 'partial':
      return { label: 'Partial coverage', variant: 'warning' };
    case 'failed':
    default:
      return { label: 'Sampling failed', variant: 'danger' };
  }
}

function AttributeRow({ attribute }: { attribute: SamplingAttributeResult }) {
  const { label, variant } = describeAttributeStatus(attribute.status);
  const styles: Record<StatusBadgeVariant, string> = {
    default: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    danger: 'bg-destructive/10 text-destructive border border-destructive/40',
  };

  return (
    <tr className="border-b last:border-0">
      <td className="px-3 py-2 font-medium">{attribute.attributeKey}</td>
      <td className="px-3 py-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${styles[variant]}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {label}
        </span>
      </td>
      <td className="px-3 py-2">
        {attribute.status === 'sampled' ? `${attribute.sampleSize}/${attribute.population}` : '0'}
      </td>
      <td className="px-3 py-2">{attribute.population}</td>
      <td className="px-3 py-2 text-xs text-muted-foreground">
        {attribute.status === 'failed'
          ? attribute.error ?? 'Sampling failed'
          : attribute.samples.length > 0
            ? attribute.samples.map(sample => sample.description).join(', ')
            : 'Ready for execution'}
      </td>
    </tr>
  );
}

function describeAttributeStatus(status: SamplingAttributeResult['status']): { label: string; variant: StatusBadgeVariant } {
  if (status === 'sampled') {
    return { label: 'Sampled', variant: 'default' };
  }
  return { label: 'Failed', variant: 'danger' };
}
