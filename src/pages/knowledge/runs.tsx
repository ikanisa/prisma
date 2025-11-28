import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLearningRuns } from '@/hooks/use-knowledge';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function KnowledgeRunsPage() {
  const runsQuery = useLearningRuns();
  const [selectedRun, setSelectedRun] = useState<any | null>(null);

  const runs = runsQuery.data ?? [];

  const statusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'queued':
      case 'pending':
        return 'outline';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const selectedMessages = useMemo(() => {
    if (!selectedRun?.stats?.messages) return [];
    return Array.isArray(selectedRun.stats.messages) ? selectedRun.stats.messages : [];
  }, [selectedRun]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Learning Runs</h1>
        <p className="text-muted-foreground mt-1">
          Monitor placeholder ingestion jobs. Once Google Drive is connected these runs will track
          document ingestion, embeddings, and evaluation events.
        </p>
      </div>

      {runsQuery.isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading runs…</CardTitle>
            <CardDescription>Fetching the latest learning activity.</CardDescription>
          </CardHeader>
        </Card>
      ) : runs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No runs yet</CardTitle>
            <CardDescription>
              Kick off an initial learning run from the Agent Learning wizard once corpora and sources are configured.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Finished</TableHead>
              <TableHead className="w-[120px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-mono text-xs">{run.id}</TableCell>
                <TableCell className="uppercase text-sm font-medium">{run.agent_kind}</TableCell>
                <TableCell>{run.mode}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                </TableCell>
               <TableCell>
                  {run.started_at ? `${format(new Date(run.started_at), 'PPPp')}` : '—'}
                  {run.started_at && (
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {run.finished_at ? format(new Date(run.finished_at), 'PPPp') : '—'}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => setSelectedRun(run)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={Boolean(selectedRun)} onOpenChange={() => setSelectedRun(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Run details</DialogTitle>
          </DialogHeader>
          {!selectedRun ? null : (
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-medium">Run ID</div>
                <div className="font-mono text-xs break-all">{selectedRun.id}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-medium">Agent</div>
                  <div className="uppercase">{selectedRun.agent_kind}</div>
                </div>
                <div>
                  <div className="font-medium">Mode</div>
                  <div>{selectedRun.mode}</div>
                </div>
                <div>
                  <div className="font-medium">Status</div>
                  <Badge variant={statusVariant(selectedRun.status)}>{selectedRun.status}</Badge>
                </div>
                <div>
                  <div className="font-medium">Started</div>
                  <div>{selectedRun.started_at ? format(new Date(selectedRun.started_at), 'PPPp') : '—'}</div>
                </div>
                <div>
                  <div className="font-medium">Finished</div>
                  <div>{selectedRun.finished_at ? format(new Date(selectedRun.finished_at), 'PPPp') : '—'}</div>
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">Messages</div>
                <ScrollArea className="h-40 rounded border p-3 bg-muted/40">
                  {selectedMessages.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Placeholder run. Messages will populate once ingestion is connected.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedMessages.map((msg: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          • {msg}
                        </li>
                      ))}
                    </ul>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
