import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  AlarmClock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  PlayCircle,
  RefreshCcw,
  StopCircle,
} from 'lucide-react';

import { useOrganizations } from '@/hooks/use-organizations';
import {
  useAutopilotSchedules,
  useAutopilotJobs,
  useCreateAutopilotSchedule,
  useEnqueueAutopilotJob,
} from '@/hooks/use-autopilot';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { AutopilotJob } from '@/lib/autopilot';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  getAllowedAutopilotJobs,
  getAutonomyLevelDescription,
  getAutonomyLevels,
  getDefaultAutonomyLevel,
} from '@/lib/system-config';

type JobStatusFilter = 'all' | 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '<1s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingSeconds = seconds % 60;
  const remainingMinutes = minutes % 60;

  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (remainingMinutes) parts.push(`${remainingMinutes}m`);
  if (remainingSeconds && parts.length < 2) parts.push(`${remainingSeconds}s`);
  if (!parts.length) parts.push('<1s');
  return parts.join(' ');
}

function getStatusVariant(status: string): 'default' | 'outline' | 'destructive' | 'secondary' {
  switch (status) {
    case 'DONE':
      return 'default';
    case 'FAILED':
      return 'destructive';
    case 'RUNNING':
      return 'secondary';
    default:
      return 'outline';
  }
}

function getLastRun(job: AutopilotJob | null | undefined) {
  const payload = job?.payload ?? {};
  if (payload && typeof payload === 'object' && 'lastRun' in payload) {
    const maybeRun = (payload as Record<string, any>).lastRun;
    if (maybeRun && typeof maybeRun === 'object') {
      return maybeRun as Record<string, any>;
    }
  }
  return null;
}

function summariseRun(job: AutopilotJob): string {
  const lastRun = getLastRun(job);
  if (!lastRun) {
    return job.status === 'PENDING' ? 'Queued – awaiting execution' : 'No summary captured yet';
  }
  if (typeof lastRun.error === 'string' && lastRun.error) {
    return lastRun.error;
  }
  const result = lastRun.result as Record<string, unknown> | undefined;
  if (result) {
    if (typeof result.message === 'string') return result.message;
    if (typeof result.summary === 'string') return result.summary;
    const firstValue = Object.values(result)[0];
    if (typeof firstValue === 'string' || typeof firstValue === 'number') {
      return `${Object.keys(result)[0]}: ${String(firstValue)}`;
    }
  }
  if (typeof lastRun.status === 'string') {
    return `Run ${lastRun.status}`;
  }
  return 'Completed run';
}

const AUTOPILOT_PRESETS: Array<{ kind: string; label: string; cron: string; description: string }> = [
  {
    kind: 'extract_documents',
    label: 'Nightly document ingestion',
    cron: '0 2 * * *',
    description: 'Run OCR/classification for any new uploads every night at 02:00 UTC.',
  },
  {
    kind: 'remind_pbc',
    label: 'Daily PBC reminder',
    cron: '30 8 * * 1-5',
    description: 'Send weekday reminders to outstanding PBC owners.',
  },
  {
    kind: 'refresh_analytics',
    label: 'Weekly analytics refresh',
    cron: '0 6 * * MON',
    description: 'Refresh analytics dashboards every Monday morning.',
  },
];

export default function AutopilotPage() {
  const { currentOrg } = useOrganizations();
  const [statusFilter, setStatusFilter] = useState<JobStatusFilter>('all');
  const schedulesQuery = useAutopilotSchedules();
  const jobsQuery = useAutopilotJobs(statusFilter === 'all' ? undefined : statusFilter);
  const createSchedule = useCreateAutopilotSchedule();
  const enqueueJob = useEnqueueAutopilotJob();
  const { toast } = useToast();
  const defaultAutonomyLevel = getDefaultAutonomyLevel();
  const orgAutonomyLevel = (currentOrg?.autonomy_level as string | undefined) ?? defaultAutonomyLevel;
  const allowedJobs = useMemo(() => getAllowedAutopilotJobs(orgAutonomyLevel), [orgAutonomyLevel]);
  const autonomyDescription = getAutonomyLevelDescription(orgAutonomyLevel);
  const autonomyLevels = useMemo(() => getAutonomyLevels(), []);
  const [kind, setKind] = useState(() => allowedJobs[0] ?? 'extract_documents');
  const [cronExpression, setCronExpression] = useState('0 2 * * *');
  const [metadataText, setMetadataText] = useState(`{
  "notify": true
}`);
  const [selectedJob, setSelectedJob] = useState<AutopilotJob | null>(null);

  const autopilotEnabled = Boolean(currentOrg);
  const schedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data]);
  const jobs = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);
  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) =>
        new Date(b.finished_at ?? b.scheduled_at ?? 0).getTime() -
        new Date(a.finished_at ?? a.scheduled_at ?? 0).getTime(),
      ),
    [jobs],
  );
  const latestRuns = sortedJobs.slice(0, 6);
  const runningJobs = useMemo(() => sortedJobs.filter((job) => job.status === 'RUNNING'), [sortedJobs]);
  const failedJobs = useMemo(() => sortedJobs.filter((job) => job.status === 'FAILED'), [sortedJobs]);
  const jobCounts = useMemo(() => {
    return sortedJobs.reduce(
      (acc, job) => {
        acc.total += 1;
        acc.byStatus[job.status] = (acc.byStatus[job.status] ?? 0) + 1;
        return acc;
      },
      { total: 0, byStatus: {} as Record<string, number> },
    );
  }, [sortedJobs]);

  const preset = useMemo(() => AUTOPILOT_PRESETS.find((item) => item.kind === kind), [kind]);
  const jobLabels = useMemo(() => new Map(AUTOPILOT_PRESETS.map((item) => [item.kind, item.label])), []);
  const jobAllowed = allowedJobs.includes(kind);
  const allowedJobLabels = allowedJobs.map((job) => jobLabels.get(job) ?? job.replace(/_/g, ' ')).join(', ');

  useEffect(() => {
    if (!allowedJobs.includes(kind) && allowedJobs.length > 0) {
      const fallbackKind = allowedJobs[0];
      setKind(fallbackKind);
      const fallbackPreset = AUTOPILOT_PRESETS.find((item) => item.kind === fallbackKind);
      if (fallbackPreset) {
        setCronExpression(fallbackPreset.cron);
      }
    }
  }, [allowedJobs, kind]);

  useEffect(() => {
    if (preset && preset.cron !== cronExpression) {
      setCronExpression(preset.cron);
    }
  }, [preset]);

  if (!autopilotEnabled) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Autopilot</h1>
        <p className="mt-2 text-muted-foreground">Join or select an organisation to configure automation schedules.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Autopilot</h1>
          <p className="text-muted-foreground">
            Configure scheduled jobs and ad-hoc runs. Autopilot honours policy packs and records every action for
            auditability.
          </p>
        </div>
        <Button variant="outline" onClick={() => jobsQuery.refetch()} disabled={jobsQuery.isFetching}>
          {jobsQuery.isFetching ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Refresh jobs
        </Button>
      </header>

      <Tabs defaultValue="schedules">
        <TabsList>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="jobs">Job history</TabsTrigger>
        </TabsList>
        <TabsContent value="schedules" className="space-y-4">
          <Alert className="border-border/60 bg-muted/60">
            <AlertTitle className="flex items-center gap-2">
              <AlarmClock className="h-4 w-4 text-primary" /> Autonomy level {orgAutonomyLevel}
            </AlertTitle>
            <AlertDescription className="space-y-1 text-sm">
              <p>{autonomyDescription}</p>
              {allowedJobs.length > 0 ? (
                <p>Enabled autopilot jobs: {allowedJobLabels || 'None'}.</p>
              ) : (
                <p>Automation is paused until autonomy is raised to Suggest (L1) or above.</p>
              )}
            </AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle>Create schedule</CardTitle>
              <CardDescription>Select a policy-aligned preset or provide a custom cron expression.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="kind">Job preset</Label>
                <select
                  id="kind"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={kind}
                  onChange={(event) => setKind(event.target.value)}
                  disabled={allowedJobs.length === 0}
                >
                  {AUTOPILOT_PRESETS.map((item) => (
                    <option key={item.kind} value={item.kind} disabled={!allowedJobs.includes(item.kind)}>
                      {allowedJobs.includes(item.kind) ? item.label : `${item.label} (locked)`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {preset
                    ? preset.description
                    : 'Select a preset that matches the permitted autonomy scope to enable scheduling.'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cron">Cron expression</Label>
                <Input
                  id="cron"
                  value={cronExpression}
                  onChange={(event) => setCronExpression(event.target.value)}
                  placeholder="0 2 * * *"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="metadata">Metadata (JSON)</Label>
                <Textarea
                  id="metadata"
                  value={metadataText}
                  onChange={(event) => setMetadataText(event.target.value)}
                  rows={4}
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button
                  onClick={() => {
                    try {
                      const metadata = metadataText ? JSON.parse(metadataText) : {};
                      createSchedule.mutate({
                        kind,
                        cronExpression,
                        active: true,
                        metadata,
                      });
                    } catch (error) {
                      toast({
                        title: 'Invalid metadata',
                        description: 'Please provide valid JSON for schedule metadata.',
                        variant: 'destructive',
                      });
                    }
                  }}
                  disabled={createSchedule.isPending || !jobAllowed}
                >
                  {createSchedule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save schedule
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing schedules</CardTitle>
              <CardDescription>Review cadence, enable/disable, and adjust metadata via Supabase when needed.</CardDescription>
            </CardHeader>
            <CardContent>
              {schedulesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading schedules…
                </div>
              ) : schedules.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No schedules yet. Create one to keep data fresh automatically.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Cron</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium capitalize">{schedule.kind.replace('_', ' ')}</span>
                            <span className="text-xs text-muted-foreground">
                              {(schedule.metadata?.description as string) ?? 'Managed from UI'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{schedule.cron_expression}</TableCell>
                        <TableCell>
                          <Badge variant={schedule.active ? 'default' : 'outline'}>
                            {schedule.active ? 'Active' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {schedule.updated_at
                            ? formatDistanceToNow(new Date(schedule.updated_at), { addSuffix: true })
                            : formatDistanceToNow(new Date(schedule.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="jobs">
          <div className="mb-4 grid gap-4 lg:grid-cols-[2fr,1fr]">
            <Card className="bg-muted/50">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Activity className="h-4 w-4" /> Operations console
                  </CardTitle>
                  <CardDescription>
                    Live view of the assistant’s recent and in-flight automation runs.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(['all', 'RUNNING', 'PENDING', 'DONE', 'FAILED'] as JobStatusFilter[]).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={statusFilter === status ? 'default' : 'outline'}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status === 'all' ? 'All' : status}
                      {status === 'all' ? null : jobCounts.byStatus[status] ? (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          {jobCounts.byStatus[status]}
                        </Badge>
                      ) : null}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/60 bg-background/90 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Automation coverage</p>
                    <p className="text-2xl font-semibold">{jobCounts.total}</p>
                    <p className="text-xs text-muted-foreground">Total runs recorded</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/90 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Running now</p>
                    <p className="text-2xl font-semibold text-primary">{runningJobs.length}</p>
                    <p className="text-xs text-muted-foreground">Autopilot executing tasks</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/90 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Attention needed</p>
                    <p className="text-2xl font-semibold text-destructive">{failedJobs.length}</p>
                    <p className="text-xs text-muted-foreground">Failed runs to triage</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {latestRuns.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No executions yet. Queue a job to see the assistant’s play-by-play here.
                    </div>
                  ) : (
                    latestRuns.map((job) => {
                      const lastRun = getLastRun(job);
                      const finishedAt = lastRun?.finishedAt ?? job.finished_at ?? job.started_at ?? job.scheduled_at;
                      const iconByStatus: Record<string, JSX.Element> = {
                        DONE: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
                        FAILED: <AlertTriangle className="h-4 w-4 text-destructive" />,
                        RUNNING: <Activity className="h-4 w-4 text-primary animate-pulse" />,
                        PENDING: <Clock className="h-4 w-4 text-muted-foreground" />,
                      };
                      const statusIcon = iconByStatus[job.status] ?? <Clock className="h-4 w-4 text-muted-foreground" />;
                      return (
                        <div
                          key={job.id}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-background/90 p-3 transition hover:border-primary"
                          onClick={() => setSelectedJob(job)}
                        >
                          <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            {statusIcon}
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold capitalize">{job.kind.replace('_', ' ')}</p>
                              <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
                              {finishedAt ? (
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(finishedAt), { addSuffix: true })}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">{summariseRun(job)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <StopCircle className="h-4 w-4 text-destructive" /> Recovery queue
                </CardTitle>
                <CardDescription>
                  Autopilot alerts you whenever a run fails. Re-run or inspect the payload to resolve blockers quickly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {failedJobs.length === 0 ? (
                  <p className="text-muted-foreground">No failures on record. Autopilot is in the green.</p>
                ) : (
                  failedJobs.slice(0, 3).map((job) => {
                    const lastRun = getLastRun(job);
                    return (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => setSelectedJob(job)}
                        className="w-full rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-left transition hover:border-destructive/80"
                      >
                        <p className="text-sm font-medium capitalize text-destructive">{job.kind.replace('_', ' ')}</p>
                        <p className="text-xs text-destructive/80">
                          {typeof lastRun?.error === 'string' ? lastRun.error : 'Failure reason not captured.'}
                        </p>
                      </button>
                    );
                  })
                )}
                {failedJobs.length > 3 ? (
                  <p className="text-xs text-muted-foreground">
                    {failedJobs.length - 3} more failures in history. Filter by FAILED to review all.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent jobs</CardTitle>
              <CardDescription>Autopilot logs every action for traceability.</CardDescription>
            </CardHeader>
            <CardContent>
              {jobsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading jobs…
                </div>
              ) : sortedJobs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No jobs yet. Queue one manually or create a schedule.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedJobs.map((job) => {
                      const lastRun = getLastRun(job);
                      const durationMs = job.started_at && job.finished_at
                        ? Math.max(new Date(job.finished_at).getTime() - new Date(job.started_at).getTime(), 0)
                        : undefined;
                      return (
                        <TableRow key={job.id} className="hover:bg-muted/40">
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{job.kind.replace('_', ' ')}</span>
                                <Badge variant={getStatusVariant(job.status)}>{job.status}</Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>Attempts: {job.attempts}</span>
                                {lastRun?.finishedAt ? (
                                  <span>
                                    Last run {formatDistanceToNow(new Date(lastRun.finishedAt), { addSuffix: true })}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(job.scheduled_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {summariseRun(job)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {durationMs ? formatDurationMs(durationMs) : job.status === 'RUNNING' ? 'In progress' : '—'}
                          </TableCell>
                          <TableCell className="space-y-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => enqueueJob.mutate({ kind: job.kind, payload: job.payload })}
                              disabled={enqueueJob.isPending || !allowedJobs.includes(job.kind)}
                            >
                              <PlayCircle className="mr-2 h-4 w-4" /> Run again
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedJob(job)}>
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlarmClock className="h-5 w-5" /> Autopilot levels
          </CardTitle>
          <CardDescription>
            Configure autonomy in policy packs. Approvals remain required for filings and client communications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {Object.entries(autonomyLevels).map(([level, description]) => (
            <p key={level}>
              <strong>{level}:</strong> {description}
            </p>
          ))}
        </CardContent>
      </Card>

      <Sheet
        open={Boolean(selectedJob)}
        onOpenChange={(open) => {
          if (!open) setSelectedJob(null);
        }}
      >
        <SheetContent className="flex flex-col gap-4 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {selectedJob ? selectedJob.kind.replace('_', ' ') : 'Autopilot run'}
            </SheetTitle>
            <SheetDescription>
              {selectedJob
                ? `Job ${selectedJob.status} • scheduled ${formatDistanceToNow(new Date(selectedJob.scheduled_at), {
                    addSuffix: true,
                  })}`
                : 'Inspect autopilot payloads and outcomes.'}
            </SheetDescription>
          </SheetHeader>
          {selectedJob ? (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Run summary</h3>
                {(() => {
                  const lastRun = getLastRun(selectedJob);
                  if (!lastRun) {
                    return <p className="text-sm text-muted-foreground">No run metadata captured yet.</p>;
                  }
                  return (
                    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                        <span>Status</span>
                        {lastRun.status ? <Badge variant="outline">{String(lastRun.status).toUpperCase()}</Badge> : null}
                        {lastRun.finishedAt ? (
                          <span>
                            Finished {formatDistanceToNow(new Date(lastRun.finishedAt), { addSuffix: true })}
                          </span>
                        ) : null}
                      </div>
                      {lastRun.result ? (
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-background/80 p-3 text-xs">
                          {JSON.stringify(lastRun.result, null, 2)}
                        </pre>
                      ) : null}
                      {lastRun.error ? (
                        <p className="text-xs text-destructive">{String(lastRun.error)}</p>
                      ) : null}
                    </div>
                  );
                })()}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Payload</h3>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-background/80 p-3 text-xs">
                  {JSON.stringify(selectedJob.payload ?? {}, null, 2)}
                </pre>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Timestamps</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>Scheduled: {formatDistanceToNow(new Date(selectedJob.scheduled_at), { addSuffix: true })}</li>
                  {selectedJob.started_at ? (
                    <li>Started: {formatDistanceToNow(new Date(selectedJob.started_at), { addSuffix: true })}</li>
                  ) : null}
                  {selectedJob.finished_at ? (
                    <li>Finished: {formatDistanceToNow(new Date(selectedJob.finished_at), { addSuffix: true })}</li>
                  ) : null}
                </ul>
              </section>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
