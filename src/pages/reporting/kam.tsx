import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, FileJson, FileText, Loader2, Plus, Send, ShieldCheck } from 'lucide-react';

import { useOrganizations } from '@/hooks/use-organizations';
import { useKamModule, findDraftByCandidate, candidateStatusLabel } from '@/hooks/use-kam-module';
import { useAcceptanceStatus } from '@/hooks/use-acceptance-status';
import { supabase } from '@/integrations/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

import type { KamCandidate, KamDraft, ApprovalQueueItem } from '@/lib/kam-service';
import { fetchResponses } from '@/lib/audit-responses-service';
import { fetchRiskRegister, type AuditRiskRecord } from '@/lib/audit-risk-service';
import { buildKamMarkdown, buildKamJson } from '@/utils/kam-export';

const statusColor: Record<KamCandidate['status'], string> = {
  CANDIDATE: 'bg-slate-100 text-slate-800',
  SELECTED: 'bg-emerald-100 text-emerald-800',
  EXCLUDED: 'bg-rose-100 text-rose-800',
};

const sourceColor: Record<KamCandidate['source'], string> = {
  RISK: 'bg-amber-100 text-amber-800',
  ESTIMATE: 'bg-purple-100 text-purple-800',
  GOING_CONCERN: 'bg-cyan-100 text-cyan-800',
  OTHER: 'bg-gray-100 text-gray-800',
};
type ProcedureRow = {
  id: string;
  title: string;
  objective?: string | null;
  coverageAssertions?: string[];
};

type DocumentRow = {
  id: string;
  name: string;
  created_at: string;
};

type EstimateOption = {
  id: string;
  caption: string;
  uncertainty_level?: string | null;
};

type GoingConcernOption = {
  id: string;
  assessment: string;
  conclusion?: string | null;
};

type ProcedureSelection = Record<string, { isaRefs: string[] }>; // key = procedureId
type EvidenceSelection = Record<string, { evidenceId?: string; documentId?: string; note: string }>; // key prefixed with type

type DraftFormState = {
  heading: string;
  why: string;
  how: string;
  results: string;
  procedures: ProcedureSelection;
  evidence: EvidenceSelection;
};

const emptyDraftState: DraftFormState = {
  heading: '',
  why: '',
  how: '',
  results: '',
  procedures: {},
  evidence: {},
};

function ApprovalTimeline({
  approvals,
  role,
  onDecision,
}: {
  approvals: ApprovalQueueItem[];
  role: 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN' | null | undefined;
  onDecision?: (approvalId: string, decision: 'APPROVED' | 'REJECTED') => void;
}) {
  if (!approvals.length) {
    return (
      <div className="text-sm text-muted-foreground">No approval requests queued yet.</div>
    );
  }

  const stageOrder: Record<ApprovalQueueItem['stage'], number> = { MANAGER: 1, PARTNER: 2, EQR: 3 };
  const sorted = [...approvals].sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage] || a.created_at.localeCompare(b.created_at));

  return (
    <div className="space-y-3">
      {sorted.map((item) => (
        <div key={item.id} className="flex items-start gap-3">
          <div className="mt-1">
            {item.status === 'APPROVED' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : item.status === 'REJECTED' ? (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div>
            <div className="text-sm font-medium">
              {item.stage} review — <span className="capitalize">{item.status.toLowerCase()}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Requested {new Date(item.created_at).toLocaleString()}
            </div>
            {item.resolution_note && (
              <div className="text-xs text-muted-foreground mt-1">{item.resolution_note}</div>
            )}
            {role && (role === 'MANAGER' || role === 'SYSTEM_ADMIN') && item.status === 'PENDING' && onDecision && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => onDecision(item.id, 'APPROVED')}>
                  Approve
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDecision(item.id, 'REJECTED')}>
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function KamReportingPage() {
  const { engagementId, orgSlug } = useParams<{ engagementId: string; orgSlug: string }>();
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const kam = useKamModule(engagementId ?? null);
  const acceptanceStatus = useAcceptanceStatus(engagementId ?? null);

  const acceptanceApproved =
    acceptanceStatus.data?.status?.status === 'APPROVED' && acceptanceStatus.data?.status?.decision === 'ACCEPT';

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<DraftFormState>(emptyDraftState);

  const candidates = useMemo(() => kam.data?.candidates ?? [], [kam.data]);
  const drafts = useMemo(() => kam.data?.drafts ?? [], [kam.data]);
  const approvals = useMemo(() => kam.data?.approvals ?? [], [kam.data]);
  const userRole = kam.data?.role ?? null;

  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId],
  );

  const selectedDraft = useMemo(
    () => (selectedCandidateId ? findDraftByCandidate(drafts, selectedCandidateId) ?? null : null),
    [drafts, selectedCandidateId],
  );

  const proceduresQuery = useQuery<ProcedureRow[]>({
    queryKey: ['kam-procedures', currentOrg?.slug, engagementId],
    queryFn: async () => {
      const { responses } = await fetchResponses({
        orgSlug: currentOrg!.slug,
        engagementId: engagementId!,
      });
      return responses.map((response) => ({
        id: response.id,
        title: response.title,
        objective: response.objective ?? '',
        coverageAssertions: response.coverageAssertions,
      }));
    },
    enabled: Boolean(currentOrg?.slug && engagementId),
    staleTime: 60_000,
  });

  const documentsQuery = useQuery<DocumentRow[]>({
    queryKey: ['kam-documents', currentOrg?.slug, engagementId],
    queryFn: async () => {
      const documentsTable = supabase.from('documents') as any;
      const response = await documentsTable
        .select('id, name, created_at')
        .eq('org_id', currentOrg!.id)
        .eq('engagement_id', engagementId!);
      const { data, error } = response as {
        data: Array<{ id: string; name: string; created_at: string | null }> | null;
        error: PostgrestError | null;
      };
      if (error) throw new Error(error.message);
      return (data ?? []).map(({ id, name, created_at }) => ({
        id,
        name,
        created_at: created_at ?? new Date().toISOString(),
      }));
    },
    enabled: Boolean(currentOrg?.slug && engagementId),
    staleTime: 60_000,
  });

  const risksQuery = useQuery<AuditRiskRecord[]>({
    queryKey: ['kam-risks', currentOrg?.slug, engagementId],
    queryFn: async () => {
      const { risks } = await fetchRiskRegister({
        orgSlug: currentOrg!.slug,
        engagementId: engagementId!,
      });
      return risks;
    },
    enabled: Boolean(currentOrg?.slug && engagementId),
    staleTime: 60_000,
  });

  const estimateOptions: EstimateOption[] = [];
  const goingConcernOptions: GoingConcernOption[] = [];

  useEffect(() => {
    if (!selectedDraft) {
      setDraftState({ ...emptyDraftState });
      return;
    }
    const procedureSelections: ProcedureSelection = {};
    const evidenceSelections: EvidenceSelection = {};

    if (Array.isArray(selectedDraft.procedures_refs)) {
      for (const ref of selectedDraft.procedures_refs as any[]) {
        if (!ref?.procedureId) continue;
        procedureSelections[ref.procedureId] = {
          isaRefs: Array.isArray(ref.isaRefs)
            ? ref.isaRefs.filter((entry: unknown): entry is string => typeof entry === 'string')
            : [],
        };
      }
    }

    if (Array.isArray(selectedDraft.evidence_refs)) {
      for (const ref of selectedDraft.evidence_refs as any[]) {
        const key = ref?.evidenceId ? `evidence:${ref.evidenceId}` : ref?.documentId ? `document:${ref.documentId}` : null;
        if (!key) continue;
        evidenceSelections[key] = {
          evidenceId: ref.evidenceId ?? undefined,
          documentId: ref.documentId ?? undefined,
          note: typeof ref.note === 'string' ? ref.note : '',
        };
      }
    }

    setDraftState({
      heading: selectedDraft.heading ?? '',
      why: selectedDraft.why_kam ?? '',
      how: selectedDraft.how_addressed ?? '',
      results: selectedDraft.results_summary ?? '',
      procedures: procedureSelections,
      evidence: evidenceSelections,
    });
  }, [selectedDraft]);

  const isDraftEditable = Boolean(selectedDraft && selectedDraft.status !== 'APPROVED');

  const linkedEvidenceEntries = useMemo(
    () => Object.entries(draftState.evidence).filter(([key]) => key.startsWith('evidence:')),
    [draftState.evidence],
  );

  const handleToggleProcedure = (procedure: ProcedureRow) => {
    setDraftState((prev) => {
      const nextProcedures = { ...prev.procedures };
      if (nextProcedures[procedure.id]) {
        delete nextProcedures[procedure.id];
      } else {
        const defaults = Array.isArray(procedure.coverageAssertions)
          ? procedure.coverageAssertions.filter((entry): entry is string => typeof entry === 'string')
          : [];
        nextProcedures[procedure.id] = { isaRefs: defaults };
      }
      return { ...prev, procedures: nextProcedures };
    });
  };

  const updateProcedureIsaRefs = (procedureId: string, value: string) => {
    setDraftState((prev) => ({
      ...prev,
      procedures: {
        ...prev.procedures,
        [procedureId]: {
          isaRefs: value
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean),
        },
      },
    }));
  };

  const handleToggleEvidence = (entry: { type: 'evidence' | 'document'; id: string }) => {
    const key = `${entry.type}:${entry.id}`;
    setDraftState((prev) => {
      const nextEvidence = { ...prev.evidence };
      if (nextEvidence[key]) {
        delete nextEvidence[key];
      } else {
        nextEvidence[key] = {
          evidenceId: entry.type === 'evidence' ? entry.id : undefined,
          documentId: entry.type === 'document' ? entry.id : undefined,
          note: '',
        };
      }
      return { ...prev, evidence: nextEvidence };
    });
  };

  const updateEvidenceNote = (key: string, value: string) => {
    setDraftState((prev) => ({
      ...prev,
      evidence: {
        ...prev.evidence,
        [key]: {
          ...prev.evidence[key],
          note: value,
        },
      },
    }));
  };

  const handleSaveDraft = async () => {
    if (!selectedDraft) return;
    try {
      await kam.updateDraft.mutateAsync({
        draftId: selectedDraft.id,
        heading: draftState.heading,
        whyKam: draftState.why,
        howAddressed: draftState.how,
        resultsSummary: draftState.results,
        proceduresRefs: Object.entries(draftState.procedures).map(([procedureId, value]) => ({
          procedureId,
          isaRefs: value.isaRefs,
        })),
        evidenceRefs: Object.entries(draftState.evidence).map(([key, value]) => ({
          evidenceId: value.evidenceId,
          documentId: value.documentId,
          note: value.note || undefined,
        })),
      });
      toast({ title: 'Draft saved', description: 'KAM draft details updated.' });
    } catch (error: any) {
      toast({ title: 'Failed to save draft', description: error.message, variant: 'destructive' });
    }
  };

  const handleSubmitDraft = async () => {
    if (!selectedDraft) return;
    if (Object.keys(draftState.procedures).length === 0 || Object.keys(draftState.evidence).length === 0) {
      toast({
        title: 'References required',
        description: 'Add at least one procedure and evidence reference before submission.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await handleSaveDraft();
      await kam.submitDraft.mutateAsync(selectedDraft.id);
      toast({ title: 'Draft submitted', description: 'Approval requests queued.' });
    } catch (error: any) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleApprovalDecision = async (approvalId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await kam.decideApproval.mutateAsync({ approvalId, decision });
      toast({
        title: `Approval ${decision.toLowerCase()}`,
        description: `Stage marked as ${decision.toLowerCase()}.`,
      });
    } catch (error: any) {
      toast({ title: 'Decision failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleSelectCandidate = async (candidateId: string, reason?: string) => {
    try {
      await kam.selectCandidate.mutateAsync({ candidateId, reason });
      toast({ title: 'Candidate selected', description: 'Candidate marked for drafting.' });
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleExcludeCandidate = async (candidateId: string, reason?: string) => {
    try {
      await kam.excludeCandidate.mutateAsync({ candidateId, reason });
      toast({ title: 'Candidate excluded', description: 'Candidate excluded from KAM consideration.' });
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreateDraft = async (candidateId: string) => {
    try {
      const { draft } = await kam.createDraft.mutateAsync({ candidateId });
      setSelectedCandidateId(candidateId);
      toast({ title: 'Draft ready', description: 'Draft created from candidate.' });
      setDraftState({
        heading: draft.heading ?? '',
        why: draft.why_kam ?? '',
        how: draft.how_addressed ?? '',
        results: draft.results_summary ?? '',
        procedures: {},
        evidence: {},
      });
    } catch (error: any) {
      toast({ title: 'Draft creation failed', description: error.message, variant: 'destructive' });
    }
  };

  const [newCandidate, setNewCandidate] = useState({
    title: '',
    rationale: '',
    source: 'OTHER' as KamCandidate['source'],
    riskId: '',
    estimateId: '',
    goingConcernId: '',
  });

  const handleAddCandidate = async () => {
    if (!engagementId) return;
    if (!newCandidate.title.trim()) {
      toast({ title: 'Title required', description: 'Provide a short title for the candidate.', variant: 'destructive' });
      return;
    }
    try {
      await kam.addCandidate.mutateAsync({
        orgSlug: currentOrg!.slug,
        engagementId,
        title: newCandidate.title,
        rationale: newCandidate.rationale,
        source: newCandidate.source,
        riskId: newCandidate.source === 'RISK' ? newCandidate.riskId || undefined : undefined,
        estimateId: newCandidate.source === 'ESTIMATE' ? newCandidate.estimateId || undefined : undefined,
        goingConcernId: newCandidate.source === 'GOING_CONCERN' ? newCandidate.goingConcernId || undefined : undefined,
      });
      setNewCandidate({ title: '', rationale: '', source: 'OTHER', riskId: '', estimateId: '', goingConcernId: '' });
      toast({ title: 'Candidate added', description: 'New KAM candidate created.' });
    } catch (error: any) {
      toast({ title: 'Creation failed', description: error.message, variant: 'destructive' });
    }
  };

  const exportMarkdown = useMemo(() => buildKamMarkdown(selectedDraft ?? undefined), [selectedDraft]);
  const exportJson = useMemo(() => buildKamJson(selectedDraft ?? undefined), [selectedDraft]);

  if (acceptanceStatus.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Checking acceptance…
      </div>
    );
  }

  if (!acceptanceApproved) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>KAM module locked</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Complete engagement acceptance and obtain Partner approval before working on Key Audit Matters.</p>
          <Button asChild>
            <Link to={`/${orgSlug}/engagements/${engagementId}/acceptance`}>Go to acceptance workflow</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Key Audit Matters</h1>
          <p className="text-muted-foreground">Manage candidate selection, drafting, approvals, and exports.</p>
          <p className="text-xs text-muted-foreground mt-1">
            <Link to={`/${currentOrg?.slug}/engagements`} className="underline">Back to engagements</Link>
          </p>
        </div>
        <Badge variant="outline">Engagement: {engagementId ?? 'N/A'}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add candidate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="candidate-title">Title</Label>
                <Input
                  id="candidate-title"
                  value={newCandidate.title}
                  onChange={(event) => setNewCandidate((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="e.g. Revenue recognition for bundled contracts"
                />
              </div>
              <div>
                <Label htmlFor="candidate-rationale">Rationale</Label>
                <Textarea
                  id="candidate-rationale"
                  value={newCandidate.rationale}
                  onChange={(event) => setNewCandidate((prev) => ({ ...prev, rationale: event.target.value }))}
                  placeholder="Summarise why the matter may be a KAM"
                  rows={3}
                />
              </div>
              <div>
                <Label>Source</Label>
                <Select
                  value={newCandidate.source}
                  onValueChange={(value: KamCandidate['source']) => setNewCandidate((prev) => ({ ...prev, source: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RISK">Significant Risk</SelectItem>
                    <SelectItem value="ESTIMATE">Estimate Register</SelectItem>
                    <SelectItem value="GOING_CONCERN">Going Concern</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newCandidate.source === 'RISK' && (
                <div>
                  <Label>Link to risk</Label>
                  <Select
                    value={newCandidate.riskId}
                    onValueChange={(value) => setNewCandidate((prev) => ({ ...prev, riskId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk" />
                    </SelectTrigger>
                    <SelectContent>
                      {risksQuery.data?.map((risk) => (
                        <SelectItem key={risk.id} value={risk.id}>
                          {risk.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {newCandidate.source === 'ESTIMATE' && (
                <div>
                  <Label>Link to estimate</Label>
                  <Select
                    value={newCandidate.estimateId}
                    onValueChange={(value) => setNewCandidate((prev) => ({ ...prev, estimateId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Estimates coming soon" />
                    </SelectTrigger>
                    <SelectContent>
                      {estimateOptions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No estimates available yet.</div>
                      ) : (
                        estimateOptions.map((estimate) => (
                          <SelectItem key={estimate.id} value={estimate.id}>
                            {estimate.caption} {estimate.uncertainty_level ? `(${estimate.uncertainty_level})` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {newCandidate.source === 'GOING_CONCERN' && (
                <div>
                  <Label>Link to GC worksheet</Label>
                  <Select
                    value={newCandidate.goingConcernId}
                    onValueChange={(value) => setNewCandidate((prev) => ({ ...prev, goingConcernId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Going concern data coming soon" />
                    </SelectTrigger>
                    <SelectContent>
                      {goingConcernOptions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No going concern worksheets yet.</div>
                      ) : (
                        goingConcernOptions.map((worksheet) => (
                          <SelectItem key={worksheet.id} value={worksheet.id}>
                            {worksheet.assessment} — {worksheet.conclusion ?? 'No conclusion captured'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button className="w-full" onClick={handleAddCandidate} disabled={kam.addCandidate.isPending}>
                {kam.addCandidate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span className="ml-2">Add candidate</span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Candidates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[420px]">
                <div className="space-y-3 p-4">
                  {kam.isLoading && <div className="text-sm text-muted-foreground">Loading candidates…</div>}
                  {!kam.isLoading && candidates.length === 0 && (
                    <div className="text-sm text-muted-foreground">No candidates captured yet.</div>
                  )}
                  {candidates.map((candidate) => {
                    const isSelected = candidate.id === selectedCandidateId;
                    const activateCandidate = () => setSelectedCandidateId(candidate.id);
                    const handleCandidateKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        activateCandidate();
                      }
                    };

                    return (
                      <div
                        key={candidate.id}
                        role="button"
                        tabIndex={0}
                        onClick={activateCandidate}
                        onKeyDown={handleCandidateKeyDown}
                        className={`w-full text-left border rounded-lg p-3 transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                          isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium text-sm">{candidate.title}</h3>
                          <Badge className={sourceColor[candidate.source]}>{candidate.source.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{candidate.rationale ?? 'No rationale recorded yet.'}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge className={statusColor[candidate.status]}>{candidateStatusLabel(candidate)}</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(candidate.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          {candidate.status !== 'SELECTED' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleSelectCandidate(candidate.id);
                              }}
                            >
                              Shortlist
                            </Button>
                          )}
                          {candidate.status !== 'EXCLUDED' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleExcludeCandidate(candidate.id);
                              }}
                            >
                              Exclude
                            </Button>
                          )}
                          {candidate.status === 'SELECTED' && (
                            <Button
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleCreateDraft(candidate.id);
                              }}
                            >
                              Open draft
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Draft editor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedCandidate && (
                <div className="text-sm text-muted-foreground">
                  Select a candidate to begin drafting the Key Audit Matter narrative.
                </div>
              )}

              {selectedCandidate && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge>{candidateStatusLabel(selectedCandidate)}</Badge>
                    <Badge variant="outline">Source: {selectedCandidate.source}</Badge>
                  </div>
                  <div>
                    <Label htmlFor="draft-heading">Heading</Label>
                    <Input
                      id="draft-heading"
                      value={draftState.heading}
                      disabled={!isDraftEditable}
                      onChange={(event) => setDraftState((prev) => ({ ...prev, heading: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="draft-why">Why it was a KAM</Label>
                    <Textarea
                      id="draft-why"
                      value={draftState.why}
                      disabled={!isDraftEditable}
                      onChange={(event) => setDraftState((prev) => ({ ...prev, why: event.target.value }))}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="draft-how">How we addressed the matter</Label>
                    <Textarea
                      id="draft-how"
                      value={draftState.how}
                      disabled={!isDraftEditable}
                      onChange={(event) => setDraftState((prev) => ({ ...prev, how: event.target.value }))}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="draft-results">Results</Label>
                    <Textarea
                      id="draft-results"
                      value={draftState.results}
                      disabled={!isDraftEditable}
                      onChange={(event) => setDraftState((prev) => ({ ...prev, results: event.target.value }))}
                      rows={4}
                    />
                  </div>

                  <Separator />

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Procedures referenced</h3>
                      {proceduresQuery.isLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
                    </div>
                    <div className="space-y-3">
                      {proceduresQuery.data?.map((procedure) => {
                        const checked = Boolean(draftState.procedures[procedure.id]);
                        return (
                          <div key={procedure.id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{procedure.title}</div>
                                {procedure.objective && (
                                  <div className="text-xs text-muted-foreground">{procedure.objective}</div>
                                )}
                              </div>
                              <Button
                                variant={checked ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleToggleProcedure(procedure)}
                                disabled={!isDraftEditable}
                              >
                                {checked ? 'Remove' : 'Link'}
                              </Button>
                            </div>
                            {checked && (
                              <div>
                                <Label className="text-xs">ISA references (comma separated)</Label>
                                <Input
                                  value={draftState.procedures[procedure.id]?.isaRefs.join(', ') ?? ''}
                                  onChange={(event) => updateProcedureIsaRefs(procedure.id, event.target.value)}
                                  disabled={!isDraftEditable}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {!proceduresQuery.isLoading && !proceduresQuery.data?.length && (
                        <div className="text-xs text-muted-foreground">No planned procedures captured for this engagement.</div>
                      )}
                    </div>
                  </section>

                  <Separator />

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Evidence references</h3>
                      {documentsQuery.isLoading && (
                        <span className="text-xs text-muted-foreground">Loading…</span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {linkedEvidenceEntries.map(([key, value]) => {
                        const evidenceId = value.evidenceId ?? key.split(':')[1] ?? '';
                        const checked = Boolean(draftState.evidence[key]);
                        return (
                          <div key={key} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">Evidence {evidenceId.slice(0, 8)}</div>
                                <div className="text-xs text-muted-foreground">Linked legacy evidence record</div>
                              </div>
                              <Button
                                variant={checked ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleToggleEvidence({ type: 'evidence', id: evidenceId })}
                                disabled={!isDraftEditable}
                              >
                                {checked ? 'Remove' : 'Link'}
                              </Button>
                            </div>
                            {checked && (
                              <div>
                                <Label className="text-xs">Note</Label>
                                <Input
                                  value={draftState.evidence[key]?.note ?? ''}
                                  onChange={(event) => updateEvidenceNote(key, event.target.value)}
                                  disabled={!isDraftEditable}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {documentsQuery.data?.map((document) => {
                        const key = `document:${document.id}`;
                        const checked = Boolean(draftState.evidence[key]);
                        return (
                          <div key={key} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">Document — {document.name}</div>
                              </div>
                              <Button
                                variant={checked ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleToggleEvidence({ type: 'document', id: document.id })}
                                disabled={!isDraftEditable}
                              >
                                {checked ? 'Remove' : 'Link'}
                              </Button>
                            </div>
                            {checked && (
                              <div>
                                <Label className="text-xs">Note</Label>
                                <Input
                                  value={draftState.evidence[key]?.note ?? ''}
                                  onChange={(event) => updateEvidenceNote(key, event.target.value)}
                                  disabled={!isDraftEditable}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {!documentsQuery.isLoading && !documentsQuery.data?.length && linkedEvidenceEntries.length === 0 && (
                        <div className="text-xs text-muted-foreground">No evidence recorded for this engagement yet.</div>
                      )}
                    </div>
                  </section>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      onClick={handleSaveDraft}
                      disabled={!selectedDraft || !isDraftEditable || kam.updateDraft.isPending}
                    >
                      {kam.updateDraft.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span className="ml-2">Save draft</span>
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleSubmitDraft}
                      disabled={!selectedDraft || !isDraftEditable || kam.submitDraft.isPending}
                    >
                      {kam.submitDraft.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span className="ml-2">Submit for approval</span>
                    </Button>
                    {selectedDraft && !isDraftEditable && (
                      <Badge variant="outline">Draft locked (status: {selectedDraft.status})</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Approval timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ApprovalTimeline
                  approvals={approvals.filter((item) => !selectedDraft || item.draft_id === selectedDraft.id)}
                  role={userRole}
                  onDecision={handleApprovalDecision}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export scaffold</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedDraft ? (
                  <>
                    <div>
                      <Label>Markdown</Label>
                      <Textarea value={exportMarkdown} readOnly rows={8} className="font-mono text-xs" />
                    </div>
                    <div>
                      <Label>JSON</Label>
                      <Textarea value={exportJson} readOnly rows={6} className="font-mono text-xs" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(exportMarkdown)}
                      >
                        <FileText className="w-4 h-4 mr-2" />Copy Markdown
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(exportJson)}
                      >
                        <FileJson className="w-4 h-4 mr-2" />Copy JSON
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Select a draft to generate the export scaffold.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KamReportingPage;
