import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

interface CoverageRow {
  module: string;
  metric: string;
  coverage_ratio: number | null;
  measured_value: number;
  population: number;
  computed_at: string;
  period_start: string;
  period_end: string;
}

interface SlaRow {
  module: string;
  workflow_event: string;
  status: string;
  open_breaches: number;
  target_hours: number;
  computed_at: string;
}

interface NpsRow {
  score: number;
  feedback?: string | null;
  submitted_at: string;
}

interface AnalyticsOverviewPayload {
  traceId: string;
  coverage: CoverageRow[];
  slas: SlaRow[];
  jobs: {
    summary: Record<string, number>;
    totalRuns: number;
    averageDurationSeconds: number | null;
  };
  nps: {
    score: number | null;
    promoters: number;
    passives: number;
    detractors: number;
    responses: NpsRow[];
  };
}

export default function AnalyticsOverviewPage() {
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();

  const analyticsQuery = useQuery({
    queryKey: ['analytics-overview', currentOrg?.id],
    enabled: Boolean(currentOrg?.id),
    queryFn: async () => {
      if (!currentOrg?.id) throw new Error('Missing organization context');
      const response = await fetch(`/api/analytics/overview?orgId=${currentOrg.id}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Failed to load analytics overview');
      }
      return (await response.json()) as AnalyticsOverviewPayload;
    },
  });

  const coverageSeries = useMemo(() => {
    if (!analyticsQuery.data?.coverage) return [];
    return [...analyticsQuery.data.coverage]
      .reverse()
      .map((row) => ({
        module: row.module,
        coverage: Number(
          ((row.coverage_ratio ?? (row.population ? row.measured_value / row.population : 0)) * 100).toFixed(1),
        ),
        computed_at: row.computed_at,
      }));
  }, [analyticsQuery.data?.coverage]);

  const npsDistribution = useMemo(() => {
    if (!analyticsQuery.data?.nps) return [];
    const { promoters, passives, detractors } = analyticsQuery.data.nps;
    return [
      { bucket: 'Promoters', count: promoters, fill: '#16a34a' },
      { bucket: 'Passives', count: passives, fill: '#60a5fa' },
      { bucket: 'Detractors', count: detractors, fill: '#f97316' },
    ];
  }, [analyticsQuery.data?.nps]);

  const loading = analyticsQuery.isLoading;
  const error = analyticsQuery.isError ? (analyticsQuery.error as Error) : null;

  if (error) {
    toast({ title: 'Analytics unavailable', description: error.message, variant: 'destructive' });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" /> Advanced Analytics
          </h1>
          <p className="text-muted-foreground">
            Combined telemetry, automation, and NPS instrumentation with trace IDs for auditability.
          </p>
          {analyticsQuery.data?.traceId ? (
            <p className="text-xs text-muted-foreground mt-2">Trace ID: {analyticsQuery.data.traceId}</p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics overview…
        </div>
      ) : null}

      {analyticsQuery.data && (
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,380px)_1fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Net Promoter Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="px-3 py-1 text-base">
                    {analyticsQuery.data.nps.score ?? 'n/a'}
                  </Badge>
                  <div className="text-muted-foreground">
                    <p className="font-medium">NPS (last 30 responses)</p>
                    <p>{analyticsQuery.data.nps.responses.length} responses captured</p>
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer>
                    <BarChart data={npsDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bucket" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count">
                        {npsDistribution.map((entry) => (
                          <Cell key={entry.bucket} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ScrollArea className="h-32 rounded-md border border-dashed">
                  <div className="p-3 space-y-2 text-sm">
                    {analyticsQuery.data.nps.responses.length === 0 ? (
                      <p className="text-muted-foreground">No structured feedback captured yet.</p>
                    ) : (
                      analyticsQuery.data.nps.responses.map((response, index) => (
                        <div key={`${response.submitted_at}-${index}`} className="rounded-md bg-muted/50 p-2">
                          <p className="font-medium">Score {response.score}</p>
                          {response.feedback ? (
                            <p className="text-xs text-muted-foreground">{response.feedback}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">No comment provided.</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automation job health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(analyticsQuery.data.jobs.summary).map(([status, count]) => (
                    <Badge key={status} variant="outline">
                      {status}: {count}
                    </Badge>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  Average duration:{' '}
                  {analyticsQuery.data.jobs.averageDurationSeconds !== null
                    ? `${analyticsQuery.data.jobs.averageDurationSeconds.toFixed(1)}s`
                    : 'n/a'}
                </p>
                <p className="text-muted-foreground">
                  Total runs analysed: {analyticsQuery.data.jobs.totalRuns}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Coverage trends</CardTitle>
            </CardHeader>
            <CardContent className="h-[360px]">
              {coverageSeries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No coverage metrics recorded.</p>
              ) : (
                <ResponsiveContainer>
                  <LineChart data={coverageSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="module" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="coverage" name="Coverage %" stroke="#2563eb" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {analyticsQuery.data?.slas?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>SLA spotlight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {analyticsQuery.data.slas.map((sla) => (
                <div key={`${sla.module}-${sla.workflow_event}`} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{sla.module}</p>
                      <p className="text-xs text-muted-foreground">{sla.workflow_event}</p>
                    </div>
                    <Badge variant={sla.status === 'ON_TRACK' ? 'outline' : sla.status === 'BREACHED' ? 'destructive' : 'secondary'}>
                      {sla.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {sla.open_breaches} open breaches • Target {sla.target_hours}h
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
