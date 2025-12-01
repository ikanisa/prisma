import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useOrganizations } from '@/hooks/use-organizations';
import { useEngagements } from '@/hooks/use-engagements';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/enhanced-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import {
  addRiskActivity,
  fetchRiskRegister,
  recordRiskSignal,
  updateRiskStatus,
  upsertRisk,
  type AuditRiskRecord,
  type AuditRiskSignalRecord,
  type AuditRiskActivityRecord,
} from '@/lib/audit-risk-service';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const CATEGORY_OPTIONS = [
  { value: 'FINANCIAL_STATEMENT', label: 'Financial Statement' },
  { value: 'FRAUD', label: 'Fraud' },
  { value: 'CONTROL', label: 'Control' },
  { value: 'IT', label: 'IT' },
  { value: 'GOING_CONCERN', label: 'Going Concern' },
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'ESTIMATE', label: 'Estimate' },
  { value: 'OTHER', label: 'Other' },
];

const RATING_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'HIGH', label: 'High' },
  { value: 'SIGNIFICANT', label: 'Significant' },
];

interface RiskFormState {
  id?: string;
  code: string;
  title: string;
  description: string;
  category: string;
  assertions: string;
  likelihood: string;
  impact: string;
  inherentRating: string;
  residualRating: string;
  ownerUserId: string;
}

const DEFAULT_FORM: RiskFormState = {
  code: '',
  title: '',
  description: '',
  category: 'FINANCIAL_STATEMENT',
  assertions: 'Existence, Presentation',
  likelihood: 'MODERATE',
  impact: 'MODERATE',
  inherentRating: 'MODERATE',
  residualRating: '',
  ownerUserId: '',
};

export function AuditRiskRegisterPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const { currentOrg } = useOrganizations();
  const { data: engagements = [] } = useEngagements(currentOrg?.id ?? undefined);
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [risks, setRisks] = useState<AuditRiskRecord[]>([]);
  const [signals, setSignals] = useState<AuditRiskSignalRecord[]>([]);
  const [activity, setActivity] = useState<AuditRiskActivityRecord[]>([]);
  const [formState, setFormState] = useState<RiskFormState>(DEFAULT_FORM);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);

  const canUseSupabase = isSupabaseConfigured;
  const orgSlug = currentOrg?.slug ?? '';

  const engagement = useMemo(() => {
    if (!currentOrg || !engagementId) return null;
    return engagements.find((item) => item.id === engagementId) ?? null;
  }, [currentOrg, engagementId, engagements]);

  const selectedRisk = useMemo(
    () => risks.find((risk) => risk.id === selectedRiskId) ?? null,
    [risks, selectedRiskId],
  );

  const loadRegister = useCallback(async () => {
    if (!canUseSupabase || !orgSlug || !engagementId) return;
    try {
      setLoading(true);
      const data = await fetchRiskRegister({ orgSlug, engagementId });
      setRisks(data.risks);
      setSignals(data.signals);
      setActivity(data.activity);
      if (data.risks.length > 0 && !selectedRiskId) {
        setSelectedRiskId(data.risks[0].id);
      }
    } catch (error) {
      logger.error('risk_register.load_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to load risk register',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }, [canUseSupabase, orgSlug, engagementId, selectedRiskId, toast]);

  useEffect(() => {
    void loadRegister();
  }, [loadRegister]);

  const resetForm = () => {
    setFormState(DEFAULT_FORM);
    setSelectedRiskId(null);
  };

  const handleEdit = (risk: AuditRiskRecord) => {
    setSelectedRiskId(risk.id);
    setFormState({
      id: risk.id,
      code: risk.code ?? '',
      title: risk.title,
      description: risk.description ?? '',
      category: risk.category,
      assertions: risk.assertions.join(', '),
      likelihood: risk.likelihood,
      impact: risk.impact,
      inherentRating: risk.inherentRating,
      residualRating: risk.residualRating ?? '',
      ownerUserId: risk.ownerUserId ?? '',
    });
  };

  const handleSubmit = async () => {
    if (!canUseSupabase || !orgSlug || !engagementId) {
      toast({
        variant: 'destructive',
        title: 'Supabase not configured',
        description: 'Connect to the secure backend to persist risk assessments.',
      });
      return;
    }

    if (!formState.title.trim()) {
      toast({ variant: 'destructive', title: 'Title is required', description: 'Add a short title.' });
      return;
    }

    try {
      setSaving(true);
      await upsertRisk({
        orgSlug,
        engagementId,
        id: formState.id,
        code: formState.code || null,
        title: formState.title,
        description: formState.description || null,
        category: formState.category,
        assertions: formState.assertions.split(',').map((value) => value.trim()).filter(Boolean),
        likelihood: formState.likelihood,
        impact: formState.impact,
        inherentRating: formState.inherentRating,
        residualRating: formState.residualRating || null,
        ownerUserId: formState.ownerUserId || null,
        status: selectedRisk?.status ?? 'OPEN',
        analyticsSummary: selectedRisk?.analyticsSummary ?? {},
      });
      toast({ title: 'Risk saved', description: 'Risk register updated (ISA 315R).' });
      await loadRegister();
      resetForm();
    } catch (error) {
      logger.error('risk_register.save_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to save risk',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: string, residualRating?: string) => {
    if (!selectedRisk || !orgSlug || !engagementId) return;
    try {
      await updateRiskStatus({
        orgSlug,
        engagementId,
        id: selectedRisk.id,
        status,
        residualRating: residualRating || undefined,
      });
      toast({ title: 'Status updated', description: `Risk marked as ${status}.` });
      await loadRegister();
    } catch (error) {
      logger.error('risk_register.status_update_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to update status',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleSignal = async () => {
    if (!selectedRisk || !orgSlug || !engagementId) return;
    try {
      await recordRiskSignal({
        orgSlug,
        engagementId,
        riskId: selectedRisk.id,
        signalType: 'ANALYTICS',
        source: 'SYSTEM',
        severity: selectedRisk.inherentRating,
        metric: selectedRisk.analyticsSummary,
      });
      toast({ title: 'Signal recorded', description: 'Analytics signal stored for this risk.' });
      await loadRegister();
    } catch (error) {
      logger.error('risk_register.signal_record_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to record signal',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleActivityNote = async (note: string) => {
    if (!selectedRisk || !orgSlug || !engagementId || !note.trim()) return;
    try {
      await addRiskActivity({
        orgSlug,
        engagementId,
        riskId: selectedRisk.id,
        action: 'NOTE',
        notes: note,
      });
      await loadRegister();
    } catch (error) {
      logger.error('risk_register.activity_add_failed', error);
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
        <p className="text-muted-foreground">Select an engagement to review the risk register.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Risk Register</h1>
          <p className="text-muted-foreground">
            Identify risks of material misstatement and link analytics signals (ISA 315R)
          </p>
          {engagement && (
            <p className="mt-2 text-sm text-muted-foreground">
              Engagement: {engagement.title} · Period {engagement.periodStart} – {engagement.periodEnd}
            </p>
          )}
        </div>
        <Badge variant="outline">{risks.length} risks</Badge>
      </div>

      {!canUseSupabase && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase environment variables are not configured. Actions will render locally but API calls are skipped.
          Configure secure connectivity to persist risk assessments and analytics signals.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 border border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Registered risks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
            {risks.length === 0 && (
              <p className="text-sm text-muted-foreground">No risks captured yet. Add the first risk using the form.</p>
            )}
            {risks.map((risk) => (
              <button
                key={risk.id}
                onClick={() => handleEdit(risk)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition hover:border-primary/40 ${
                  risk.id === selectedRiskId ? 'border-primary/60 bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{risk.title}</span>
                  <Badge variant="outline" className="uppercase text-xs">
                    {risk.status.toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{risk.category.replace('_', ' ')}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Inherent {risk.inherentRating.toLowerCase()} · Likelihood {risk.likelihood.toLowerCase()} · Impact {risk.impact.toLowerCase()}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border border-primary/10 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{formState.id ? 'Edit risk' : 'Add risk'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reference</label>
                <Input
                  value={formState.code}
                  onChange={(event) => setFormState((prev) => ({ ...prev, code: event.target.value }))}
                  placeholder="e.g. R1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.category}
                  onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Title</label>
                <Input
                  value={formState.title}
                  onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Revenue completeness"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <Textarea
                  value={formState.description}
                  onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  placeholder="Describe the nature of the risk and financial statement impacts."
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Assertions</label>
                <Input
                  value={formState.assertions}
                  onChange={(event) => setFormState((prev) => ({ ...prev, assertions: event.target.value }))}
                  placeholder="Existence, Completeness"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Likelihood</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.likelihood}
                  onChange={(event) => setFormState((prev) => ({ ...prev, likelihood: event.target.value }))}
                >
                  {RATING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Impact</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.impact}
                  onChange={(event) => setFormState((prev) => ({ ...prev, impact: event.target.value }))}
                >
                  {RATING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Inherent rating</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.inherentRating}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, inherentRating: event.target.value }))
                  }
                >
                  {RATING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Residual rating (optional)</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.residualRating}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, residualRating: event.target.value }))
                  }
                >
                  <option value="">Select</option>
                  {RATING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="gradient" onClick={handleSubmit} loading={saving}>
                {formState.id ? 'Update risk' : 'Create risk'}
              </Button>
              {selectedRisk && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('MONITORED', formState.residualRating || undefined)}
                  >
                    Mark monitored
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange('CLOSED', formState.residualRating || undefined)}
                  >
                    Close risk
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSignal}>
                    Record signal
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedRisk && (
        <Card className="border border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Analytics & history</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Latest signals
              </h3>
              <Separator className="my-3" />
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {signals.filter((signal) => signal.riskId === selectedRisk.id).length === 0 && (
                  <p className="text-sm text-muted-foreground">No signals recorded for this risk yet.</p>
                )}
                {signals
                  .filter((signal) => signal.riskId === selectedRisk.id)
                  .map((signal) => (
                    <div key={signal.id} className="rounded-md border border-border px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{signal.signalType}</span>
                        <Badge variant="outline">{signal.severity.toLowerCase()}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(signal.detectedAt), 'dd MMM yyyy HH:mm')}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Activity log
              </h3>
              <Separator className="my-3" />
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {activity.filter((entry) => entry.riskId === selectedRisk.id).length === 0 && (
                  <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                )}
                {activity
                  .filter((entry) => entry.riskId === selectedRisk.id)
                  .map((entry) => (
                    <div key={entry.id} className="rounded-md border border-border px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium uppercase tracking-wide">
                          {entry.action}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm')}
                        </span>
                      </div>
                      {entry.notes && <p className="mt-1 text-sm">{entry.notes}</p>}
                    </div>
                  ))}
              </div>
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Add reviewer note"
                  rows={3}
                  onBlur={(event) => {
                    if (event.target.value.trim().length > 0) {
                      void handleActivityNote(event.target.value);
                      event.target.value = '';
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Blur the field to save. Notes persist to the audit trail (ISA 230).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

export default AuditRiskRegisterPage;
