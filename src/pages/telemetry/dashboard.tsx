import { useEffect, useMemo, useState } from 'react';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import { syncTelemetry } from '@/lib/telemetry-service';

interface TelemetrySummary {
  coverage: Array<{
    module: string;
    metric: string;
    measured_value: number;
    population: number;
    coverage_ratio?: number;
    period_start: string;
    period_end: string;
    computed_at: string;
  }>;
  serviceLevels: Array<{
    module: string;
    workflow_event: string;
    status: string;
    open_breaches: number;
    target_hours: number;
    computed_at: string;
  }>;
  refusals: Array<{
    module: string;
    event: string;
    reason: string | null;
    severity: string | null;
    count: number;
    occurred_at: string;
  }>;
}

interface EmbeddingScenarioSummary {
  scenario: string;
  events: number;
  approved: number;
  review: number;
  refused: number;
  tokens: number;
  promptTokens: number;
  estimatedCost: number;
  failureRate: number;
  reviewRate: number;
}

interface EmbeddingFailureRecord {
  scenario: string;
  decision: string;
  reason: string | null;
  occurredAt: string | null;
  metrics: Record<string, unknown>;
}

interface EmbeddingTelemetrySummary {
  windowHours: number;
  totals: {
    events: number;
    approved: number;
    review: number;
    refused: number;
    tokens: number;
    promptTokens: number;
    estimatedCost: number;
  };
  scenarios: EmbeddingScenarioSummary[];
  recentFailures: EmbeddingFailureRecord[];
  staleCorpora: EmbeddingFailureRecord[];
}

export default function TelemetryDashboardPage() {
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const [periodWindow, setPeriodWindow] = useState<'30d' | '90d'>('30d');

  const summaryQuery = useQuery({
    queryKey: ['telemetry-summary', currentOrg?.id, periodWindow],
    enabled: Boolean(currentOrg?.id),
    queryFn: async () => {
      if (!currentOrg?.id) throw new Error('Missing org');
      const response = await fetch(`/api/telemetry/summary?orgId=${currentOrg.id}`);
      if (!response.ok) throw new Error('Failed to load telemetry summary');
      return (await response.json()) as TelemetrySummary;
    },
  });

  const embeddingWindowHours = periodWindow === '30d' ? 24 * 30 : 24 * 90;

  const embeddingQuery = useQuery({
    queryKey: ['embedding-telemetry', currentOrg?.id, periodWindow],
    enabled: Boolean(currentOrg?.id),
    queryFn: async () => {
      if (!currentOrg?.id) throw new Error('Missing org');
      const params = new URLSearchParams({
        orgId: currentOrg.id,
        windowHours: String(embeddingWindowHours),
      });
      const response = await fetch(`/api/telemetry/embeddings?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load embedding telemetry');
      return (await response.json()) as EmbeddingTelemetrySummary;
    },
  });

  const [syncing, setSyncing] = useState(false);
  const [triggeringDelta, setTriggeringDelta] = useState(false);

  const handleSync = async () => {
    if (!currentOrg) return;
    setSyncing(true);
    try {
      await syncTelemetry({ orgSlug: currentOrg.slug, periodStart: undefined, periodEnd: undefined });
      toast({ title: 'Telemetry refreshed', description: 'Coverage and SLA data updated.' });
      summaryQuery.refetch();
    } catch (error: any) {
      toast({ title: 'Sync failed', description: error.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeltaTrigger = async () => {
    if (!currentOrg) return;
    setTriggeringDelta(true);
    try {
      const response = await fetch('/api/telemetry/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: currentOrg.id }),
      });
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const errorMessage =
          body && typeof body === 'object' && 'error' in body && typeof (body as { error?: unknown }).error === 'string'
            ? (body as { error: string }).error
            : 'Failed to trigger delta embeddings';
        throw new Error(errorMessage);
      }

      const summary =
        body && typeof body === 'object' && !Array.isArray(body)
          ? (body as Record<string, unknown>)
          : {};
      const documentsEmbedded =
        typeof summary.documentsEmbedded === 'number' ? summary.documentsEmbedded : 0;
      const policiesEmbedded =
        typeof summary.policiesEmbedded === 'number' ? summary.policiesEmbedded : 0;
      const refusals = typeof summary.refusals === 'number' ? summary.refusals : 0;
      const orgSlug = typeof summary.orgSlug === 'string' ? summary.orgSlug : currentOrg.slug;

      toast({
        title: 'Delta embeddings complete',
        description: `Org ${orgSlug} processed ${documentsEmbedded} documents · ${policiesEmbedded} policies (${refusals} refusals).`,
      });
      embeddingQuery.refetch();
    } catch (error: any) {
      toast({ title: 'Delta trigger failed', description: error.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setTriggeringDelta(false);
    }
  };

  const coverageByModule = useMemo(() => {
    if (!summaryQuery.data?.coverage) return [];
    return summaryQuery.data.coverage.sort((a, b) => a.module.localeCompare(b.module));
  }, [summaryQuery.data?.coverage]);

  const slaByModule = useMemo(() => {
    if (!summaryQuery.data?.serviceLevels) return [];
    return summaryQuery.data.serviceLevels.sort((a, b) => a.module.localeCompare(b.module));
  }, [summaryQuery.data?.serviceLevels]);

  const refusalEvents = summaryQuery.data?.refusals ?? [];
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 4,
      }),
    [],
  );

  const embeddingScenarios = useMemo(() => {
    if (!embeddingQuery.data?.scenarios) return [];
    return [...embeddingQuery.data.scenarios].sort((a, b) => b.tokens - a.tokens);
  }, [embeddingQuery.data?.scenarios]);

  const formatDateTime = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleString() : '—';

  const extractTargetId = (metrics: Record<string, unknown>) => {
    if (typeof metrics.documentId === 'string') return metrics.documentId;
    if (typeof metrics.policyVersionId === 'string') return metrics.policyVersionId;
    if (typeof metrics.document_id === 'string') return metrics.document_id;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Telemetry & Reliability</h1>
          <p className="text-muted-foreground">
            Monitor coverage ratios, SLA breaches, and refusal events across audit, tax, and accounting modules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Window</Label>
            <Select value={periodWindow} onValueChange={(value: '30d' | '90d') => setPeriodWindow(value)}>
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue placeholder="Select window" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSync} disabled={syncing || summaryQuery.isLoading || !currentOrg}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync telemetry
          </Button>
        </div>
      </div>

      {summaryQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading telemetry summary…
        </div>
      ) : summaryQuery.isError ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Failed to load telemetry data. Try syncing again or contact support if the issue persists.
          </CardContent>
        </Card>
      ) : null}

      {summaryQuery.data && (
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,380px)_1fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Coverage ratios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {coverageByModule.length === 0 ? (
                  <p className="text-muted-foreground">No coverage metrics recorded for the selected window.</p>
                ) : (
                  coverageByModule.map((entry) => {
                    const ratio = entry.coverage_ratio ?? (entry.population ? entry.measured_value / entry.population : 0);
                    return (
                      <div key={`${entry.module}-${entry.metric}`} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{entry.module}</p>
                            <p className="text-xs text-muted-foreground">{entry.metric}</p>
                          </div>
                          <Badge variant={ratio >= 0.8 ? 'outline' : 'destructive'}>
                            {(ratio * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {entry.measured_value.toLocaleString()} / {entry.population.toLocaleString()} (period {entry.period_start} → {entry.period_end})
                        </p>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SLA status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {slaByModule.length === 0 ? (
                  <p className="text-muted-foreground">No SLA records found for this period.</p>
                ) : (
                  slaByModule.map((entry) => (
                    <div key={`${entry.module}-${entry.workflow_event}`} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{entry.module}</p>
                          <p className="text-xs text-muted-foreground">{entry.workflow_event}</p>
                        </div>
                        <Badge variant={entry.status === 'ON_TRACK' ? 'outline' : entry.status === 'BREACHED' ? 'destructive' : 'secondary'}>
                          {entry.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Target {entry.target_hours}h • Open breaches: {entry.open_breaches}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Refusal & exception log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {refusalEvents.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No refusal events recorded in the selected window.</p>
              ) : (
                <ScrollArea className="h-[420px]">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="px-4 py-2 text-left">Module</th>
                        <th className="px-4 py-2 text-left">Event</th>
                        <th className="px-4 py-2 text-left">Message</th>
                        <th className="px-4 py-2 text-right">Count</th>
                        <th className="px-4 py-2 text-left">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refusalEvents.map((row) => (
                        <tr key={`${row.module}-${row.event}-${row.occurred_at}`} className="border-b border-border/60">
                          <td className="px-4 py-2 font-medium">{row.module}</td>
                          <td className="px-4 py-2">{row.event}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{row.reason ?? '—'}</td>
                          <td className="px-4 py-2 text-right">{row.count}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(row.occurred_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Embedding telemetry</CardTitle>
            <CardDescription>
              Track nightly re-embedding progress, token spend, and stale corpus signals across the knowledge base.
            </CardDescription>
          </div>
          <Button
            onClick={handleDeltaTrigger}
            disabled={triggeringDelta || !currentOrg}
            variant="secondary"
          >
            {triggeringDelta ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Trigger delta run
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {embeddingQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading embedding telemetry…
            </div>
          ) : embeddingQuery.isError ? (
            <p className="text-sm text-muted-foreground">
              Failed to load embedding telemetry. Retry once the scheduler has run or verify the delta endpoint secret.
            </p>
          ) : embeddingQuery.data ? (
            (() => {
              const totals = embeddingQuery.data.totals ?? {
                events: 0,
                tokens: 0,
                promptTokens: 0,
                estimatedCost: 0,
                refused: 0,
                review: 0,
              };
              const recentFailures = embeddingQuery.data.recentFailures ?? [];
              const staleCorpora = embeddingQuery.data.staleCorpora ?? [];
              const failureRate = totals.events ? (totals.refused / totals.events) * 100 : 0;
              const reviewRate = totals.events ? (totals.review / totals.events) * 100 : 0;
              return (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Events analysed</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {totals.events.toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Window {embeddingQuery.data.windowHours}h
                      </p>
                    </div>
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Token usage</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {totals.tokens.toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Prompt tokens {totals.promptTokens.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estimated spend</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {currencyFormatter.format(totals.estimatedCost)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Based on model pricing per 1K tokens</p>
                    </div>
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Failure share</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {failureRate.toFixed(1)}%
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Review {reviewRate.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Scenario breakdown</h3>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className="px-4 py-2 text-left">Scenario</th>
                          <th className="px-4 py-2 text-right">Events</th>
                          <th className="px-4 py-2 text-right">Tokens</th>
                          <th className="px-4 py-2 text-right">Cost</th>
                          <th className="px-4 py-2 text-right">Failures</th>
                          <th className="px-4 py-2 text-right">Reviews</th>
                        </tr>
                      </thead>
                      <tbody>
                        {embeddingScenarios.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-3 text-center text-xs text-muted-foreground">
                              No embedding events captured in this window.
                            </td>
                          </tr>
                        ) : (
                          embeddingScenarios.map((scenario) => (
                            <tr key={scenario.scenario} className="border-b border-border/60">
                              <td className="px-4 py-2 font-medium">{scenario.scenario}</td>
                              <td className="px-4 py-2 text-right">{scenario.events.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right">{scenario.tokens.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right">
                                {currencyFormatter.format(scenario.estimatedCost)}
                              </td>
                              <td className="px-4 py-2 text-right">{(scenario.failureRate * 100).toFixed(1)}%</td>
                              <td className="px-4 py-2 text-right">{(scenario.reviewRate * 100).toFixed(1)}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-border p-4">
                    <h4 className="text-sm font-semibold text-foreground">Recent failures</h4>
                    <p className="text-xs text-muted-foreground">
                      Embedding attempts refused due to downstream errors or guardrails.
                    </p>
                    <div className="mt-3 space-y-3">
                      {recentFailures.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No refusals recorded.</p>
                      ) : (
                        recentFailures.slice(0, 5).map((failure, index) => {
                          const targetId = extractTargetId(failure.metrics);
                          return (
                            <div key={`${failure.scenario}-${failure.occurredAt}-${index}`} className="rounded-md border border-border/70 p-3">
                              <p className="text-sm font-medium">{failure.scenario}</p>
                              <p className="text-xs text-muted-foreground">{failure.reason ?? 'No reason provided'}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {formatDateTime(failure.occurredAt)}
                                {targetId ? ` • Target ${targetId}` : ''}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4">
                    <h4 className="text-sm font-semibold text-foreground">Stale corpora signals</h4>
                    <p className="text-xs text-muted-foreground">
                      Review decisions that indicate missing text, download issues, or empty corpora.
                    </p>
                    <div className="mt-3 space-y-3">
                      {staleCorpora.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No review actions recorded.</p>
                      ) : (
                        staleCorpora.slice(0, 5).map((entry, index) => {
                          const targetId = extractTargetId(entry.metrics);
                          return (
                            <div key={`${entry.scenario}-${entry.occurredAt}-${index}`} className="rounded-md border border-border/70 p-3">
                              <p className="text-sm font-medium">{entry.scenario}</p>
                              <p className="text-xs text-muted-foreground">{entry.reason ?? 'Review pending manual follow-up'}</p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {formatDateTime(entry.occurredAt)}
                                {targetId ? ` • Target ${targetId}` : ''}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
                </>
              );
            })()
          ) : (
            <p className="text-sm text-muted-foreground">No embedding telemetry available for this organisation.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
