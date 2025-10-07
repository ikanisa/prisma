import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
import { getReleaseControlSettings } from '@/lib/system-config';

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

type ReleaseControlState = 'satisfied' | 'pending' | 'changes_required' | 'not_applicable' | 'unknown';

interface ReleaseControlActionSummary {
  state: ReleaseControlState;
  total: number;
  approved: number;
  pending: number;
  rejected?: number;
  cancelled?: number;
  kinds?: string[];
}

interface ReleaseControlArchiveSummary {
  state: ReleaseControlState;
  sha256?: string | null;
  updatedAt?: string | null;
  expectedDocuments: string[];
}

interface ReleaseControlEnvironmentAutonomy {
  state: ReleaseControlState;
  orgLevel: string;
  minimumLevel: string;
  workerEnabled: boolean;
  criticalRoles: string[];
  ceilingShortfalls: Array<{ membershipId?: string; role?: string; ceiling?: string }>;
  flags: string[];
}

interface ReleaseControlEnvironmentMfa {
  state: ReleaseControlState | 'stale';
  channel: string;
  withinSeconds: number;
  lastChallengeAt?: string | null;
  lastChallengeAgeSeconds?: number | null;
}

interface ReleaseControlEnvironmentTelemetry {
  state: ReleaseControlState;
  open: number;
  maxOpen: number;
  severityThreshold: string;
  alerts: Array<{ id?: string; severity?: string; alertType?: string; createdAt?: string }>;
  severityFilter: string[];
}

interface ReleaseControlEnvironmentSummary {
  autonomy: ReleaseControlEnvironmentAutonomy;
  mfa: ReleaseControlEnvironmentMfa;
  telemetry: ReleaseControlEnvironmentTelemetry;
}

interface ReleaseControlsResponse {
  requirements: {
    approvals_required: string[];
    archive: { manifest_hash: string; include_docs: string[] };
  };
  status: {
    actions: Record<string, ReleaseControlActionSummary>;
    archive: ReleaseControlArchiveSummary;
  };
  environment?: ReleaseControlEnvironmentSummary;
  generatedAt: string;
}

export default function AnalyticsOverviewPage() {
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const releaseRequirements = useMemo(() => getReleaseControlSettings(), []);

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

  const releaseControlsQuery = useQuery<ReleaseControlsResponse>({
    queryKey: ['release-controls', currentOrg?.slug],
    enabled: Boolean(currentOrg?.slug),
    queryFn: async () => {
      if (!currentOrg?.slug) throw new Error('Missing organization context');
      const response = await fetch('/api/release-controls/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgSlug: currentOrg.slug }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Failed to load release control status');
      }
      return (await response.json()) as ReleaseControlsResponse;
    },
  });

  const stateLabels: Record<ReleaseControlState, string> = {
    satisfied: 'Ready',
    pending: 'Pending',
    changes_required: 'Needs attention',
    not_applicable: 'Not applicable',
    unknown: 'Unknown',
  };

  const stateStyles: Record<ReleaseControlState, string> = {
    satisfied: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
    pending: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
    changes_required: 'border-rose-500/30 bg-rose-500/10 text-rose-700',
    not_applicable: 'border-muted text-muted-foreground',
    unknown: 'border-muted text-muted-foreground',
  };

  const renderStateBadge = (state: ReleaseControlState) => (
    <Badge variant="outline" className={stateStyles[state] ?? stateStyles.unknown}>
      {stateLabels[state] ?? state}
    </Badge>
  );

  const renderEnvironmentSummary = (env: ReleaseControlEnvironmentSummary) => {
    const shortfalls = env.autonomy.ceilingShortfalls
      .map((entry) => {
        if (!entry.role) return null;
        const ceiling = entry.ceiling ?? 'L0';
        return `${entry.role}→${ceiling}`;
      })
      .filter(Boolean)
      .join(', ');
    const mfaTimestamp = env.mfa.lastChallengeAt
      ? new Date(env.mfa.lastChallengeAt).toLocaleString()
      : 'No verified challenge';
    const mfaRelative = env.mfa.lastChallengeAt
      ? formatDistanceToNow(new Date(env.mfa.lastChallengeAt), { addSuffix: true })
      : null;
    const severityFilter = env.telemetry.severityFilter?.join(', ');
    const mfaState: ReleaseControlState = env.mfa.state === 'stale' ? 'pending' : (env.mfa.state as ReleaseControlState);
    return (
      <div className="space-y-3 rounded-md border px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">Autonomy guardrails</p>
            <p className="text-xs text-muted-foreground">
              Org level {env.autonomy.orgLevel} · Minimum {env.autonomy.minimumLevel} · Worker{' '}
              {env.autonomy.workerEnabled ? 'enabled' : 'disabled'}
            </p>
            {shortfalls ? (
              <p className="mt-2 text-xs text-muted-foreground">Shortfalls: {shortfalls}</p>
            ) : null}
          </div>
          {renderStateBadge(env.autonomy.state)}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">MFA readiness</p>
            <p className="text-xs text-muted-foreground">
              Channel {env.mfa.channel} · Window {Math.round(env.mfa.withinSeconds / 3600)}h
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Last challenge: {mfaTimestamp}
              {mfaRelative ? ` (${mfaRelative})` : ''}
            </p>
            {typeof env.mfa.lastChallengeAgeSeconds === 'number' ? (
              <p className="text-xs text-muted-foreground">
                Age {Math.round(env.mfa.lastChallengeAgeSeconds / 60)}m of {Math.round(env.mfa.withinSeconds / 60)}m window
              </p>
            ) : null}
          </div>
          {renderStateBadge(mfaState)}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">Telemetry alerts</p>
            <p className="text-xs text-muted-foreground">
              {env.telemetry.open} open ≥ {env.telemetry.severityThreshold} (max {env.telemetry.maxOpen})
            </p>
            {severityFilter ? (
              <p className="text-xs text-muted-foreground">Severity filter: {severityFilter}</p>
            ) : null}
            {env.telemetry.alerts.length ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Recent: {env.telemetry.alerts.slice(0, 2).map((alert) => alert.alertType || alert.id).join(', ')}
              </p>
            ) : null}
          </div>
          {renderStateBadge(env.telemetry.state)}
        </div>
      </div>
    );
  };

  const formatActionLabel = (action: string) =>
    action
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

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
  const releaseError = releaseControlsQuery.isError ? (releaseControlsQuery.error as Error) : null;

  useEffect(() => {
    if (error) {
      toast({ title: 'Analytics unavailable', description: error.message, variant: 'destructive' });
    }
  }, [error, toast]);

  useEffect(() => {
    if (releaseError) {
      toast({ title: 'Release controls unavailable', description: releaseError.message, variant: 'destructive' });
    }
  }, [releaseError, toast]);

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

            <Card>
              <CardHeader>
                <CardTitle>Release control readiness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {releaseControlsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking release gates…
                  </div>
                ) : null}

                {releaseControlsQuery.data ? (
                  <div className="space-y-3">
                    {releaseControlsQuery.data.generatedAt ? (
                      <p className="text-xs text-muted-foreground">
                        Refreshed {formatDistanceToNow(new Date(releaseControlsQuery.data.generatedAt), { addSuffix: true })}
                      </p>
                    ) : null}
                    {Object.entries(releaseControlsQuery.data.status.actions).map(([action, summary]) => (
                      <div
                        key={action}
                        className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
                      >
                        <div>
                          <p className="font-medium capitalize">{formatActionLabel(action)}</p>
                          <p className="text-xs text-muted-foreground">
                            {summary.total > 0
                              ? `Approved ${summary.approved}/${summary.total}` +
                                (summary.pending ? ` · Pending ${summary.pending}` : '') +
                                (summary.rejected ? ` · Rejected ${summary.rejected}` : '')
                              : 'No approvals queued'}
                          </p>
                        </div>
                        {renderStateBadge(summary.state)}
                      </div>
                    ))}

                    <div className="rounded-md border px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">Archive manifest</p>
                          <p className="text-xs text-muted-foreground">
                            {releaseControlsQuery.data.status.archive.sha256
                              ? `Digest ${releaseControlsQuery.data.status.archive.sha256.slice(0, 8)}…`
                              : 'No checksum recorded'}
                          </p>
                          {releaseControlsQuery.data.status.archive.expectedDocuments.length ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Expected docs:{' '}
                              {releaseControlsQuery.data.status.archive.expectedDocuments.join(', ')}
                            </p>
                          ) : releaseRequirements.archive.includeDocs.length ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Expected docs: {releaseRequirements.archive.includeDocs.join(', ')}
                            </p>
                          ) : null}
                        </div>
                        {renderStateBadge(releaseControlsQuery.data.status.archive.state)}
                      </div>
                    </div>

                    {releaseControlsQuery.data.environment
                      ? renderEnvironmentSummary(releaseControlsQuery.data.environment)
                      : null}
                  </div>
                ) : null}

                {!releaseControlsQuery.isLoading && !releaseControlsQuery.data ? (
                  <p className="text-xs text-muted-foreground">
                    Release control telemetry is not available for this organisation yet.
                  </p>
                ) : null}
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
