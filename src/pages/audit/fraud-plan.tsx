import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useOrganizations } from '@/hooks/use-organizations';
import { useEngagements } from '@/hooks/use-engagements';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  decideFraudPlan,
  fetchFraudPlan,
  recordFraudPlanAction,
  submitFraudPlan,
  upsertFraudPlan,
  upsertJournalEntryStrategy,
  type FraudPlanRecord,
  type FraudPlanActionRecord,
  type JournalEntryStrategyRecord,
} from '@/lib/fraud-plan-service';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

interface PlanState {
  brainstormingNotes: string;
  inherentFraudRisks: string;
  fraudResponses: string;
  analyticsStrategy: string;
  overrideAssessment: string;
}

const DEFAULT_PLAN_STATE: PlanState = {
  brainstormingNotes: '',
  inherentFraudRisks: '[]',
  fraudResponses: '[]',
  analyticsStrategy: '{}',
  overrideAssessment: '{}',
};

interface JeState {
  scope: string;
  filters: string;
  thresholds: string;
  schedule: string;
  analyticsLink: string;
  ownerUserId: string;
}

const DEFAULT_JE_STATE: JeState = {
  scope: '{}',
  filters: '{}',
  thresholds: '{}',
  schedule: '{}',
  analyticsLink: '{}',
  ownerUserId: '',
};

export default function FraudPlanPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const { currentOrg } = useOrganizations();
  const { data: engagements = [] } = useEngagements(currentOrg?.id ?? undefined);
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingJe, setSavingJe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [plan, setPlan] = useState<FraudPlanRecord | null>(null);
  const [actions, setActions] = useState<FraudPlanActionRecord[]>([]);
  const [jeStrategy, setJeStrategy] = useState<JournalEntryStrategyRecord | null>(null);
  const [planState, setPlanState] = useState<PlanState>(DEFAULT_PLAN_STATE);
  const [jeState, setJeState] = useState<JeState>(DEFAULT_JE_STATE);
  const [actionNote, setActionNote] = useState('');

  const canUseSupabase = isSupabaseConfigured;
  const orgSlug = currentOrg?.slug ?? '';

  const engagement = useMemo(() => {
    if (!currentOrg || !engagementId) return null;
    return engagements.find((item) => item.id === engagementId) ?? null;
  }, [currentOrg, engagementId, engagements]);

  const loadData = useCallback(async () => {
    if (!canUseSupabase || !orgSlug || !engagementId) return;
    try {
      setLoading(true);
      const data = await fetchFraudPlan({ orgSlug, engagementId });
      setPlan(data.plan);
      setActions(data.actions);
      setJeStrategy(data.journalEntryStrategy);

      if (data.plan) {
        setPlanState({
          brainstormingNotes: data.plan.brainstormingNotes ?? '',
          inherentFraudRisks: JSON.stringify(data.plan.inherentFraudRisks ?? [], null, 2),
          fraudResponses: JSON.stringify(data.plan.fraudResponses ?? [], null, 2),
          analyticsStrategy: JSON.stringify(data.plan.analyticsStrategy ?? {}, null, 2),
          overrideAssessment: JSON.stringify(data.plan.overrideAssessment ?? {}, null, 2),
        });
      } else {
        setPlanState(DEFAULT_PLAN_STATE);
      }

      if (data.journalEntryStrategy) {
        setJeState({
          scope: JSON.stringify(data.journalEntryStrategy.scope ?? {}, null, 2),
          filters: JSON.stringify(data.journalEntryStrategy.filters ?? {}, null, 2),
          thresholds: JSON.stringify(data.journalEntryStrategy.thresholds ?? {}, null, 2),
          schedule: JSON.stringify(data.journalEntryStrategy.schedule ?? {}, null, 2),
          analyticsLink: JSON.stringify(data.journalEntryStrategy.analyticsLink ?? {}, null, 2),
          ownerUserId: data.journalEntryStrategy.ownerUserId ?? '',
        });
      } else {
        setJeState(DEFAULT_JE_STATE);
      }
    } catch (error) {
      logger.error('fraud_plan.load_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to load fraud plan',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }, [canUseSupabase, orgSlug, engagementId, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handlePlanSave = async () => {
    if (!canUseSupabase || !orgSlug || !engagementId) {
      toast({
        variant: 'destructive',
        title: 'Supabase not configured',
        description: 'Connect to the secure backend to persist the fraud plan.',
      });
      return;
    }

    try {
      setSavingPlan(true);
      await upsertFraudPlan({
        orgSlug,
        engagementId,
        brainstormingNotes: planState.brainstormingNotes || null,
        inherentFraudRisks: safeJsonParse(planState.inherentFraudRisks, []),
        fraudResponses: safeJsonParse(planState.fraudResponses, []),
        analyticsStrategy: safeJsonParse(planState.analyticsStrategy, {}),
        overrideAssessment: safeJsonParse(planState.overrideAssessment, {}),
      });
      toast({ title: 'Fraud plan saved', description: 'ISA 240 planning bundle updated.' });
      await loadData();
    } catch (error) {
      logger.error('fraud_plan.save_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to save fraud plan',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSavingPlan(false);
    }
  };

  const handlePlanSubmit = async () => {
    if (!plan) return;
    try {
      setSubmitting(true);
      await submitFraudPlan({ orgSlug, engagementId: engagementId! });
      toast({ title: 'Fraud plan submitted', description: 'Partner approval requested.' });
      await loadData();
    } catch (error) {
      logger.error('fraud_plan.submit_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to submit fraud plan',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlanApprove = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!plan) return;
    try {
      setDeciding(true);
      await decideFraudPlan({
        orgSlug,
        engagementId: engagementId!,
        approvalId: 'pending',
        decision,
        note: decision === 'REJECTED' ? 'Additional procedures required' : undefined,
      });
      toast({
        title: decision === 'APPROVED' ? 'Fraud plan approved' : 'Fraud plan rejected',
        description:
          decision === 'APPROVED'
            ? 'Plan locked ahead of fieldwork.'
            : 'Plan returned to draft for further updates.',
      });
      await loadData();
    } catch (error) {
      logger.error('fraud_plan.decision_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to record decision',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setDeciding(false);
    }
  };

  const handleJeSave = async () => {
    if (!canUseSupabase || !orgSlug || !engagementId) return;
    try {
      setSavingJe(true);
      await upsertJournalEntryStrategy({
        orgSlug,
        engagementId,
        scope: safeJsonParse(jeState.scope, {}),
        filters: safeJsonParse(jeState.filters, {}),
        thresholds: safeJsonParse(jeState.thresholds, {}),
        schedule: safeJsonParse(jeState.schedule, {}),
        analyticsLink: safeJsonParse(jeState.analyticsLink, {}),
        ownerUserId: jeState.ownerUserId || null,
      });
      toast({ title: 'JE strategy saved', description: 'Journal entry filters and schedule updated.' });
      await loadData();
    } catch (error) {
      logger.error('fraud_plan.je_strategy_save_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to save strategy',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSavingJe(false);
    }
  };

  const handleActionAdd = async () => {
    if (!canUseSupabase || !orgSlug || !engagementId || !actionNote.trim()) return;
    try {
      await recordFraudPlanAction({
        orgSlug,
        engagementId,
        action: 'NOTE',
        notes: actionNote,
      });
      setActionNote('');
      await loadData();
    } catch (error) {
      logger.error('fraud_plan.action_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to add note',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  if (!currentOrg || !engagementId) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Select an engagement to manage the fraud plan.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Fraud Plan & JE Strategy</h1>
          <p className="text-muted-foreground">
            Capture brainstorming outcomes, fraud risks, and journal entry strategy (ISA 240)
          </p>
          {engagement && (
            <p className="mt-2 text-sm text-muted-foreground">
              Engagement: {engagement.title} · Period {engagement.periodStart} – {engagement.periodEnd}
            </p>
          )}
        </div>
        {plan ? <Badge variant="outline">Status: {plan.status.toLowerCase()}</Badge> : <Badge>Draft</Badge>}
      </div>

      {!canUseSupabase && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase environment variables are not configured. Actions will render locally but API calls are skipped.
          Configure secure connectivity to persist the fraud plan and JE strategy.
        </div>
      )}

      <Card className="border border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle>Fraud brainstorming</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Brainstorming notes</label>
              <Textarea
                value={planState.brainstormingNotes}
                onChange={(event) =>
                  setPlanState((prev) => ({ ...prev, brainstormingNotes: event.target.value }))
                }
                rows={6}
                placeholder="Document team brainstorming highlights, fraud incentives, opportunities, rationalisations."
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Inherent fraud risks (JSON array)</label>
              <Textarea
                value={planState.inherentFraudRisks}
                onChange={(event) => setPlanState((prev) => ({ ...prev, inherentFraudRisks: event.target.value }))}
                rows={6}
                placeholder='[
  { "risk": "Manual revenue override", "assertions": ["Occurrence"], "likelihood": "HIGH" }
]'
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Fraud responses (JSON array)</label>
              <Textarea
                value={planState.fraudResponses}
                onChange={(event) => setPlanState((prev) => ({ ...prev, fraudResponses: event.target.value }))}
                rows={6}
                placeholder='[
  { "riskRef": "Manual revenue override", "response": "Expand JE testing" }
]'
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Analytics strategy (JSON)</label>
              <Textarea
                value={planState.analyticsStrategy}
                onChange={(event) => setPlanState((prev) => ({ ...prev, analyticsStrategy: event.target.value }))}
                rows={6}
                placeholder='{ "datasets": ["GL"], "procedures": ["Benford"], "owner": "user-123" }'
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Override assessment (JSON)</label>
              <Textarea
                value={planState.overrideAssessment}
                onChange={(event) => setPlanState((prev) => ({ ...prev, overrideAssessment: event.target.value }))}
                rows={6}
                placeholder='{ "overrideControls": true, "monitoring": "Monthly review" }'
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="gradient" onClick={handlePlanSave} loading={savingPlan}>
              Save fraud plan
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePlanSubmit} loading={submitting} disabled={!plan}>
                Submit for approval
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePlanApprove('APPROVED')}
                loading={deciding}
                disabled={!plan}
              >
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePlanApprove('REJECTED')}
                loading={deciding}
                disabled={!plan}
              >
                Reject
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle>Journal entry strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Scope (JSON)</label>
              <Textarea
                value={jeState.scope}
                onChange={(event) => setJeState((prev) => ({ ...prev, scope: event.target.value }))}
                rows={5}
                placeholder='{ "entities": ["Parent", "Subsidiary"], "period": "FY25" }'
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Filters (JSON)</label>
              <Textarea
                value={jeState.filters}
                onChange={(event) => setJeState((prev) => ({ ...prev, filters: event.target.value }))}
                rows={5}
                placeholder='{ "nonStandardUsers": true, "roundAmounts": true }'
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Thresholds (JSON)</label>
              <Textarea
                value={jeState.thresholds}
                onChange={(event) => setJeState((prev) => ({ ...prev, thresholds: event.target.value }))}
                rows={5}
                placeholder='{ "amount": 5000, "riskScore": 0.7 }'
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Schedule (JSON)</label>
              <Textarea
                value={jeState.schedule}
                onChange={(event) => setJeState((prev) => ({ ...prev, schedule: event.target.value }))}
                rows={5}
                placeholder='{ "frequency": "Monthly", "dueDates": ["2025-01-15"] }'
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Analytics link (JSON)</label>
              <Textarea
                value={jeState.analyticsLink}
                onChange={(event) => setJeState((prev) => ({ ...prev, analyticsLink: event.target.value }))}
                rows={5}
                placeholder='{ "adaRunId": "run-123", "samplingPlanId": "plan-456" }'
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Owner user ID</label>
              <Input
                value={jeState.ownerUserId}
                onChange={(event) => setJeState((prev) => ({ ...prev, ownerUserId: event.target.value }))}
                placeholder="user-uuid"
              />
            </div>
          </div>

          <Button variant="outline" onClick={handleJeSave} loading={savingJe}>
            Save JE strategy
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle>Fraud plan activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
            {actions.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              actions.map((entry) => (
                <div key={entry.id} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium uppercase tracking-wide">{entry.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm')}
                    </span>
                  </div>
                  {entry.notes && <p className="mt-1 text-sm">{entry.notes}</p>}
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-2">
            <Textarea
              value={actionNote}
              onChange={(event) => setActionNote(event.target.value)}
              rows={2}
              placeholder="Add note for fraud plan timeline"
            />
            <Button variant="outline" size="sm" onClick={handleActionAdd}>
              Add note
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function safeJsonParse<T>(value: string, fallback: T): T {
  if (!value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    logger.warn('fraud_plan.json_parse_failed', error);
    return fallback;
  }
}
