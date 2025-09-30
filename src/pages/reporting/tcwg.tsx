import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Loader2, CheckCircle2, FileDown, FileArchive, ShieldCheck, AlertCircle, Send } from 'lucide-react';

import { useOrganizations } from '@/hooks/use-organizations';
import { useTcwgPack } from '@/hooks/use-tcwg-pack';
import { useAcceptanceStatus } from '@/hooks/use-acceptance-status';
import { useToast } from '@/hooks/use-toast';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

interface DeficiencyRow {
  control: string;
  impact: string;
  recommendation: string;
  severity: 'High' | 'Medium' | 'Low';
}

const severityOptions: Array<DeficiencyRow['severity']> = ['High', 'Medium', 'Low'];

export default function TcwgPage() {
  const { engagementId, orgSlug } = useParams<{ engagementId: string; orgSlug: string }>();
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const tcwg = useTcwgPack(engagementId ?? null);
  const acceptanceStatus = useAcceptanceStatus(engagementId ?? null);
  const acceptanceApproved =
    acceptanceStatus.data?.status?.status === 'APPROVED' && acceptanceStatus.data?.status?.decision === 'ACCEPT';

  const [independence, setIndependence] = useState('');
  const [scope, setScope] = useState('');
  const [findings, setFindings] = useState('');
  const [difficulties, setDifficulties] = useState('');
  const [otherMatters, setOtherMatters] = useState('');
  const [deficiencies, setDeficiencies] = useState<DeficiencyRow[]>([]);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const pack = tcwg.pack;

  useEffect(() => {
    if (pack) {
      setIndependence(pack.independence_statement ?? '');
      setScope(pack.scope_summary ?? '');
      setFindings(pack.significant_findings ?? '');
      setDifficulties(pack.significant_difficulties ?? '');
      setOtherMatters(pack.other_matters ?? '');
      setDeficiencies(
        (Array.isArray(pack.deficiencies) ? pack.deficiencies : []).map((item: any) => ({
          control: item.control ?? '',
          impact: item.impact ?? item.risk ?? '',
          recommendation: item.recommendation ?? '',
          severity: (item.severity as DeficiencyRow['severity']) ?? 'Medium',
        })),
      );
    }
  }, [pack]);

  const approvalsTimeline = useMemo(() => {
    const order: Record<string, number> = { MANAGER: 1, PARTNER: 2, EQR: 3 };
    return [...(tcwg.approvals ?? [])].sort((a, b) => {
      const stageOrder = order[a.stage] - order[b.stage];
      if (stageOrder !== 0) {
        return stageOrder;
      }
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateA - dateB;
    });
  }, [tcwg.approvals]);

  const handleSave = async () => {
    if (!tcwg.pack) return;
    try {
      await tcwg.update.mutateAsync({
        packId: tcwg.pack.id,
        independenceStatement: independence,
        scopeSummary: scope,
        significantFindings: findings,
        significantDifficulties: difficulties,
        deficiencies: deficiencies.map((d) => ({
          control: d.control,
          impact: d.impact,
          recommendation: d.recommendation,
          severity: d.severity,
        })),
        otherMatters,
      });
      toast({ title: 'Saved', description: 'TCWG pack updated successfully.' });
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleRender = async () => {
    if (!tcwg.pack) return;
    try {
      await handleSave();
      await tcwg.renderPdf.mutateAsync(tcwg.pack.id);
      toast({ title: 'PDF rendered', description: 'Pack PDF stored in documents.' });
    } catch (error: any) {
      toast({ title: 'Render failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleZip = async () => {
    if (!tcwg.pack) return;
    try {
      await handleRender();
      const result = await tcwg.buildZip.mutateAsync(tcwg.pack.id);
      toast({ title: 'ZIP built', description: `Archive SHA-256: ${result.sha256.slice(0, 12)}…` });
    } catch (error: any) {
      toast({ title: 'ZIP failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleSubmit = async () => {
    if (!tcwg.pack) return;
    try {
      await handleRender();
      await handleZip();
      await tcwg.submit.mutateAsync(tcwg.pack.id);
      toast({ title: 'Submitted', description: 'Pack queued for approval.' });
    } catch (error: any) {
      toast({ title: 'Submit failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleSend = async () => {
    if (!tcwg.pack) return;
    try {
      const result = await tcwg.send.mutateAsync(tcwg.pack.id);
      setShareLink(result.shareUrl ?? null);
      toast({ title: 'TCWG pack sent', description: 'Client portal link generated.' });
    } catch (error: any) {
      toast({ title: 'Send failed', description: error.message, variant: 'destructive' });
    }
  };

  const addDeficiency = () => {
    setDeficiencies((prev) => [
      ...prev,
      { control: '', impact: '', recommendation: '', severity: 'Medium' },
    ]);
  };

  const updateDeficiency = (index: number, field: keyof DeficiencyRow, value: string) => {
    setDeficiencies((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value } as DeficiencyRow;
      next[index] = row;
      return next;
    });
  };

  const removeDeficiency = (index: number) => {
    setDeficiencies((prev) => prev.filter((_, i) => i !== index));
  };

  const uncorrectedJson = useMemo(() => JSON.stringify(tcwg.pack?.uncorrected_misstatements ?? [], null, 2), [tcwg.pack?.uncorrected_misstatements]);
  const correctedJson = useMemo(() => JSON.stringify(tcwg.pack?.corrected_misstatements ?? [], null, 2), [tcwg.pack?.corrected_misstatements]);
  const kamsJson = useMemo(() => JSON.stringify(tcwg.pack?.kam_summary ?? [], null, 2), [tcwg.pack?.kam_summary]);
  const gcJson = useMemo(() => JSON.stringify(tcwg.pack?.going_concern_summary ?? {}, null, 2), [tcwg.pack?.going_concern_summary]);
  const seJson = useMemo(() => JSON.stringify(tcwg.pack?.subsequent_events_summary ?? {}, null, 2), [tcwg.pack?.subsequent_events_summary]);

  const canSend = tcwg.pack?.status === 'APPROVED' && tcwg.reportReleased;

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
          <CardTitle>TCWG pack locked</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Complete acceptance and independence before preparing communications to those charged with governance.</p>
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
          <h1 className="text-3xl font-bold gradient-text">TCWG Communication Pack</h1>
          <p className="text-muted-foreground">Prepare and share the completion communication with those charged with governance.</p>
          <p className="text-xs text-muted-foreground mt-1">
            <Link to={`/${currentOrg?.slug}/engagements`} className="underline">Back to engagements</Link>
          </p>
        </div>
        <div className="text-right space-y-1">
          <Badge variant="outline">Engagement: {engagementId ?? 'N/A'}</Badge>
          {tcwg.reportReleased ? (
            <div className="text-xs text-emerald-600">Report released – TCWG pack can be sent once approved.</div>
          ) : (
            <div className="text-xs text-muted-foreground">Report not yet released. Sending will be enabled afterwards.</div>
          )}
        </div>
      </div>

      {!tcwg.pack && !tcwg.isLoading && (
        <Card>
          <CardContent className="py-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Create TCWG pack</h2>
              <p className="text-sm text-muted-foreground">Prefills from misstatements, KAMs, and going concern conclusions.</p>
            </div>
            <Button onClick={() => tcwg.create.mutate()} disabled={tcwg.create.isPending}>
              {tcwg.create.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create pack
            </Button>
          </CardContent>
        </Card>
      )}

      {tcwg.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading TCWG pack…
        </div>
      )}

      {tcwg.pack && (
        <div className="grid gap-6 xl:grid-cols-[minmax(320px,360px)_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                {approvalsTimeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No approvals queued yet.</p>
                ) : (
                  <div className="space-y-3">
                    {approvalsTimeline.map((item) => (
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
                          {item.resolved_at && (
                            <div className="text-xs text-muted-foreground">Resolved: {new Date(item.resolved_at).toLocaleString()}</div>
                          )}
                          {item.resolution_note && (
                            <div className="text-xs text-muted-foreground mt-1">{item.resolution_note}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Misstatements snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Uncorrected</Label>
                  <ScrollArea className="h-32 border rounded-md">
                    <pre className="text-xs p-3 whitespace-pre-wrap">{uncorrectedJson}</pre>
                  </ScrollArea>
                </div>
                <div>
                  <Label>Corrected</Label>
                  <ScrollArea className="h-32 border rounded-md">
                    <pre className="text-xs p-3 whitespace-pre-wrap">{correctedJson}</pre>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>KAM / GC / SE summaries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Key Audit Matters</Label>
                  <ScrollArea className="h-32 border rounded-md">
                    <pre className="text-xs p-3 whitespace-pre-wrap">{kamsJson}</pre>
                  </ScrollArea>
                </div>
                <div>
                  <Label>Going concern</Label>
                  <ScrollArea className="h-24 border rounded-md">
                    <pre className="text-xs p-3 whitespace-pre-wrap">{gcJson}</pre>
                  </ScrollArea>
                </div>
                <div>
                  <Label>Subsequent events</Label>
                  <ScrollArea className="h-24 border rounded-md">
                    <pre className="text-xs p-3 whitespace-pre-wrap">{seJson}</pre>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pack content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Independence statement</Label>
                  <Textarea rows={4} value={independence} onChange={(e) => setIndependence(e.target.value)} />
                </div>
                <div>
                  <Label>Scope, strategy & timing</Label>
                  <Textarea rows={4} value={scope} onChange={(e) => setScope(e.target.value)} />
                </div>
                <div>
                  <Label>Significant findings</Label>
                  <Textarea rows={4} value={findings} onChange={(e) => setFindings(e.target.value)} />
                </div>
                <div>
                  <Label>Significant difficulties</Label>
                  <Textarea rows={3} value={difficulties} onChange={(e) => setDifficulties(e.target.value)} />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Control deficiencies (ISA 265)</Label>
                    <Button size="sm" variant="outline" onClick={addDeficiency}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {deficiencies.length === 0 && (
                      <p className="text-xs text-muted-foreground">No deficiencies recorded yet.</p>
                    )}
                    {deficiencies.map((row, index) => (
                      <div key={`def-${index}`} className="border rounded-lg p-3 space-y-2">
                        <div className="grid gap-2 md:grid-cols-2">
                          <div>
                            <Label className="text-xs">Deficiency / Process</Label>
                            <Input
                              value={row.control}
                              onChange={(e) => updateDeficiency(index, 'control', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Severity</Label>
                            <select
                              className="w-full border rounded-md px-2 py-2 text-sm"
                              value={row.severity}
                              onChange={(e) => updateDeficiency(index, 'severity', e.target.value as DeficiencyRow['severity'])}
                            >
                              {severityOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Impact / Risk</Label>
                          <Textarea
                            rows={2}
                            value={row.impact}
                            onChange={(e) => updateDeficiency(index, 'impact', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Recommendation</Label>
                          <Textarea
                            rows={2}
                            value={row.recommendation}
                            onChange={(e) => updateDeficiency(index, 'recommendation', e.target.value)}
                          />
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeDeficiency(index)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label>Other matters</Label>
                  <Textarea rows={3} value={otherMatters} onChange={(e) => setOtherMatters(e.target.value)} />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={handleSave} disabled={tcwg.update.isPending}>
                    {tcwg.update.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Save
                  </Button>
                  <Button variant="secondary" onClick={handleRender} disabled={tcwg.renderPdf.isPending}>
                    {tcwg.renderPdf.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileDown className="w-4 h-4 mr-2" />}
                    Render PDF
                  </Button>
                  <Button variant="outline" onClick={handleZip} disabled={tcwg.buildZip.isPending}>
                    {tcwg.buildZip.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileArchive className="w-4 h-4 mr-2" />}
                    Build ZIP
                  </Button>
                  <Button variant="outline" onClick={handleSubmit} disabled={tcwg.submit.isPending}>
                    {tcwg.submit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Submit for approval
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSend}
                    disabled={!canSend || tcwg.send.isPending}
                  >
                    {tcwg.send.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Send to client
                  </Button>
                </div>

                {shareLink && (
                  <div className="text-xs text-emerald-600 break-all">
                    Share link: {shareLink}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
