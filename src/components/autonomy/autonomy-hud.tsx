import { ShieldCheck, AlertTriangle, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AuditApprovalsBanner } from '@/components/audit/approvals-banner';
import { useOrganizations } from '@/hooks/use-organizations';
import { useAutonomyStatus } from '@/hooks/use-autonomy-status';

function AutonomySkeleton() {
  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-3" role="status" aria-live="polite">
      {[0, 1, 2].map((index) => (
        <Card key={index} className="glass">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AutonomyHud() {
  const { currentOrg } = useOrganizations();
  const statusQuery = useAutonomyStatus(currentOrg?.slug);

  if (!currentOrg) {
    return null;
  }

  if (statusQuery.isLoading) {
    return <AutonomySkeleton />;
  }

  if (statusQuery.isError || !statusQuery.data) {
    return (
      <div className="mb-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Autonomy status unavailable</AlertTitle>
          <AlertDescription>We could not load the latest autonomy controls. Try refreshing the page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { autonomy, evidence, approvals, suggestions, autopilot } = statusQuery.data;

  const allowedJobLabels = useMemo(() => {
    if (!autonomy.allowedJobs?.length) {
      return ['Manual supervision required for all autopilot runs'];
    }
    return autonomy.allowedJobs.map((entry) => entry.label || entry.kind);
  }, [autonomy.allowedJobs]);

  const evidenceHealthy = evidence.open === 0;
  const pendingApprovals = approvals.pending ?? 0;
  const nextAutopilot = autopilot?.next as Record<string, unknown> | null;
  const domainSnapshots = useMemo(() => {
    const domains = (autopilot as Record<string, unknown> | undefined)?.domains;
    if (!Array.isArray(domains)) {
      return [] as Array<Record<string, unknown>>;
    }
    return domains as Array<Record<string, unknown>>;
  }, [autopilot]);

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-3" aria-label="Autonomy controller status">
      <Card className="glass border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Autonomy level
          </CardTitle>
          <Badge variant="secondary">{autonomy.level}</Badge>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">{autonomy.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Floor {autonomy.floor} · Ceiling {autonomy.ceiling}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Allowed autopilot jobs</p>
            <ul className="mt-2 space-y-1">
              {allowedJobLabels.map((label) => (
                <li key={label} className="text-xs text-muted-foreground">
                  • {label}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-emerald-200/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Evidence & telemetry
          </CardTitle>
          <Badge variant={evidenceHealthy ? 'default' : 'destructive'}>
            {evidenceHealthy ? 'All clear' : `${evidence.open} alerts`}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {evidenceHealthy ? (
            <p className="text-muted-foreground">
              Deterministic manifests are present for recent autopilot activity. Continue to link evidence as documents arrive.
            </p>
          ) : (
            <div className="space-y-2">
              {evidence.alerts.slice(0, 3).map((alert) => (
                <Alert key={alert.id} variant="destructive">
                  <AlertTitle>{alert.message ?? 'Attention required'}</AlertTitle>
                  <AlertDescription className="text-xs">
                    {alert.type ?? 'Telemetry alert'} · {alert.severity ?? 'CRITICAL'}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          {nextAutopilot ? (
            <div className="rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-3 text-xs text-emerald-700">
              <p className="font-semibold">Next autopilot run</p>
              <p className="mt-1">
                {(nextAutopilot.kind as string | undefined)?.replace(/_/g, ' ').toUpperCase() || 'Scheduled run'}
              </p>
              {nextAutopilot.scheduledAt ? (
                <p className="text-muted-foreground">
                  Scheduled {String(nextAutopilot.scheduledAt)}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-muted/40 p-3 text-xs text-muted-foreground">
              <Loader2 className="mr-2 inline h-3 w-3 animate-spin" />
              No autopilot runs queued.
            </div>
          )}
          {domainSnapshots.length ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Automation coverage</p>
              {domainSnapshots.map((domain) => {
                const label = (domain.label as string | undefined) ?? String(domain.domain ?? '').replace(/_/g, ' ').toUpperCase();
                const summary = domain.summary as string | undefined;
                const approvalsInfo = domain.approvals as Record<string, unknown> | undefined;
                const telemetryInfo = domain.telemetry as Record<string, unknown> | undefined;
                const runInfo = domain.run as Record<string, unknown> | undefined;
                const steps = (runInfo?.steps as Record<string, unknown> | undefined) ?? {};
                const pendingApprovals = (approvalsInfo?.pending as number | undefined) ?? 0;
                const openAlerts = (telemetryInfo?.open as number | undefined) ?? 0;
                const remainingSteps = (steps.remaining as number | undefined) ?? 0;
                return (
                  <div key={label} className="rounded-md border border-emerald-200/40 bg-background/60 p-3 text-xs shadow-sm">
                    <p className="font-semibold text-emerald-700">{label}</p>
                    {summary ? <p className="mt-1 text-muted-foreground">{summary}</p> : null}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] uppercase text-muted-foreground">
                      <span>{pendingApprovals} approvals pending</span>
                      <span>·</span>
                      <span>{remainingSteps} steps remaining</span>
                      <span>·</span>
                      <span>{openAlerts} alerts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="glass border-secondary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-secondary" />
            Approvals & next steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <AuditApprovalsBanner />
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Pending approvals</p>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={Math.min(100, pendingApprovals ? 100 - Math.min(pendingApprovals * 10, 100) : 100)} />
              <Badge variant={pendingApprovals ? 'outline' : 'default'}>{pendingApprovals}</Badge>
            </div>
            {approvals.items.slice(0, 3).map((item) => (
              <p key={item.id} className="mt-1 text-xs text-muted-foreground">
                {item.action ?? 'Action'} · {item.entityType ?? 'Entity'}
              </p>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Suggested actions</p>
            <div className="mt-2 flex flex-col gap-2">
              {suggestions.length ? (
                suggestions.map((suggestion, index) => (
                  <Button key={`${suggestion.workflow}-${index}`} variant="outline" className="justify-start gap-2">
                    <Sparkles className="h-3 w-3" />
                    <span className="truncate">{suggestion.label ?? 'Workflow step'}</span>
                  </Button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Assistant will surface actions once workflows are available.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
