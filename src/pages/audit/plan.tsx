import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useAppStore } from '@/stores/mock-data';
import {
  decidePlanApproval,
  fetchAuditPlanSnapshot,
  setMateriality,
  submitPlanForApproval,
  upsertPlanStrategy,
  type AuditPlanSnapshot,
  type AuditPlanStatus,
} from '@/lib/audit-plan-service';
import { isSupabaseConfigured } from '@/integrations/supabase/client';

interface StrategyState {
  basisFramework: string;
  summary: string;
  scope: string;
  timeline: string;
  specialists: string;
}

interface MaterialityState {
  fsMateriality: string;
  performanceMateriality: string;
  clearlyTrivialThreshold: string;
  benchmark: string;
  rationale: string;
}

const BASIS_OPTIONS = [
  { value: 'IFRS_EU', label: 'IFRS as adopted by the EU' },
  { value: 'GAPSME', label: 'Malta GAPSME' },
  { value: 'US_GAAP', label: 'US GAAP (reference)' },
];

function getStatusBadge(status: AuditPlanStatus | null) {
  switch (status) {
    case 'LOCKED':
      return { label: 'Locked', className: 'bg-emerald-100 text-emerald-800' };
    case 'READY_FOR_APPROVAL':
      return { label: 'Awaiting approval', className: 'bg-amber-100 text-amber-800' };
    case 'DRAFT':
    default:
      return { label: 'Draft', className: 'bg-slate-100 text-slate-800' };
  }
}

export function AuditPlanPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const { currentOrg, getOrgEngagements } = useAppStore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<AuditPlanSnapshot | null>(null);
  const [strategyState, setStrategyState] = useState<StrategyState>({
    basisFramework: 'IFRS_EU',
    summary: '',
    scope: '',
    timeline: '',
    specialists: '',
  });
  const [materialityState, setMaterialityState] = useState<MaterialityState>({
    fsMateriality: '',
    performanceMateriality: '',
    clearlyTrivialThreshold: '',
    benchmark: 'Profit before tax',
    rationale: '',
  });
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);

  const selectedEngagement = useMemo(() => {
    if (!currentOrg || !engagementId) return null;
    return getOrgEngagements(currentOrg.id).find((eng) => eng.id === engagementId) ?? null;
  }, [currentOrg, engagementId, getOrgEngagements]);

  const canUseSupabase = isSupabaseConfigured;

  const orgSlug = currentOrg?.slug ?? '';

  const loadSnapshot = useCallback(async () => {
    if (!canUseSupabase || !orgSlug || !engagementId) {
      return;
    }
    try {
      setLoading(true);
      const data = await fetchAuditPlanSnapshot({ orgSlug, engagementId });
      setSnapshot(data);
      if (data.plan) {
        const strategy = data.plan.strategy ?? {};
        setStrategyState({
          basisFramework: data.plan.basisFramework ?? 'IFRS_EU',
          summary: String(strategy.summary ?? ''),
          scope: String(strategy.scope ?? ''),
          timeline: String(strategy.timeline ?? ''),
          specialists: String(strategy.specialists ?? ''),
        });
      }
      if (data.materiality) {
        setMaterialityState({
          fsMateriality: String(data.materiality.fsMateriality ?? ''),
          performanceMateriality: String(data.materiality.performanceMateriality ?? ''),
          clearlyTrivialThreshold: String(data.materiality.clearlyTrivialThreshold ?? ''),
          benchmark: String((data.materiality.benchmarks?.[0] as string | undefined) ?? 'Profit before tax'),
          rationale: data.materiality.rationale ?? '',
        });
      }
      const pending = data.approvals.find((item) => item.status === 'PENDING');
      setPendingApprovalId(pending?.id ?? null);
    } catch (error) {
      console.error('audit-plan-load', error);
      toast({
        variant: 'destructive',
        title: 'Unable to load audit plan',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }, [canUseSupabase, engagementId, orgSlug, toast]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  if (!currentOrg || !engagementId) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Select an engagement to configure the audit plan.</p>
      </div>
    );
  }

  const handleStrategySubmit = async () => {
    if (!canUseSupabase) {
      toast({
        variant: 'destructive',
        title: 'Supabase not configured',
        description: 'Connect to the secure backend to enable planning workflows.',
      });
      return;
    }

    try {
      await upsertPlanStrategy({
        orgSlug,
        engagementId,
        basisFramework: strategyState.basisFramework,
        strategy: {
          summary: strategyState.summary,
          scope: strategyState.scope,
          timeline: strategyState.timeline,
          specialists: strategyState.specialists,
          updatedAt: new Date().toISOString(),
        },
      });
      toast({ title: 'Strategy saved', description: 'Overall strategy updated (ISA 300).' });
      await loadSnapshot();
    } catch (error) {
      console.error('plan-strategy-save', error);
      toast({
        variant: 'destructive',
        title: 'Unable to save strategy',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleMaterialitySubmit = async () => {
    if (!canUseSupabase) {
      toast({
        variant: 'destructive',
        title: 'Supabase not configured',
        description: 'Connect to the secure backend to enable planning workflows.',
      });
      return;
    }

    try {
      await setMateriality({
        orgSlug,
        engagementId,
        fsMateriality: Number(materialityState.fsMateriality),
        performanceMateriality: Number(materialityState.performanceMateriality),
        clearlyTrivialThreshold: Number(materialityState.clearlyTrivialThreshold),
        benchmarks: [materialityState.benchmark],
        rationale: materialityState.rationale,
      });
      toast({
        title: 'Materiality captured',
        description: 'FS materiality and performance materiality stored (ISA 320).',
      });
      await loadSnapshot();
    } catch (error) {
      console.error('plan-materiality-save', error);
      toast({
        variant: 'destructive',
        title: 'Unable to save materiality',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleSubmitForApproval = async () => {
    if (!canUseSupabase) {
      toast({
        variant: 'destructive',
        title: 'Supabase not configured',
        description: 'Connect to the secure backend to submit the plan for approval.',
      });
      return;
    }

    try {
      await submitPlanForApproval({ orgSlug, engagementId });
      toast({
        title: 'Plan submitted',
        description: 'Planning bundle routed for partner approval (ISA 220/300).',
      });
      await loadSnapshot();
    } catch (error) {
      console.error('plan-submit', error);
      toast({
        variant: 'destructive',
        title: 'Unable to submit plan',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleApprove = async () => {
    if (!canUseSupabase) {
      toast({
        variant: 'destructive',
        title: 'Supabase not configured',
        description: 'Partner approval requires the secure backend connection.',
      });
      return;
    }

    if (!pendingApprovalId) return;
    try {
      await decidePlanApproval({
        orgSlug,
        engagementId,
        approvalId: pendingApprovalId,
        decision: 'APPROVED',
      });
      toast({
        title: 'Plan locked',
        description: 'Audit plan approved and locked (ISA 220, ISA 230).',
      });
      await loadSnapshot();
    } catch (error) {
      console.error('plan-approve', error);
      toast({
        variant: 'destructive',
        title: 'Unable to approve plan',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const statusBadge = getStatusBadge(snapshot?.plan?.status ?? null);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Audit Plan</h1>
          <p className="text-muted-foreground">
            Build and approve the strategy and materiality baseline (ISA 300 &amp; ISA 320)
          </p>
          {selectedEngagement && (
            <p className="mt-2 text-sm text-muted-foreground">
              Engagement: {selectedEngagement.title} · Period {selectedEngagement.periodStart} – {selectedEngagement.periodEnd}
            </p>
          )}
        </div>
        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
      </div>

      {!canUseSupabase && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase environment variables are not configured. Actions will render locally but API
          calls are skipped. Configure secure connectivity to persist the strategy, materiality and
          approvals.
        </div>
      )}

      <Card className="border border-primary/10 shadow-md">
        <CardHeader>
          <CardTitle>Overall audit strategy (ISA 300)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Reporting framework</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={strategyState.basisFramework}
                onChange={(event) =>
                  setStrategyState((prev) => ({ ...prev, basisFramework: event.target.value }))
                }
              >
                {BASIS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Specialists &amp; resources</label>
              <Input
                placeholder="Valuation expert, IT audit, tax specialist …"
                value={strategyState.specialists}
                onChange={(event) =>
                  setStrategyState((prev) => ({ ...prev, specialists: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Entity insights &amp; key scope notes</label>
            <Textarea
              rows={4}
              placeholder="Industry, components, service organizations, reliance decisions, use of internal audit …"
              value={strategyState.scope}
              onChange={(event) =>
                setStrategyState((prev) => ({ ...prev, scope: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Timetable &amp; milestones</label>
            <Textarea
              rows={3}
              placeholder="Planning analytics by 15 Jan · IC walkthroughs by 31 Jan · Fieldwork 1–19 Feb …"
              value={strategyState.timeline}
              onChange={(event) =>
                setStrategyState((prev) => ({ ...prev, timeline: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Strategy summary (attach to AP‑001)</label>
            <Textarea
              rows={3}
              placeholder="Summarise overall approach, reliance on controls, IT reliance, component strategy …"
              value={strategyState.summary}
              onChange={(event) =>
                setStrategyState((prev) => ({ ...prev, summary: event.target.value }))
              }
            />
          </div>

          <div className="flex justify-end">
            <Button variant="gradient" onClick={handleStrategySubmit} disabled={loading}>
              Save strategy
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-primary/10 shadow-md">
        <CardHeader>
          <CardTitle>Materiality &amp; performance materiality (ISA 320)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Financial statement materiality</label>
              <Input
                type="number"
                min="0"
                value={materialityState.fsMateriality}
                onChange={(event) =>
                  setMaterialityState((prev) => ({ ...prev, fsMateriality: event.target.value }))
                }
                placeholder="e.g. 250000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Performance materiality</label>
              <Input
                type="number"
                min="0"
                value={materialityState.performanceMateriality}
                onChange={(event) =>
                  setMaterialityState((prev) => ({ ...prev, performanceMateriality: event.target.value }))
                }
                placeholder="e.g. 180000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Clearly trivial threshold</label>
              <Input
                type="number"
                min="0"
                value={materialityState.clearlyTrivialThreshold}
                onChange={(event) =>
                  setMaterialityState((prev) => ({ ...prev, clearlyTrivialThreshold: event.target.value }))
                }
                placeholder="e.g. 12500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Benchmark</label>
              <Input
                value={materialityState.benchmark}
                onChange={(event) =>
                  setMaterialityState((prev) => ({ ...prev, benchmark: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Rationale (documented judgement)</label>
            <Textarea
              rows={3}
              placeholder="Explain benchmark selection, percentages applied, qualitative considerations (ISA 320.10–12)."
              value={materialityState.rationale}
              onChange={(event) =>
                setMaterialityState((prev) => ({ ...prev, rationale: event.target.value }))
              }
            />
          </div>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleMaterialitySubmit} disabled={loading}>
              Save materiality set
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-primary/10 shadow-md">
        <CardHeader>
          <CardTitle>Approval &amp; governance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleSubmitForApproval}
              disabled={loading || snapshot?.plan?.status === 'LOCKED'}
            >
              Submit for partner approval
            </Button>
            <Button
              variant="gradient"
              onClick={handleApprove}
              disabled={!pendingApprovalId || snapshot?.plan?.status === 'LOCKED'}
            >
              Approve &amp; lock plan
            </Button>
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">Change log (ISA 230)</h3>
            <div className="mt-3 space-y-2">
              {(snapshot?.changeLog ?? []).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{entry.reason.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {JSON.stringify(entry.impact, null, 2)}
                  </pre>
                </div>
              ))}
              {(snapshot?.changeLog?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">
                  No plan changes captured yet. Updates and approvals are logged here automatically.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default AuditPlanPage;
