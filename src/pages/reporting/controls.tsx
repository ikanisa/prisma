import { Fragment, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useOrganizations } from '@/hooks/use-organizations';
import { useAcceptanceStatus } from '@/hooks/use-acceptance-status';
import {
  useControlsManager,
  type Control,
  type ControlWalkthroughResult,
  type ControlTestResult,
  type DeficiencySeverity,
  type DeficiencyStatus,
  type ItgcType,
} from '@/hooks/use-controls';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ClipboardList, CheckCircle2, AlertTriangle, Plus, ShieldCheck } from 'lucide-react';
import { fetchResponses } from '@/lib/audit-responses-service';
import { matchProcedureId, type ProcedureSummary } from '@/utils/pbc';

const WALKTHROUGH_RESULTS: ControlWalkthroughResult[] = ['DESIGNED', 'NOT_DESIGNED', 'IMPLEMENTED', 'NOT_IMPLEMENTED'];
const TEST_RESULTS: ControlTestResult[] = ['PASS', 'EXCEPTIONS'];
const DEFICIENCY_SEVERITIES: DeficiencySeverity[] = ['LOW', 'MEDIUM', 'HIGH'];
const DEFICIENCY_STATUS: DeficiencyStatus[] = ['OPEN', 'REMEDIATION', 'CLOSED'];
const ITGC_TYPES: ItgcType[] = ['ACCESS', 'CHANGE', 'OPERATIONS'];

const DEFAULT_SAMPLE_SIZE = 25;
const NOT_LINKED_VALUE = 'NOT_LINKED';

type ProcedureRow = ProcedureSummary;

type SimpleControlForm = {
  cycle: string;
  objective: string;
  description: string;
  frequency: string;
  owner: string;
  key: boolean;
};

const emptyControlForm: SimpleControlForm = {
  cycle: 'Revenue',
  objective: '',
  description: '',
  frequency: 'Monthly',
  owner: '',
  key: true,
};

export default function ControlsMatrixPage() {
  const { engagementId, orgSlug } = useParams<{ engagementId: string; orgSlug: string }>();
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();

  const acceptanceStatus = useAcceptanceStatus(engagementId ?? null);
  const acceptanceApproved =
    acceptanceStatus.data?.status?.status === 'APPROVED' &&
    acceptanceStatus.data?.status?.decision === 'ACCEPT';

  const manager = useControlsManager(engagementId ?? null);

  const proceduresQuery = useQuery<ProcedureRow[]>({
    queryKey: ['controls-procedures', currentOrg?.slug, engagementId],
    queryFn: async () => {
      const { responses } = await fetchResponses({
        orgSlug: currentOrg!.slug,
        engagementId: engagementId!,
      });
      return responses.map((response) => ({
        id: response.id,
        title: response.title,
        objective: response.objective ?? '',
      }));
    },
    enabled: Boolean(currentOrg?.slug && engagementId),
    staleTime: 60_000,
  });

  const [controlForm, setControlForm] = useState<SimpleControlForm>(emptyControlForm);
  const [selectedCycle, setSelectedCycle] = useState<string>('ALL');

  const [walkthroughDialogOpen, setWalkthroughDialogOpen] = useState(false);
  const [walkthroughControl, setWalkthroughControl] = useState<Control | null>(null);
  const [walkthroughDate, setWalkthroughDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [walkthroughResult, setWalkthroughResult] = useState<ControlWalkthroughResult>('DESIGNED');
  const [walkthroughNotes, setWalkthroughNotes] = useState('');
  const [walkthroughProcedureId, setWalkthroughProcedureId] = useState<string>('');

  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testControl, setTestControl] = useState<Control | null>(null);
  const [samplePlanRef, setSamplePlanRef] = useState('');
  const [sampleSize, setSampleSize] = useState(DEFAULT_SAMPLE_SIZE);
  const [testResult, setTestResult] = useState<ControlTestResult>('PASS');
  const [testRecommendation, setTestRecommendation] = useState('');
  const [testSeverity, setTestSeverity] = useState<DeficiencySeverity>('HIGH');
  const [testProcedureId, setTestProcedureId] = useState<string>('');

  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [defControlId, setDefControlId] = useState<string | null>(null);
  const [defSeverity, setDefSeverity] = useState<DeficiencySeverity>('MEDIUM');
  const [defStatus, setDefStatus] = useState<DeficiencyStatus>('OPEN');
  const [defRecommendation, setDefRecommendation] = useState('');
  const [defProcedureId, setDefProcedureId] = useState<string>('');

  const [itgcType, setItgcType] = useState<ItgcType>('ACCESS');
  const [itgcScope, setItgcScope] = useState('');
  const [itgcNotes, setItgcNotes] = useState('');

  const isLoading =
    acceptanceStatus.isLoading ||
    manager.isLoading ||
    manager.createControl.isPending ||
    proceduresQuery.isLoading ||
    manager.logWalkthrough.isPending ||
    manager.runTest.isPending ||
    manager.createDeficiency.isPending ||
    manager.upsertItgc.isPending;

  const availableProcedures = proceduresQuery.data ?? [];

  const cycles = useMemo(() => {
    const set = new Set<string>();
    manager.controls.forEach((control) => set.add(control.cycle));
    return Array.from(set).sort();
  }, [manager.controls]);

  const filteredControls = selectedCycle === 'ALL'
    ? manager.controls
    : manager.controls.filter((control) => control.cycle === selectedCycle);

  const handleControlSubmit = async () => {
    if (!engagementId || !orgSlug) return;
    if (!controlForm.objective.trim()) {
      toast({ title: 'Objective required', description: 'Control objective cannot be empty.', variant: 'destructive' });
      return;
    }
    try {
      await manager.createControl.mutateAsync({
        orgSlug,
        engagementId,
        cycle: controlForm.cycle,
        objective: controlForm.objective,
        description: controlForm.description || null,
        frequency: controlForm.frequency || null,
        owner: controlForm.owner || null,
        key: controlForm.key,
      });
      toast({ title: 'Control saved', description: `${controlForm.cycle} control registered.` });
      setControlForm({ ...emptyControlForm, cycle: controlForm.cycle });
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    }
  };

  const openWalkthroughDialog = (control: Control) => {
    setWalkthroughControl(control);
    setWalkthroughDate(new Date().toISOString().slice(0, 10));
    setWalkthroughNotes('');
    setWalkthroughResult('DESIGNED');
    const hint = control.objective || control.description || '';
    const suggested = matchProcedureId(availableProcedures, hint);
    setWalkthroughProcedureId(suggested ?? '');
    setWalkthroughDialogOpen(true);
  };

  const handleWalkthroughSubmit = async () => {
    if (!walkthroughControl || !orgSlug) return;
    try {
      await manager.logWalkthrough.mutateAsync({
        orgSlug,
        controlId: walkthroughControl.id,
        date: walkthroughDate,
        notes: walkthroughNotes || undefined,
        result: walkthroughResult,
        procedureId: walkthroughProcedureId || undefined,
      });
      toast({ title: 'Walkthrough logged', description: `${walkthroughControl.objective} walkthrough saved.` });
      setWalkthroughDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Log failed', description: error.message, variant: 'destructive' });
    }
  };

  const openTestDialog = (control: Control) => {
    setTestControl(control);
    setTestDialogOpen(true);
    setSamplePlanRef('');
    setSampleSize(DEFAULT_SAMPLE_SIZE);
    setTestResult('PASS');
    setTestRecommendation('');
    setTestSeverity('HIGH');
    const hint = control.objective || control.description || '';
    const suggested = matchProcedureId(availableProcedures, hint);
    setTestProcedureId(suggested ?? '');
  };

  const handleTestSubmit = async () => {
    if (!testControl || !orgSlug) return;
    const finalSampleSize = Number(sampleSize) || DEFAULT_SAMPLE_SIZE;
    try {
      await manager.runTest.mutateAsync({
        orgSlug,
        controlId: testControl.id,
        attributes: { sampleSize: finalSampleSize },
        samplePlanRef: samplePlanRef || undefined,
        result: testResult,
        severity: testSeverity,
        recommendation: testRecommendation || undefined,
        procedureId: testProcedureId || undefined,
      });
      toast({
        title: 'Test recorded',
        description: testResult === 'PASS'
          ? `${testControl.objective} test passed.`
          : `${testControl.objective} exceptions logged and deficiency raised.`,
      });
      setTestDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Test run failed', description: error.message, variant: 'destructive' });
    }
  };

  const openDefDialog = (controlId?: string) => {
    setDefControlId(controlId ?? null);
    setDefSeverity('MEDIUM');
    setDefStatus('OPEN');
    setDefRecommendation('');
    const control = controlId ? manager.controls.find((c) => c.id === controlId) ?? null : null;
    const hint = control?.objective || control?.description || '';
    const suggested = matchProcedureId(availableProcedures, hint);
    setDefProcedureId(suggested ?? '');
    setDefDialogOpen(true);
  };

  const handleDeficiencySubmit = async () => {
    if (!orgSlug || !engagementId || !defRecommendation.trim()) {
      toast({ title: 'Recommendation required', description: 'Provide recommendation details.', variant: 'destructive' });
      return;
    }
    try {
      await manager.createDeficiency.mutateAsync({
        orgSlug,
        engagementId,
        controlId: defControlId ?? undefined,
        severity: defSeverity,
        recommendation: defRecommendation,
        status: defStatus,
        procedureId: defProcedureId || undefined,
      });
      toast({ title: 'Deficiency recorded', description: 'Control deficiency captured and sent to TCWG pack.' });
      setDefDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleItgcSubmit = async () => {
    if (!orgSlug) return;
    try {
      await manager.upsertItgc.mutateAsync({
        orgSlug,
        engagementId: engagementId ?? undefined,
        type: itgcType,
        scope: itgcScope || undefined,
        notes: itgcNotes || undefined,
      });
      toast({ title: 'ITGC noted', description: `${itgcType} control group captured.` });
      setItgcScope('');
      setItgcNotes('');
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    }
  };

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
          <CardTitle>Engagement acceptance pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Complete engagement acceptance and obtain Partner approval before documenting controls.</p>
          <Button asChild variant="outline" size="sm">
            <Link to={`/${orgSlug}/engagements/${engagementId}/acceptance`}>Go to acceptance workflow</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Controls matrix & ITGC</h1>
          <p className="text-muted-foreground">Document entity and process controls, walkthroughs, and testing to comply with ISA 315/330/265.</p>
          <p className="text-xs text-muted-foreground mt-1">Org: {orgSlug} • Engagement: {engagementId}</p>
        </div>
        <Badge variant="outline">ISA 315 • ISA 330 • ISA 265</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Register control</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Cycle</Label>
            <Input value={controlForm.cycle} onChange={(e) => setControlForm((prev) => ({ ...prev, cycle: e.target.value }))} placeholder="Revenue" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Frequency</Label>
            <Input value={controlForm.frequency} onChange={(e) => setControlForm((prev) => ({ ...prev, frequency: e.target.value }))} placeholder="Monthly" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground">Objective</Label>
            <Input value={controlForm.objective} onChange={(e) => setControlForm((prev) => ({ ...prev, objective: e.target.value }))} placeholder="Ensure revenue is recorded in the correct period." />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea rows={2} value={controlForm.description} onChange={(e) => setControlForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Controller reviews sales cut-off report and signs-off monthly." />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Owner</Label>
            <Input value={controlForm.owner} onChange={(e) => setControlForm((prev) => ({ ...prev, owner: e.target.value }))} placeholder="Financial Controller" />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <Checkbox id="control-key" checked={controlForm.key} onCheckedChange={(value) => setControlForm((prev) => ({ ...prev, key: Boolean(value) }))} />
            <Label htmlFor="control-key" className="text-sm">Key control</Label>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={handleControlSubmit} disabled={manager.createControl.isPending}>
              {manager.createControl.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Save control
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Controls matrix</CardTitle>
          <Tabs value={selectedCycle} onValueChange={setSelectedCycle} className="w-full md:w-auto">
            <TabsList className="overflow-x-auto">
              <TabsTrigger value="ALL">All</TabsTrigger>
              {cycles.map((cycle) => (
                <TabsTrigger key={cycle} value={cycle}>{cycle}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground mb-3">Planned procedures in scope: {availableProcedures.length}</div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading controls…
            </div>
          ) : filteredControls.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No controls captured yet. Add controls above to populate the matrix.</div>
          ) : (
            <ScrollArea className="h-[560px] pr-4">
              <div className="space-y-4">
                {filteredControls.map((control) => {
                  const latestWalkthrough = control.walkthroughs.at(-1) ?? null;
                  const latestTest = control.tests.at(-1) ?? null;
                  const openDeficiencies = control.deficiencies.filter((d) => d.status !== 'CLOSED');
                  const linkedProcedure = latestTest?.procedure_id
                    ? availableProcedures.find((proc) => proc.id === latestTest.procedure_id) ?? null
                    : null;
                  return (
                    <div key={control.id} className="border rounded-lg p-4 space-y-3 bg-card/40">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{control.cycle}</Badge>
                            {control.key && <Badge className="bg-emerald-600 text-white">Key</Badge>}
                          </div>
                          <h3 className="font-semibold mt-1">{control.objective}</h3>
                          {control.description && <p className="text-sm text-muted-foreground max-w-3xl">{control.description}</p>}
                          <div className="text-xs text-muted-foreground mt-1">Frequency: {control.frequency ?? 'Not set'} • Owner: {control.owner ?? 'Not assigned'}</div>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => openWalkthroughDialog(control)}>
                            <ClipboardList className="w-4 h-4 mr-1" /> Walkthrough
                          </Button>
                          <Button size="sm" onClick={() => openTestDialog(control)}>
                            <ShieldCheck className="w-4 h-4 mr-1" /> Test
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openDefDialog(control.id)}>
                            <AlertTriangle className="w-4 h-4 mr-1 text-amber-600" /> Raise deficiency
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-md border p-3">
                          <div className="text-xs font-medium text-muted-foreground">Latest walkthrough</div>
                          {latestWalkthrough ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{latestWalkthrough.result}</div>
                              <div className="text-xs text-muted-foreground">{new Date(latestWalkthrough.walk_date).toLocaleDateString()}</div>
                              {latestWalkthrough.notes && <div className="text-xs text-muted-foreground">{latestWalkthrough.notes}</div>}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No walkthrough logged.</div>
                          )}
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs font-medium text-muted-foreground">Latest testing</div>
                          {latestTest ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">{latestTest.result}</div>
                              <div className="text-xs text-muted-foreground">
                                {(latestTest.attributes as any)?.sampleSize ?? (latestTest.attributes as any)?.sample_size ?? '—'} samples • {latestTest.sample_plan_ref ?? 'No plan ref'}
                              </div>
                              {linkedProcedure && (
                                <div className="text-xs text-muted-foreground">Procedure: {linkedProcedure.title}</div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No testing documented yet.</div>
                          )}
                        </div>
                        <div className="rounded-md border p-3">
                          <div className="text-xs font-medium text-muted-foreground">Open deficiencies</div>
                          {openDeficiencies.length === 0 ? (
                            <div className="text-xs text-muted-foreground">None linked.</div>
                          ) : (
                            <div className="space-y-1">
                              {openDeficiencies.map((def) => (
                                <div key={def.id} className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                  <Badge variant={def.severity === 'HIGH' ? 'destructive' : 'outline'}>{def.severity}</Badge>
                                  <span className="truncate">{def.recommendation}</span>
                                  {def.procedure_id && (
                                    <span className="text-[10px] text-muted-foreground">
                                      Proc: {availableProcedures.find((proc) => proc.id === def.procedure_id)?.title ?? def.procedure_id}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {control.walkthroughs.length > 0 && (
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer">View walkthrough history</summary>
                          <ul className="mt-2 space-y-1">
                            {control.walkthroughs.map((item) => (
                              <li key={item.id} className="flex items-center justify-between">
                                <span>{item.result}</span>
                                <span>{new Date(item.walk_date).toLocaleDateString()}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                      {control.tests.length > 0 && (
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer">View testing history</summary>
                          <ul className="mt-2 space-y-1">
                            {control.tests.map((item) => (
                              <li key={item.id} className="flex items-center justify-between">
                                <span>{item.result}</span>
                                <span>{item.sample_plan_ref ?? 'No plan ref'}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ITGC summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={itgcType} onValueChange={(value) => setItgcType(value as ItgcType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ITGC_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground">Scope</Label>
              <Input value={itgcScope} onChange={(e) => setItgcScope(e.target.value)} placeholder="e.g. ERP access provisioning" />
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea rows={2} value={itgcNotes} onChange={(e) => setItgcNotes(e.target.value)} placeholder="Document systems in scope, walkthrough references, reliance on SOC reports, etc." />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button onClick={handleItgcSubmit} disabled={manager.upsertItgc.isPending}>
                {manager.upsertItgc.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Save ITGC note
              </Button>
            </div>
          </div>

          {manager.itgcGroups.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Logged ITGC groups</div>
              <div className="grid gap-2">
                {manager.itgcGroups.map((group) => (
                  <div key={group.id} className="border rounded-md p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{group.type}</Badge>
                      <span className="text-muted-foreground text-xs">{new Date(group.created_at).toLocaleDateString()}</span>
                    </div>
                    {group.scope && <div className="font-medium mt-1">{group.scope}</div>}
                    {group.notes && <div className="text-muted-foreground text-xs mt-1">{group.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deficiencies (ISA 265)</CardTitle>
        </CardHeader>
        <CardContent>
          {manager.deficiencies.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No deficiencies recorded. Exceptions posted from testing will appear here.</div>
          ) : (
            <div className="space-y-2">
              {manager.deficiencies.map((def) => (
                <div key={def.id} className="border rounded-md p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={def.severity === 'HIGH' ? 'destructive' : 'outline'}>{def.severity}</Badge>
                    <Badge variant="outline">{def.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(def.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 text-muted-foreground text-sm">{def.recommendation}</div>
                  {def.control_id && (
                    <div className="text-xs text-muted-foreground mt-1">Linked control ID: {def.control_id}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => openDefDialog()}>
              <Plus className="w-4 h-4 mr-1" /> Log deficiency
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={walkthroughDialogOpen} onOpenChange={setWalkthroughDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Walkthrough – {walkthroughControl?.objective}</DialogTitle>
            <DialogDescription>Record design & implementation walkthrough in line with ISA 315.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={walkthroughDate} onChange={(e) => setWalkthroughDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Result</Label>
              <Select value={walkthroughResult} onValueChange={(value) => setWalkthroughResult(value as ControlWalkthroughResult)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WALKTHROUGH_RESULTS.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Linked procedure (optional)</Label>
              <Select
                value={walkthroughProcedureId || NOT_LINKED_VALUE}
                onValueChange={(value) => setWalkthroughProcedureId(value === NOT_LINKED_VALUE ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select planned procedure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOT_LINKED_VALUE}>Not linked</SelectItem>
                  {availableProcedures.map((proc) => (
                    <SelectItem key={proc.id} value={proc.id}>{proc.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea rows={3} value={walkthroughNotes} onChange={(e) => setWalkthroughNotes(e.target.value)} placeholder="Summarise the walkthrough, design assessment, and implementation evidence." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setWalkthroughDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleWalkthroughSubmit} disabled={manager.logWalkthrough.isPending}>
                {manager.logWalkthrough.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardList className="w-4 h-4 mr-2" />}
                Save walkthrough
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Attributes testing – {testControl?.objective}</DialogTitle>
            <DialogDescription>Plan and document attributes testing under ISA 330.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Sample plan reference</Label>
              <Input value={samplePlanRef} onChange={(e) => setSamplePlanRef(e.target.value)} placeholder="Sampling worksheet reference" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sample size (≥ 25)</Label>
              <Input type="number" min={25} value={sampleSize} onChange={(e) => setSampleSize(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Result</Label>
              <Select value={testResult} onValueChange={(value) => setTestResult(value as ControlTestResult)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEST_RESULTS.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Linked procedure</Label>
              <Select
                value={testProcedureId || NOT_LINKED_VALUE}
                onValueChange={(value) => setTestProcedureId(value === NOT_LINKED_VALUE ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional: map to planned procedure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOT_LINKED_VALUE}>Not linked</SelectItem>
                  {availableProcedures.map((proc) => (
                    <SelectItem key={proc.id} value={proc.id}>{proc.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {testResult === 'EXCEPTIONS' && (
              <Fragment>
                <div>
                  <Label className="text-xs text-muted-foreground">Severity</Label>
                  <Select value={testSeverity} onValueChange={(value) => setTestSeverity(value as DeficiencySeverity)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFICIENCY_SEVERITIES.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Recommendation</Label>
                  <Textarea rows={3} value={testRecommendation} onChange={(e) => setTestRecommendation(e.target.value)} placeholder="Summarise deficiency and remediation recommendation." />
                </div>
              </Fragment>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setTestDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleTestSubmit} disabled={manager.runTest.isPending}>
                {manager.runTest.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Save test result
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={defDialogOpen} onOpenChange={setDefDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log deficiency</DialogTitle>
            <DialogDescription>Record control deficiencies for ISA 265 communication.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Severity</Label>
              <Select value={defSeverity} onValueChange={(value) => setDefSeverity(value as DeficiencySeverity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFICIENCY_SEVERITIES.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={defStatus} onValueChange={(value) => setDefStatus(value as DeficiencyStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFICIENCY_STATUS.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Recommendation</Label>
              <Textarea rows={3} value={defRecommendation} onChange={(e) => setDefRecommendation(e.target.value)} placeholder="Summarise issue, impact, and remediation recommendation." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Linked procedure (optional)</Label>
              <Select
                value={defProcedureId || NOT_LINKED_VALUE}
                onValueChange={(value) => setDefProcedureId(value === NOT_LINKED_VALUE ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select planned procedure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOT_LINKED_VALUE}>Not linked</SelectItem>
                  {availableProcedures.map((proc) => (
                    <SelectItem key={proc.id} value={proc.id}>{proc.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDefDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleDeficiencySubmit} disabled={manager.createDeficiency.isPending}>
                {manager.createDeficiency.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                Save deficiency
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-3 h-3" />
        Activity log emits `CTRL_ADDED`, `CTRL_WALKTHROUGH_DONE`, `CTRL_TEST_RUN`, and `CTRL_DEFICIENCY_RAISED` for ISA 315/330/265 traceability.
      </div>
    </div>
  );
}
