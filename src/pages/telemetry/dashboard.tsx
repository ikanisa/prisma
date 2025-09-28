import { useEffect, useMemo, useState } from 'react';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const [syncing, setSyncing] = useState(false);

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

  const coverageByModule = useMemo(() => {
    if (!summaryQuery.data?.coverage) return [];
    return summaryQuery.data.coverage.sort((a, b) => a.module.localeCompare(b.module));
  }, [summaryQuery.data?.coverage]);

  const slaByModule = useMemo(() => {
    if (!summaryQuery.data?.serviceLevels) return [];
    return summaryQuery.data.serviceLevels.sort((a, b) => a.module.localeCompare(b.module));
  }, [summaryQuery.data?.serviceLevels]);

  const refusalEvents = summaryQuery.data?.refusals ?? [];

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
    </div>
  );
}
