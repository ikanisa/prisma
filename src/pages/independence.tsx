import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ShieldAlert, ShieldCheck, RefreshCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/enhanced-button';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { listClients, type ClientRecord } from '@/lib/clients';
import {
  listEngagements,
  type EngagementRecord,
  type IndependenceConclusion,
} from '@/lib/engagements';

const independencePalette: Record<IndependenceConclusion, string> = {
  OK: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  SAFEGUARDS_REQUIRED: 'bg-amber-100 text-amber-800 border border-amber-200',
  PROHIBITED: 'bg-destructive/10 text-destructive border border-destructive/30',
  OVERRIDE: 'bg-amber-100 text-amber-800 border border-amber-200',
};

const independenceCopy: Record<IndependenceConclusion, string> = {
  OK: 'No action required',
  SAFEGUARDS_REQUIRED: 'Capture safeguards & approval',
  PROHIBITED: 'Blocked until override',
  OVERRIDE: 'Awaiting approval',
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

export function Independence() {
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const [engagements, setEngagements] = useState<EngagementRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  const orgSlug = currentOrg?.slug ?? null;

  const clientNameById = useMemo(
    () => new Map(clients.map((client) => [client.id, client.name])),
    [clients],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!orgSlug) return;
    if (!isMountedRef.current) return;
    setLoading(true);
    try {
      const [clientRows, engagementRows] = await Promise.all([
        listClients(orgSlug),
        listEngagements(orgSlug, 1, 200),
      ]);
      if (!isMountedRef.current) return;
      setClients(clientRows);
      setEngagements(engagementRows);
    } catch (error) {
      if (isMountedRef.current) {
        toast({
          variant: 'destructive',
          title: 'Failed to load independence data',
          description: (error as Error).message,
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [orgSlug, toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    void fetchData();
  }, [fetchData]);

  const counts = useMemo(() => {
    return engagements.reduce(
      (acc, engagement) => {
        const conclusion = engagement.independence_conclusion;
        acc[conclusion] = (acc[conclusion] ?? 0) + 1;
        if (engagement.is_audit_client && !engagement.independence_checked) {
          acc.pending += 1;
        }
        return acc;
      },
      {
        OK: 0,
        SAFEGUARDS_REQUIRED: 0,
        PROHIBITED: 0,
        OVERRIDE: 0,
        pending: 0,
      } as Record<IndependenceConclusion | 'pending', number>,
    );
  }, [engagements]);

  const flaggedEngagements = useMemo(
    () =>
      engagements
        .filter(
          (engagement) =>
            engagement.independence_conclusion !== 'OK' ||
            (engagement.is_audit_client && !engagement.independence_checked),
        )
        .sort((a, b) => (a.updated_at && b.updated_at ? (a.updated_at < b.updated_at ? 1 : -1) : 0)),
    [engagements],
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Independence Monitor</h1>
          <p className="text-muted-foreground">
            Track audit independence, safeguard overrides, and pending approvals across engagements.
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={!orgSlug || loading}>
          {loading ? <Loader /> : <RefreshCcw className="mr-2 h-4 w-4" />} Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(['OK', 'SAFEGUARDS_REQUIRED', 'PROHIBITED', 'OVERRIDE'] as IndependenceConclusion[]).map((status) => (
          <Card key={status} className="glass">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">{status.replace('_', ' ')}</CardTitle>
              {status === 'PROHIBITED' ? (
                <ShieldAlert className="h-5 w-5 text-destructive" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-primary" />
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="text-3xl font-bold text-foreground">{counts[status] ?? 0}</div>
              <p>{independenceCopy[status]}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Checks pending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="text-3xl font-bold text-foreground">{counts.pending}</div>
            <p>Audit engagements that still need an independence assessment recorded.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Items requiring attention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {flaggedEngagements.length === 0 ? (
            <p className="text-center text-muted-foreground">All audit engagements have a passing independence conclusion.</p>
          ) : (
            <div className="space-y-3">
              {flaggedEngagements.map((engagement) => {
                const updatedAgo = engagement.updated_at
                  ? formatDistanceToNow(new Date(engagement.updated_at), { addSuffix: true })
                  : null;
                return (
                  <div
                    key={engagement.id}
                    className="rounded-lg border border-border/60 bg-card/60 p-4 transition-colors hover:bg-card"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">
                          {clientNameById.get(engagement.client_id) ?? 'Unknown client'} — {engagement.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <Badge
                            variant="outline"
                            className={`${independencePalette[engagement.independence_conclusion]} text-xs font-semibold`}
                          >
                            {engagement.independence_conclusion}
                          </Badge>
                          {engagement.is_audit_client && !engagement.independence_checked && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border border-amber-200 text-xs">
                              Check pending
                            </Badge>
                          )}
                          {engagement.requires_eqr && (
                            <Badge variant="outline" className="bg-purple-100 text-purple-800 border border-purple-200 text-xs">
                              EQR required
                            </Badge>
                          )}
                          {updatedAgo && <span className="text-muted-foreground">Updated {updatedAgo}</span>}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <p>Period: {formatDate(engagement.start_date)} – {formatDate(engagement.end_date)}</p>
                        <p>Services: {engagement.non_audit_services.map((svc) => svc.service).join(', ') || '—'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Loader() {
  return <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />;
}
