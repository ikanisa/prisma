import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

import { useOrganizations } from '@/hooks/use-organizations';
import { useReportBuilder } from '@/hooks/use-report-builder';
import { useAcceptanceStatus } from '@/hooks/use-acceptance-status';
import { useKamModule } from '@/hooks/use-kam-module';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import type { AuditReportDraft } from '@/lib/report-service';
import { fetchFinancialNotes, requestEsefExport } from '@/lib/financial-report-service';

const opinionOptions: AuditReportDraft['opinion'][] = ['UNMODIFIED', 'QUALIFIED', 'ADVERSE', 'DISCLAIMER'];

export default function ReportBuilderPage() {
  const { engagementId, orgSlug } = useParams<{ engagementId: string; orgSlug: string }>();
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const report = useReportBuilder(engagementId ?? null);
  const kam = useKamModule(engagementId ?? null);
  const acceptanceStatus = useAcceptanceStatus(engagementId ?? null);
  const acceptanceApproved =
    acceptanceStatus.data?.status?.status === 'APPROVED' && acceptanceStatus.data?.status?.decision === 'ACCEPT';

  const approvedKams = useMemo(
    () =>
      (kam.data?.drafts ?? [])
        .filter((draft) => draft.status === 'APPROVED')
        .map((draft) => ({ id: draft.id, heading: draft.heading, why_kam: draft.why_kam })),
    [kam.data?.drafts],
  );

  const [formState, setFormState] = useState({
    opinion: 'UNMODIFIED' as AuditReportDraft['opinion'],
    basis: '',
    includeEOM: false,
    eomText: '',
    includeOM: false,
    omText: '',
    incorporateKAMs: true,
    kamIds: [] as string[],
    gcDisclosure: false,
  });

  const [notesLoading, setNotesLoading] = useState(false);
  const [notes, setNotes] = useState<Awaited<ReturnType<typeof fetchFinancialNotes>> | null>(null);
  const [noteBasis, setNoteBasis] = useState<'IFRS_EU' | 'GAPSME'>('IFRS_EU');

  useEffect(() => {
    if (report.report) {
      setFormState({
        opinion: report.report.opinion,
        basis: report.report.basis_for_opinion ?? '',
        includeEOM: report.report.include_eom,
        eomText: report.report.eom_text ?? '',
        includeOM: report.report.include_om,
        omText: report.report.om_text ?? '',
        incorporateKAMs: report.report.incorporate_kams,
        kamIds: report.report.kam_ids ?? [],
        gcDisclosure: report.report.gc_disclosure_required,
      });
    }
  }, [report.report?.id]);

  const approvalsGrouped = useMemo(() => {
    return report.approvals.reduce<Record<string, typeof report.approvals>>((acc, item) => {
      acc[item.stage] = acc[item.stage] ? [...acc[item.stage], item] : [item];
      return acc;
    }, {});
  }, [report.approvals]);

  const handleSave = async () => {
    if (!report.report) return;
    try {
      await report.update.mutateAsync({
        reportId: report.report.id,
        opinion: formState.opinion,
        basisForOpinion: formState.basis,
        includeEOM: formState.includeEOM,
        eomText: formState.eomText,
        includeOM: formState.includeOM,
        omText: formState.omText,
        incorporateKAMs: formState.incorporateKAMs,
        kamIds: formState.kamIds,
        gcDisclosureRequired: formState.gcDisclosure,
      });
      toast({ title: 'Report saved', description: 'Report draft updated successfully.' });
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleSubmit = async () => {
    if (!report.report) return;
    try {
      await handleSave();
      await report.submit.mutateAsync(report.report.id);
      toast({ title: 'Report submitted', description: 'Approvals queued.' });
    } catch (error: any) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleRelease = async () => {
    if (!report.report) return;
    try {
      await report.release.mutateAsync(report.report.id);
      toast({ title: 'Report released', description: 'Report status set to RELEASED.' });
    } catch (error: any) {
      toast({ title: 'Release failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleExportPdf = async () => {
    if (!report.report) return;
    try {
      const result = await report.exportPdf.mutateAsync(report.report.id);
      toast({
        title: 'PDF exported',
        description: `Saved to ${result.path}.`,
      });
    } catch (error: any) {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleDecisionTree = async () => {
    try {
      const result = await report.decisionTree.mutateAsync();
      toast({ title: 'Decision tree evaluated', description: `Recommended opinion: ${result.recommendedOpinion}` });
      setFormState((prev) => ({
        ...prev,
        opinion: result.recommendedOpinion,
        gcDisclosure: result.goingConcernMaterialUncertainty,
      }));
    } catch (error: any) {
      toast({ title: 'Decision tree failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleFetchNotes = async () => {
    if (!currentOrg || !engagementId) return;
    const periodId = report.report?.period_id ?? report.report?.id ?? '';
    if (!periodId) {
      toast({
        title: 'Period required',
        description: 'Create or load a report draft to establish the reporting period.',
        variant: 'destructive',
      });
      return;
    }

    setNotesLoading(true);
    try {
      const result = await fetchFinancialNotes({
        orgId: currentOrg.id,
        entityId: engagementId,
        periodId,
        basis: noteBasis,
      });
      setNotes(result);
    } catch (error: any) {
      toast({
        title: 'Disclosure generation failed',
        description: error.message ?? 'Unexpected error while fetching financial notes.',
        variant: 'destructive',
      });
    } finally {
      setNotesLoading(false);
    }
  };

  const handleDownloadEsef = async () => {
    if (!currentOrg || !engagementId) return;
    const periodId = report.report?.period_id ?? report.report?.id ?? '';
    if (!periodId) {
      toast({
        title: 'Period required',
        description: 'Create or load a report draft to establish the reporting period.',
        variant: 'destructive',
      });
      return;
    }

    setNotesLoading(true);
    try {
      const response = await requestEsefExport({
        orgId: currentOrg.id,
        entityId: engagementId,
        periodId,
        periodLabel: report.report?.title ?? 'ReportingPeriod',
        basis: noteBasis,
        currency: 'EUR',
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${engagementId}-esef.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast({ title: 'ESEF package ready', description: 'Inline XBRL export downloaded.' });
    } catch (error: any) {
      toast({ title: 'ESEF export failed', description: error.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setNotesLoading(false);
    }
  };

  const renderApprovalTimeline = () => {
    if (report.approvals.length === 0) {
      return <p className="text-sm text-muted-foreground">No approvals queued yet.</p>;
    }
    const stageOrder: Record<string, number> = { MANAGER: 1, PARTNER: 2, EQR: 3 };
    const sorted = [...report.approvals].sort(
      (a, b) => stageOrder[a.stage] - stageOrder[b.stage] || a.created_at.localeCompare(b.created_at),
    );
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
                {item.stage} — <span className="capitalize">{item.status.toLowerCase()}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Requested {new Date(item.created_at).toLocaleString()}
              </div>
              {item.resolution_note && (
                <div className="text-xs text-muted-foreground mt-1">{item.resolution_note}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const canRelease = report.report?.status === 'APPROVED';

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
          <CardTitle>Report builder locked</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Engagement acceptance must be approved by the Partner before assembling the audit report.</p>
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
          <h1 className="text-3xl font-bold gradient-text">Audit Report Builder</h1>
          <p className="text-muted-foreground">Assemble opinion, KAMs, and communications for the final audit report.</p>
          <p className="text-xs text-muted-foreground mt-1">
            <Link to={`/${currentOrg?.slug}/engagements`} className="underline">Back to engagements</Link>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline">Engagement: {engagementId ?? 'N/A'}</Badge>
          {orgSlug && engagementId ? (
            <Button asChild variant="outline" className="h-8">
              <Link to={`/${orgSlug}/engagements/${engagementId}/reporting/consolidation`}>
                Consolidation workspace
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {!report.report && !report.isLoading && (
        <Card>
          <CardContent className="py-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Create report draft</h2>
              <p className="text-sm text-muted-foreground">
                Prefills with approved KAMs and going concern assessment.
              </p>
            </div>
            <Button onClick={() => report.create.mutate()} disabled={report.create.isPending}>
              {report.create.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create draft
            </Button>
          </CardContent>
        </Card>
      )}

      {report.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading report draft…
        </div>
      )}

      {report.report && (
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,380px)_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Decision tree</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleDecisionTree} disabled={report.decisionTree.isPending}>
                  {report.decisionTree.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Evaluate opinion
                </Button>
                {report.decisionTree.data && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Recommended opinion:</span> {report.decisionTree.data.recommendedOpinion}
                    </div>
                    <div>
                      <span className="font-medium">Required sections:</span> {report.decisionTree.data.requiredSections.join(', ')}
                    </div>
                    <ul className="list-disc pl-4 text-muted-foreground">
                      {report.decisionTree.data.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approvals</CardTitle>
              </CardHeader>
              <CardContent>{renderApprovalTimeline()}</CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Draft metadata</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <div>Status: {report.report.status}</div>
                <div>Updated: {new Date(report.report.updated_at).toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Report configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Opinion</Label>
                    <Select
                      value={formState.opinion}
                      onValueChange={(value: AuditReportDraft['opinion']) =>
                        setFormState((prev) => ({ ...prev, opinion: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select opinion" />
                      </SelectTrigger>
                      <SelectContent>
                        {opinionOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Going concern disclosure</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formState.gcDisclosure}
                        onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, gcDisclosure: checked }))}
                      />
                      <span className="text-sm text-muted-foreground">Material uncertainty related to going concern</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Basis for opinion</Label>
                  <Textarea
                    rows={4}
                    value={formState.basis}
                    onChange={(event) => setFormState((prev) => ({ ...prev, basis: event.target.value }))}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Include KAMs in report</Label>
                    <Switch
                      checked={formState.incorporateKAMs}
                      onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, incorporateKAMs: checked }))}
                    />
                  </div>
                  {formState.incorporateKAMs && (
                    <div>
                      <Label className="text-xs">Select approved KAMs</Label>
                      <ScrollArea className="border rounded-md h-40">
                        <div className="p-3 space-y-2">
                          {kam.isLoading && (
                            <div className="text-xs text-muted-foreground">Loading KAMs…</div>
                          )}
                          {approvedKams.map((kam) => {
                            const selected = formState.kamIds.includes(kam.id);
                            return (
                              <button
                                key={kam.id}
                                onClick={() =>
                                  setFormState((prev) => ({
                                    ...prev,
                                    kamIds: selected
                                      ? prev.kamIds.filter((id) => id !== kam.id)
                                      : [...prev.kamIds, kam.id],
                                  }))
                                }
                                className={`w-full text-left border rounded-lg p-2 text-sm transition ${
                                  selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                                }`}
                              >
                                <div className="font-medium">{kam.heading}</div>
                                <p className="text-xs text-muted-foreground line-clamp-2">{kam.why_kam ?? 'No rationale recorded'}</p>
                              </button>
                            );
                          })}
                          {!kam.isLoading && approvedKams.length === 0 && (
                            <div className="text-xs text-muted-foreground">No approved KAMs available.</div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Include Emphasis of Matter</Label>
                    <Switch
                      checked={formState.includeEOM}
                      onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, includeEOM: checked }))}
                    />
                  </div>
                  {formState.includeEOM && (
                    <Textarea
                      rows={3}
                      value={formState.eomText}
                      onChange={(event) => setFormState((prev) => ({ ...prev, eomText: event.target.value }))}
                      placeholder="Summarise the disclosed matter and reference financial statement note."
                    />
                  )}

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Include Other Matter</Label>
                    <Switch
                      checked={formState.includeOM}
                      onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, includeOM: checked }))}
                    />
                  </div>
                  {formState.includeOM && (
                    <Textarea
                      rows={3}
                      value={formState.omText}
                      onChange={(event) => setFormState((prev) => ({ ...prev, omText: event.target.value }))}
                      placeholder="Describe the other matter and rationale for inclusion."
                    />
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={handleSave} disabled={report.update.isPending}>
                    {report.update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Save draft
                  </Button>
                  <Button variant="secondary" onClick={handleSubmit} disabled={report.submit.isPending}>
                    {report.submit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Submit for approval
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRelease}
                    disabled={!canRelease || report.release.isPending}
                  >
                    {report.release.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Release report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportPdf}
                    disabled={report.exportPdf.isPending || !report.report}
                  >
                    {report.exportPdf.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Disclosures & IFRS notes</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Generate automated note disclosures (IFRS 15/16/9, IAS 36/12/19/7, IFRS 13/8) and trigger the
                    Inline XBRL export package.
                  </p>
                </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Basis</Label>
              <Select value={noteBasis} onValueChange={(value: 'IFRS_EU' | 'GAPSME') => setNoteBasis(value)}>
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue placeholder="Select basis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IFRS_EU">IFRS (EU)</SelectItem>
                  <SelectItem value="GAPSME">GAPSME</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleFetchNotes} disabled={notesLoading || !report.report}>
              {notesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh notes
            </Button>
            <Button onClick={handleDownloadEsef} disabled={notesLoading || !report.report}>
                    {notesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Download ESEF (iXBRL)
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {notesLoading && !notes ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating disclosures…
                  </div>
                ) : null}
                {!notes && !notesLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Use the controls above to produce topic-level disclosures and export an Inline XBRL package aligned to
                    the selected reporting basis.
                  </p>
                ) : null}
                {notes ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {notes.notes.map((note) => (
                      <div key={note.standard} className="rounded-lg border border-border bg-card/60 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{note.standard}</p>
                            <p className="text-xs text-muted-foreground">{note.title}</p>
                          </div>
                          <Badge variant="outline">{note.standard.includes('GAPSME') ? 'GAPSME' : 'IFRS'}</Badge>
                        </div>
                        <ScrollArea className="max-h-40 rounded bg-muted p-3 text-xs">
                          <pre>{JSON.stringify(note, null, 2)}</pre>
                        </ScrollArea>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {report.report?.draft_html ? (
                  <ScrollArea className="h-[420px] border rounded-md p-4 prose prose-sm">
                    <div dangerouslySetInnerHTML={{ __html: report.report.draft_html }} />
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground">Save the report to generate a preview.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
