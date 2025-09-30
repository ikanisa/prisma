import { FormEvent, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  useKnowledgeCorpora,
  useScheduleLearningRun,
  useDriveConnectorMetadata,
  useDriveConnectorStatus,
  useLearningJobs,
  useApproveLearningJob,
  useLearningPolicies,
  useLearningMetrics,
} from '@/hooks/use-knowledge';
import type { AgentKind, LearningMode } from '@/lib/knowledge';
import { useOrganizations } from '@/hooks/use-organizations';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, BrainCircuit, BookOpen, RefreshCw, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AgentLearningPage() {
  const { currentOrg } = useOrganizations();
  const corporaQuery = useKnowledgeCorpora();
  const metadataQuery = useDriveConnectorMetadata();
  const statusQuery = useDriveConnectorStatus();
  const scheduleRun = useScheduleLearningRun();
  const pendingJobsQuery = useLearningJobs('PENDING');
  const approveJob = useApproveLearningJob();
  const policiesQuery = useLearningPolicies();
  const metricsQuery = useLearningMetrics('run_success_rate', 10);

  const corpora = useMemo(() => corporaQuery.data ?? [], [corporaQuery.data]);
  const connectorMetadata = metadataQuery.data ?? null;
  const connectorStatus = statusQuery.data ?? null;
  const connectorReady = Boolean(connectorStatus?.connector);
  const pendingJobs = pendingJobsQuery.data ?? [];
  const policies = policiesQuery.data ?? [];
  const metrics = metricsQuery.data ?? [];
  const latestMetric = metrics.length ? metrics[0] : null;
  const allSources = useMemo(
    () =>
      corpora.flatMap((corpus: any) =>
        (corpus.knowledge_sources ?? []).map((source: any) => ({
          id: source.id,
          label: `${corpus.name} · ${source.provider}`,
          corpusId: corpus.id,
          corpusName: corpus.name,
          domain: corpus.domain,
          provider: source.provider,
        }))
      ),
    [corpora],
  );

  const [selectedSource, setSelectedSource] = useState<string>('');
  const [agentKind, setAgentKind] = useState<AgentKind>('AUDIT');
  const [mode, setMode] = useState<LearningMode>('INITIAL');

  const selectedSourceMeta = allSources.find((src) => src.id === selectedSource);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSource || !currentOrg) return;

    scheduleRun.mutate({
      sourceId: selectedSource,
      agentKind,
      mode,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <BrainCircuit className="h-8 w-8" /> Agent Initial Learning
        </h1>
        <p className="text-muted-foreground">
          Configure corpora and queue learning runs. Google Drive ingestion is {connectorReady ? 'active—monitor queue depth and policy approvals below.' : 'waiting for final credential setup.'}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Persona alignment</CardTitle>
            <CardDescription>Audit, Accounting/Finance, and Tax partners.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Each agent emulates a 30-year Big Four partner with relevant certifications (ACCA, CFA, CPA/CA, PhD).</p>
            <p>Responses must cite IAS/IFRS/ISA or tax authority guidance and highlight jurisdiction nuances.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Initial learning flow</CardTitle>
            <CardDescription>Wizard-driven sync.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Select corpora, map Drive folders, run ingestion → chunking → embedding.</p>
            <p>Baseline evaluations ensure coverage before agents respond to users.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Continuous learning</CardTitle>
            <CardDescription>Self-reading and feedback loops.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Drive change feed triggers re-ingestion, while user feedback opens remediation runs.</p>
            <p>Evaluations and drift alerts guard compliance and freshness.</p>
          </CardContent>
        </Card>
      </div>

      {connectorReady ? (
        <Alert className="bg-muted/40 border-emerald-200 text-emerald-800 dark:border-emerald-900 dark:text-emerald-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Google Drive connector active</AlertTitle>
          <AlertDescription>
            Last sync{' '}
            {connectorStatus?.connector?.lastSyncAt
              ? formatDistanceToNow(new Date(connectorStatus.connector.lastSyncAt), { addSuffix: true })
              : 'not yet run'}
            . Pending queue: <strong>{connectorStatus?.queue.pending ?? 0}</strong>. Blocked entries:{' '}
            <strong>{connectorStatus?.metadata.blocked ?? 0}</strong>.
          </AlertDescription>
        </Alert>
      ) : connectorMetadata ? (
        <Alert className="bg-muted/40">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Google Drive configuration pending</AlertTitle>
          <AlertDescription>
            Provide Drive credentials and folder mapping to enable ingestion. Expected folder ID:{' '}
            <strong>{connectorMetadata.folderId}</strong>.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Queue learning run</CardTitle>
          <CardDescription>
            Select a knowledge source and agent persona. The run is recorded immediately with placeholder
            events and will execute fully once Drive credentials are connected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="source">Knowledge source</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger id="source">
                  <SelectValue placeholder={allSources.length ? 'Select a knowledge source' : 'No sources available'} />
                </SelectTrigger>
                <SelectContent>
                  {allSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sources derive from corpora in Supabase. Add entries via Supabase UI until the creation wizard is available.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent">Agent persona</Label>
              <Select value={agentKind} onValueChange={(value) => setAgentKind(value as AgentKind)}>
                <SelectTrigger id="agent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUDIT">Audit Partner (ISA/IFRS)</SelectItem>
                  <SelectItem value="FINANCE">Accounting & Finance Partner (IAS/IFRS)</SelectItem>
                  <SelectItem value="TAX">Tax Partner (Global Tax & VAT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Learning mode</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as LearningMode)}>
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INITIAL">Initial learning</SelectItem>
                  <SelectItem value="CONTINUOUS">Continuous learning</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Initial runs build the knowledge base; continuous runs capture deltas from Drive updates and feedback.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Selected corpus</Label>
              <Card className="border-dashed">
                <CardContent className="py-4 text-sm text-muted-foreground space-y-2">
                  {selectedSourceMeta ? (
                    <div className="space-y-1">
                      <div className="font-medium">{selectedSourceMeta.corpusName}</div>
                      <div className="flex flex-wrap gap-2 text-xs uppercase">
                        <Badge variant="outline">Domain: {selectedSourceMeta.domain}</Badge>
                        <Badge variant="outline">Provider: {selectedSourceMeta.provider}</Badge>
                      </div>
                    </div>
                  ) : (
                    <p>No source selected.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="submit" disabled={!selectedSource || scheduleRun.isPending}>
                {scheduleRun.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Queue learning run
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending learning jobs</CardTitle>
            <CardDescription>
              Jobs generated by the diagnoser awaiting manual approval before the applier executes them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {pendingJobsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading jobs…
              </div>
            ) : pendingJobs.length === 0 ? (
              <p className="text-muted-foreground">No pending jobs 🎉</p>
            ) : (
              <div className="space-y-3">
                {pendingJobs.map((job) => (
                  <div key={job.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium capitalize">{job.kind.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={approveJob.isPending}
                        onClick={() => approveJob.mutate({ jobId: job.id })}
                      >
                        {approveJob.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                      </Button>
                    </div>
                    {job.payload && (
                      <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted/70 p-2 text-xs">
                        {JSON.stringify(job.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policy versions & metrics</CardTitle>
            <CardDescription>Review active policy versions and the latest run success rate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {policiesQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading policies…
              </div>
            ) : policies.length === 0 ? (
              <p className="text-muted-foreground">No policy versions yet.</p>
            ) : (
              <ul className="space-y-2">
                {policies.slice(0, 4).map((policy) => (
                  <li key={policy.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">Version {policy.version}</p>
                        <p className="text-xs text-muted-foreground">Status: {policy.status}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(policy.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {policy.summary && <p className="mt-2 text-sm text-muted-foreground">{policy.summary}</p>}
                  </li>
                ))}
              </ul>
            )}

            {latestMetric && (
              <div className="rounded-md border border-dashed p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Run success rate</p>
                <p className="text-2xl font-semibold">
                  {Math.round((latestMetric.value ?? 0) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Computed {formatDistanceToNow(new Date(latestMetric.computed_at), { addSuffix: true })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Learning checklist</CardTitle>
          <CardDescription>Summary of required actions before going live.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <div className="flex items-start gap-2">
            <BookOpen className="h-4 w-4 mt-0.5" />
            Provision IAS/IFRS/ISA and jurisdiction-specific tax guidance in dedicated corpora.
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            Configure reviewer workflows for learning runs and evaluation failures.
          </div>
          <div className="flex items-start gap-2">
            <BrainCircuit className="h-4 w-4 mt-0.5" />
            Wire OpenAI Agent SDK with RAG tools and session memory.
          </div>
          <div className="flex items-start gap-2">
            <RefreshCw className="h-4 w-4 mt-0.5" />
            Enable continuous Drive sync through the scheduled ingestion service.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
