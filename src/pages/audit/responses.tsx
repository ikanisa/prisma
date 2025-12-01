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
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  fetchRiskRegister,
  type AuditRiskRecord,
} from '@/lib/audit-risk-service';
import {
  addRiskActivity,
} from '@/lib/audit-risk-service';
import {
  fetchResponses,
  recordResponseCheck,
  updateResponseStatus,
  upsertResponse,
  type AuditResponseRecord,
  type AuditResponseCheckRecord,
} from '@/lib/audit-responses-service';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const RESPONSE_TYPES = [
  { value: 'CONTROL', label: 'Control reliance' },
  { value: 'SUBSTANTIVE', label: 'Substantive procedures' },
  { value: 'ANALYTICS', label: 'Analytics' },
  { value: 'SAMPLING', label: 'Sampling' },
  { value: 'OTHER', label: 'Other' },
];

const RESPONSE_STATUS = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const RATING_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'HIGH', label: 'High' },
  { value: 'SIGNIFICANT', label: 'Significant' },
];

interface ResponseFormState {
  id?: string;
  riskId: string;
  responseType: string;
  title: string;
  objective: string;
  procedure: string;
  linkage: string;
  ownership: string;
  coverageAssertions: string;
  plannedEffectiveness: string;
  status: string;
}

const DEFAULT_FORM: ResponseFormState = {
  riskId: '',
  responseType: 'CONTROL',
  title: '',
  objective: '',
  procedure: '',
  linkage: '',
  ownership: '',
  coverageAssertions: '',
  plannedEffectiveness: 'MODERATE',
  status: 'PLANNED',
};

export default function AuditResponsesPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const { currentOrg } = useOrganizations();
  const { data: engagements = [] } = useEngagements(currentOrg?.id ?? undefined);
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [risks, setRisks] = useState<AuditRiskRecord[]>([]);
  const [responses, setResponses] = useState<AuditResponseRecord[]>([]);
  const [checks, setChecks] = useState<AuditResponseCheckRecord[]>([]);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ResponseFormState>(DEFAULT_FORM);
  const [checkNote, setCheckNote] = useState('');
  const [completeness, setCompleteness] = useState(false);

  const canUseSupabase = isSupabaseConfigured;
  const orgSlug = currentOrg?.slug ?? '';

  const engagement = useMemo(() => {
    if (!currentOrg || !engagementId) return null;
    return engagements.find((item) => item.id === engagementId) ?? null;
  }, [currentOrg, engagementId, engagements]);

  const filteredResponses = useMemo(() => {
    if (!selectedRiskId) return [];
    return responses.filter((response) => response.riskId === selectedRiskId);
  }, [responses, selectedRiskId]);

  const loadData = useCallback(async () => {
    if (!canUseSupabase || !orgSlug || !engagementId) return;
    try {
      setLoading(true);
      const [riskData, responseData] = await Promise.all([
        fetchRiskRegister({ orgSlug, engagementId }),
        fetchResponses({ orgSlug, engagementId }),
      ]);
      setRisks(riskData.risks);
      setResponses(responseData.responses);
      setChecks(responseData.checks);
      if (!selectedRiskId && riskData.risks.length > 0) {
        setSelectedRiskId(riskData.risks[0].id);
      }
    } catch (error) {
      logger.error('responses.load_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to load responses matrix',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }, [canUseSupabase, orgSlug, engagementId, selectedRiskId, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRiskSelect = (riskId: string) => {
    setSelectedRiskId(riskId);
    setFormState((prev) => ({ ...DEFAULT_FORM, riskId }));
  };

  const handleEdit = (response: AuditResponseRecord) => {
    setFormState({
      id: response.id,
      riskId: response.riskId,
      responseType: response.responseType,
      title: response.title,
      objective: response.objective ?? '',
      procedure: JSON.stringify(response.procedure, null, 2),
      linkage: JSON.stringify(response.linkage, null, 2),
      ownership: JSON.stringify(response.ownership, null, 2),
      coverageAssertions: response.coverageAssertions.join(', '),
      plannedEffectiveness: response.plannedEffectiveness,
      status: response.status,
    });
  };

  const handleFormSubmit = async () => {
    if (!canUseSupabase || !orgSlug || !engagementId) {
      toast({
        variant: 'destructive',
        title: 'Supabase not configured',
        description: 'Connect to the secure backend to store responses.',
      });
      return;
    }
    if (!formState.riskId) {
      toast({ variant: 'destructive', title: 'Risk required', description: 'Select a risk first.' });
      return;
    }
    if (!formState.title.trim()) {
      toast({ variant: 'destructive', title: 'Title required', description: 'Add a summary title.' });
      return;
    }

    try {
      setSaving(true);
      await upsertResponse({
        orgSlug,
        engagementId,
        id: formState.id,
        riskId: formState.riskId,
        responseType: formState.responseType,
        title: formState.title,
        objective: formState.objective || null,
        procedure: safeJsonParse(formState.procedure),
        linkage: safeJsonParse(formState.linkage),
        ownership: safeJsonParse(formState.ownership),
        coverageAssertions: formState.coverageAssertions
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        plannedEffectiveness: formState.plannedEffectiveness,
        status: formState.status,
      });
      toast({ title: 'Response saved', description: 'Planned response updated (ISA 330).' });
      await loadData();
      setFormState((prev) => ({ ...DEFAULT_FORM, riskId: prev.riskId }));
    } catch (error) {
      logger.error('responses.save_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to save response',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (response: AuditResponseRecord, status: string) => {
    if (!canUseSupabase || !orgSlug || !engagementId) return;
    try {
      await updateResponseStatus({ orgSlug, engagementId, id: response.id, status });
      toast({ title: 'Status updated', description: `Response marked ${status}.` });
      await loadData();
    } catch (error) {
      logger.error('responses.status_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to update status',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleCompletenessSubmit = async () => {
    if (!canUseSupabase || !orgSlug || !engagementId || !selectedRiskId) return;
    if (!filteredResponses.length) {
      toast({ variant: 'destructive', title: 'Add responses first', description: 'Capture at least one response.' });
      return;
    }
    try {
      const firstResponse = filteredResponses[0];
      await recordResponseCheck({
        orgSlug,
        engagementId,
        responseId: firstResponse.id,
        completeness,
        conclusions: checkNote || undefined,
      });
      toast({ title: 'Completeness recorded', description: 'Manager review stored (ISA 330).' });
      await loadData();
      setCheckNote('');
      setCompleteness(false);
    } catch (error) {
      logger.error('responses.check_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to record check',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  if (!currentOrg || !engagementId) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Select an engagement to manage responses.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Responses Matrix</h1>
          <p className="text-muted-foreground">
            Design and track responses to risks (ISA 330) with completeness checks
          </p>
          {engagement && (
            <p className="mt-2 text-sm text-muted-foreground">
              Engagement: {engagement.title} · Period {engagement.periodStart} – {engagement.periodEnd}
            </p>
          )}
        </div>
        <Badge variant="outline">{responses.length} responses</Badge>
      </div>

      {!canUseSupabase && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase environment variables are not configured. Actions will render locally but API calls are skipped.
          Configure secure connectivity to persist responses and completeness checks.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 border border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Identified risks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {risks.map((risk) => (
              <button
                key={risk.id}
                onClick={() => handleRiskSelect(risk.id)}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-left transition hover:border-primary/40',
                  risk.id === selectedRiskId ? 'border-primary/60 bg-primary/5' : 'border-border',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{risk.title}</span>
                  <Badge variant="outline" className="uppercase text-xs">
                    {risk.status.toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{risk.category.replace('_', ' ')}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>{formState.id ? 'Edit response' : 'Add response'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Response type</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.responseType}
                  onChange={(event) => setFormState((prev) => ({ ...prev, responseType: event.target.value }))}
                >
                  {RESPONSE_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Planned effectiveness</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.plannedEffectiveness}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, plannedEffectiveness: event.target.value }))
                  }
                >
                  {RATING_OPTIONS.map((option) => (
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
                  placeholder="Design and perform cutoff testing over revenue"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Objective</label>
                <Textarea
                  value={formState.objective}
                  onChange={(event) => setFormState((prev) => ({ ...prev, objective: event.target.value }))}
                  rows={3}
                  placeholder="Confirm revenue transactions recorded in correct period."
                />
              </div>
              <div className="md:col-span-2 grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Procedure (JSON)</label>
                <Textarea
                  value={formState.procedure}
                  onChange={(event) => setFormState((prev) => ({ ...prev, procedure: event.target.value }))}
                  rows={6}
                  placeholder='{ "steps": ["Obtain population", "Select high value transactions"], "sample": {"size": 30}}'
                />
              </div>
              <div className="md:col-span-2 grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Linkage (JSON)</label>
                <Textarea
                  value={formState.linkage}
                  onChange={(event) => setFormState((prev) => ({ ...prev, linkage: event.target.value }))}
                  rows={4}
                  placeholder='{ "controls": ["CTRL-1"], "analytics": ["ADA-5"] }'
                />
              </div>
              <div className="md:col-span-2 grid gap-2">
                <label className="text-sm font-medium text-muted-foreground">Ownership (JSON)</label>
                <Textarea
                  value={formState.ownership}
                  onChange={(event) => setFormState((prev) => ({ ...prev, ownership: event.target.value }))}
                  rows={3}
                  placeholder='{ "preparer": "user-1", "reviewer": "user-2" }'
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Coverage assertions</label>
                <Input
                  value={formState.coverageAssertions}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, coverageAssertions: event.target.value }))
                  }
                  placeholder="Existence, Completeness"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.status}
                  onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))}
                >
                  {RESPONSE_STATUS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="gradient" onClick={handleFormSubmit} loading={saving} disabled={!selectedRiskId}>
                {formState.id ? 'Update response' : 'Create response'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle>Responses for selected risk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredResponses.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No responses captured yet. Use the form above to add planned procedures.
            </p>
          )}

          {filteredResponses.map((response) => (
            <div key={response.id} className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{response.title}</h3>
                  {response.objective && (
                    <p className="text-sm text-muted-foreground">{response.objective}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{response.responseType.toLowerCase()}</Badge>
                  <Badge variant="outline">{response.status.toLowerCase()}</Badge>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Planned effectiveness</p>
                  <p className="text-sm font-medium">{response.plannedEffectiveness}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Coverage assertions</p>
                  <p className="text-sm font-medium">
                    {response.coverageAssertions.length ? response.coverageAssertions.join(', ') : '—'}
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange(response, 'IN_PROGRESS')}>
                    Start
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange(response, 'COMPLETED')}>
                    Complete
                  </Button>
                </div>
              </div>

              <button className="text-sm text-primary underline" onClick={() => handleEdit(response)}>
                Edit response
              </button>
            </div>
          ))}

          <Separator />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Completeness check
            </h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={completeness}
                  onChange={(event) => setCompleteness(event.target.checked)}
                />
                Responses cover assertions and planned procedures are sufficient
              </label>
            </div>
            <Textarea
              value={checkNote}
              onChange={(event) => setCheckNote(event.target.value)}
              rows={3}
              placeholder="Reviewer conclusions"
            />
            <Button variant="outline" size="sm" onClick={handleCompletenessSubmit}>
              Record check
            </Button>

            <div className="space-y-2">
              <h4 className="text-xs uppercase text-muted-foreground">Previous checks</h4>
              {checks.filter((check) => filteredResponses.some((response) => response.id === check.responseId)).length === 0 ? (
                <p className="text-sm text-muted-foreground">No completeness checks recorded yet.</p>
              ) : (
                checks
                  .filter((check) => filteredResponses.some((response) => response.id === check.responseId))
                  .map((check) => (
                    <div key={check.id} className="rounded-md border border-border px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {check.completeness ? 'Complete' : 'Incomplete'}
                        </span>
                        {check.reviewedAt && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(check.reviewedAt), 'dd MMM yyyy HH:mm')}
                          </span>
                        )}
                      </div>
                      {check.conclusions && <p className="mt-1 text-sm">{check.conclusions}</p>}
                    </div>
                  ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function safeJsonParse(value: string) {
  if (!value.trim()) return {};
  try {
    return JSON.parse(value);
  } catch (error) {
    logger.warn('responses.json_parse_failed', error);
    return {};
  }
}
