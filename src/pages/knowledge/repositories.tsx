import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useKnowledgeCorpora,
  usePreviewKnowledgeSource,
  useDriveConnectorMetadata,
  useDriveConnectorStatus,
  useWebSources,
  useScheduleWebHarvest,
  useCreateCorpus,
  useCreateKnowledgeSource,
} from '@/hooks/use-knowledge';
import { Loader2, RefreshCw, ExternalLink, Bot, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link, useParams } from 'react-router-dom';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export default function KnowledgeRepositoriesPage() {
  const corporaQuery = useKnowledgeCorpora();
  const metadataQuery = useDriveConnectorMetadata();
  const statusQuery = useDriveConnectorStatus();
  const previewMutation = usePreviewKnowledgeSource();
  const webSourcesQuery = useWebSources();
  const scheduleWebHarvest = useScheduleWebHarvest();
  const [webAgentKind, setWebAgentKind] = useState<'AUDIT' | 'FINANCE' | 'TAX'>('AUDIT');
  const createCorpus = useCreateCorpus();
  const createKnowledgeSource = useCreateKnowledgeSource();
  const [newCorpusName, setNewCorpusName] = useState('');
  const [newCorpusDomain, setNewCorpusDomain] = useState('IAS');
  const [newCorpusJurisdictions, setNewCorpusJurisdictions] = useState('MT');
  const [newCorpusRetention, setNewCorpusRetention] = useState('');
  const [newCorpusDefault, setNewCorpusDefault] = useState(false);
  const [selectedCorpusForSource, setSelectedCorpusForSource] = useState('');
  const [selectedWebSourceForLink, setSelectedWebSourceForLink] = useState('');
  const [previewDocs, setPreviewDocs] = useState<
    Array<{ id: string; name: string; mimeType: string; modifiedTime: string; downloadUrl: string }>
  >([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState<string | null>(null);

  const corpora = corporaQuery.data ?? [];
  const connectorMetadata = metadataQuery.data;
  const connectorStatus = statusQuery.data;
  const connectorReady = Boolean(connectorStatus?.connector);
  const { orgSlug } = useParams();
  const runsHref = orgSlug ? `/${orgSlug}/knowledge/runs` : '#';

  const handlePreview = async (sourceId: string) => {
    setPreviewSource(sourceId);
    try {
      const response = await previewMutation.mutateAsync(sourceId);
      setPreviewDocs(response.documents ?? []);
      setPreviewOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const renderJurisdiction = (jurisdiction?: string[]) => {
    if (!jurisdiction || jurisdiction.length === 0) {
      return <Badge variant="outline">Global</Badge>;
    }
    return (
      <div className="flex gap-2 flex-wrap">
        {jurisdiction.map((code) => (
          <Badge key={code} variant="outline">
            {code}
          </Badge>
        ))}
      </div>
    );
  };

  const previewTitle = useMemo(() => {
    if (!previewSource) return 'Source preview';
    return `Source preview – ${previewSource}`;
  }, [previewSource]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Knowledge Repositories</h1>
          <p className="text-muted-foreground mt-1">
            Review the corpora powering agent learning. Google Drive ingestion is {connectorReady ? 'active—monitor queue depth and blocked entries below.' : 'waiting for final credential setup.'}
          </p>
        </div>
        <Button asChild variant="outline" disabled={!orgSlug}>
          <Link to={runsHref}>View learning runs</Link>
        </Button>
      </div>

      {metadataQuery.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading connector metadata…
        </div>
      )}

      {(metadataQuery.isLoading || statusQuery.isLoading) && !connectorMetadata && !connectorStatus && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading Drive connector…
        </div>
      )}

      {(connectorMetadata || connectorStatus) && (
        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle>Google Drive Connector</CardTitle>
            <CardDescription>
              {connectorReady ? 'Active — monitoring ingestion health' : 'Configuration pending'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="font-medium text-muted-foreground">Folder / Shared Drive</p>
                <p>{connectorMetadata?.folderId ?? '—'}</p>
                {connectorMetadata?.sharedDriveId && (
                  <p className="text-muted-foreground">Shared drive: {connectorMetadata.sharedDriveId}</p>
                )}
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Service account email</p>
                <p>{connectorMetadata?.serviceAccountEmail ?? '—'}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="font-medium text-muted-foreground">Last sync</p>
                <p>
                  {connectorStatus?.connector?.lastSyncAt
                    ? formatDistanceToNow(new Date(connectorStatus.connector.lastSyncAt), { addSuffix: true })
                    : 'Never'}
                </p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Pending queue</p>
                <p>{connectorStatus?.queue.pending ?? 0}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Blocked by allowlist</p>
                <p>{connectorStatus?.metadata.blocked ?? 0}</p>
              </div>
            </div>

            {connectorStatus?.connector?.watchExpiresAt && (
              <div className="text-sm text-muted-foreground">
                Watch channel expires{' '}
                {formatDistanceToNow(new Date(connectorStatus.connector.watchExpiresAt), { addSuffix: true })}.
              </div>
            )}

            {connectorStatus?.queue.failed24h && connectorStatus.queue.failed24h > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                {connectorStatus.queue.failed24h} failures in the last 24 hours — review recent errors below.
              </div>
            )}

            {connectorStatus?.queue.recentErrors?.length ? (
              <div className="space-y-2">
                <p className="font-medium text-muted-foreground">Recent errors</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {connectorStatus.queue.recentErrors.map((item, index) => (
                    <li key={`${item.fileId ?? 'unknown'}-${index}`}>
                      <span className="font-medium">{item.fileId ?? 'unknown'}:</span> {item.error ?? 'Unknown error'}
                      {item.processedAt && (
                        <span className="ml-2">
                          ({formatDistanceToNow(new Date(item.processedAt), { addSuffix: true })})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {corporaQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading corpora…
        </div>
      ) : corpora.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No corpora yet</CardTitle>
            <CardDescription>
              Create corpora via Supabase or upcoming UI to begin initial learning. Once corpora appear,
              sources can be linked to Google Drive folders for ingestion.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
      <div className="grid gap-4">
        {corpora.map((corpus) => (
          <Card key={corpus.id}>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {corpus.name}
                    {corpus.is_default && <Badge>Default</Badge>}
                  </CardTitle>
                  <CardDescription>
                    Domain: <span className="uppercase font-medium">{corpus.domain}</span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div>Created {format(new Date(corpus.created_at), 'PPP')}</div>
                  {corpus.retention && <div>Retention: {corpus.retention}</div>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Jurisdictions</h3>
                  {renderJurisdiction(corpus.jurisdiction)}
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Sources</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/4">Provider</TableHead>
                        <TableHead>Source URI</TableHead>
                        <TableHead className="w-1/4">Last Sync</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {corpus.knowledge_sources?.length ? (
                        corpus.knowledge_sources.map((source: any) => (
                          <TableRow key={source.id}>
                            <TableCell className="capitalize">{source.provider}</TableCell>
                            <TableCell className="truncate text-muted-foreground">
                              {source.source_uri}
                            </TableCell>
                            <TableCell>
                              {source.last_sync_at
                                ? format(new Date(source.last_sync_at), 'PPPp')
                                : 'Never synced'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreview(source.id)}
                                disabled={previewMutation.isPending}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" /> Preview
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-muted-foreground text-sm">
                            No sources linked yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          {previewMutation.isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating preview…
            </div>
          ) : previewDocs.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No documents available yet. Configure Google Drive to fetch real content.
            </div>
          ) : (
            <div className="space-y-3">
              {previewDocs.map((doc) => (
                <Card key={doc.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{doc.name}</CardTitle>
                    <CardDescription>
                      {doc.mimeType} · Modified {format(new Date(doc.modifiedTime), 'PPPp')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer">
                        <RefreshCw className="h-4 w-4 mr-2" /> Placeholder download
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" /> Web knowledge sources
          </CardTitle>
          <CardDescription>
            Global catalogue of authoritative Malta resources. Use OpenAI web search (pending keys) to
            ingest and summarise these URLs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              {webSourcesQuery.isLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading sources…</span>
              ) : (
                <span>{webSourcesQuery.data?.length ?? 0} sources available for web harvest.</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="web-agent">Agent persona</Label>
              <Select value={webAgentKind} onValueChange={(value) => setWebAgentKind(value as 'AUDIT' | 'FINANCE' | 'TAX')}>
                <SelectTrigger className="w-[200px]" id="web-agent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUDIT">Audit Partner</SelectItem>
                  <SelectItem value="FINANCE">Accounting & Finance Partner</SelectItem>
                  <SelectItem value="TAX">Tax Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {webSourcesQuery.isLoading ? null : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead className="w-[140px]">Harvest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(webSourcesQuery.data ?? []).map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">{source.title}</TableCell>
                    <TableCell className="text-xs text-blue-600 break-all">
                      <a href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</a>
                    </TableCell>
                    <TableCell className="uppercase text-muted-foreground text-xs">{source.domain ?? '—'}</TableCell>
                    <TableCell>
                      {source.jurisdiction?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {source.jurisdiction.map((code) => (
                            <Badge key={code} variant="outline">{code}</Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="outline">Global</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => scheduleWebHarvest.mutate({ webSourceId: source.id, agentKind: webAgentKind })}
                        disabled={scheduleWebHarvest.isPending}
                      >
                        {scheduleWebHarvest.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Queue harvest'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create corpus</CardTitle>
            <CardDescription>Organise knowledge assets by domain and jurisdiction.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                createCorpus.mutate({
                  name: newCorpusName,
                  domain: newCorpusDomain,
                  jurisdictions: newCorpusJurisdictions
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean),
                  retention: newCorpusRetention || null,
                  isDefault: newCorpusDefault,
                }, {
                  onSuccess: () => {
                    setNewCorpusName('');
                    setNewCorpusJurisdictions('MT');
                    setNewCorpusRetention('');
                    setNewCorpusDefault(false);
                  },
                });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="corpus-name">Name</Label>
                <Input
                  id="corpus-name"
                  value={newCorpusName}
                  onChange={(event) => setNewCorpusName(event.target.value)}
                  placeholder="e.g. IFRS Core"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="corpus-domain">Domain</Label>
                <Select value={newCorpusDomain} onValueChange={setNewCorpusDomain}>
                  <SelectTrigger id="corpus-domain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IAS">IAS</SelectItem>
                    <SelectItem value="IFRS">IFRS</SelectItem>
                    <SelectItem value="ISA">ISA</SelectItem>
                    <SelectItem value="TAX">TAX</SelectItem>
                    <SelectItem value="ORG">ORG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="corpus-jurisdiction">Jurisdictions</Label>
                <Input
                  id="corpus-jurisdiction"
                  value={newCorpusJurisdictions}
                  onChange={(event) => setNewCorpusJurisdictions(event.target.value)}
                  placeholder="Comma separated (e.g. MT, EU)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="corpus-retention">Retention policy</Label>
                <Textarea
                  id="corpus-retention"
                  value={newCorpusRetention}
                  onChange={(event) => setNewCorpusRetention(event.target.value)}
                  placeholder="Optional notes about retention or review cadence"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <Label htmlFor="corpus-default">Set as default</Label>
                  <p className="text-xs text-muted-foreground">Used when learning runs do not specify a corpus.</p>
                </div>
                <Switch
                  id="corpus-default"
                  checked={newCorpusDefault}
                  onCheckedChange={setNewCorpusDefault}
                />
              </div>
              <Button type="submit" disabled={createCorpus.isPending}>
                {createCorpus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create corpus
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Link corpus to web source</CardTitle>
            <CardDescription>Associate an internal corpus with a global Malta resource.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!selectedCorpusForSource || !selectedWebSourceForLink) return;
                createKnowledgeSource.mutate({
                  corpusId: selectedCorpusForSource,
                  provider: 'web_catalog',
                  sourceUri: selectedWebSourceForLink,
                }, {
                  onSuccess: () => {
                    setSelectedCorpusForSource('');
                    setSelectedWebSourceForLink('');
                  },
                });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="link-corpus">Corpus</Label>
                <Select value={selectedCorpusForSource} onValueChange={setSelectedCorpusForSource}>
                  <SelectTrigger id="link-corpus">
                    <SelectValue placeholder="Select corpus" />
                  </SelectTrigger>
                  <SelectContent>
                    {corpora.map((corpus) => (
                      <SelectItem key={corpus.id} value={corpus.id}>
                        {corpus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-web">Web source</Label>
                <Select value={selectedWebSourceForLink} onValueChange={setSelectedWebSourceForLink}>
                  <SelectTrigger id="link-web">
                    <SelectValue placeholder="Select Malta resource" />
                  </SelectTrigger>
                  <SelectContent>
                    {(webSourcesQuery.data ?? []).map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={createKnowledgeSource.isPending}>
                {createKnowledgeSource.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Link source
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
