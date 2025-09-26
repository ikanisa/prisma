import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/mock-data';
import {
  addTaxDisputeEvent,
  computeTreatyWht,
  listTaxDisputeCases,
  listTaxDisputeEvents,
  listTreatyWhtCalculations,
  upsertTaxDisputeCase,
  type TaxDisputeCase,
  type TaxDisputeEvent,
  type TreatyWhtCalculation,
  type TreatyWhtSummary,
} from '@/lib/tax-mt-service';
import { calculateTreatyWht } from '@/lib/tax/calculators';

const numberFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 2,
});

const reliefMethods = [
  { value: 'CREDIT', label: 'Tax credit' },
  { value: 'EXEMPTION', label: 'Exemption' },
  { value: 'REDUCED_RATE', label: 'Reduced rate' },
];

const caseStatusOptions: TaxDisputeCase['status'][] = ['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'RESOLVED', 'CLOSED'];

const toNumberString = (value: string) => value.replace(/[^0-9.]/g, '');

export default function TreatyWhtPage() {
  const { toast } = useToast();
  const { currentOrg } = useAppStore();
  const [taxEntityId, setTaxEntityId] = useState('');

  const [whtForm, setWhtForm] = useState({
    counterpartyJurisdiction: '',
    paymentType: '',
    grossAmount: '0',
    domesticRate: '0.25',
    treatyRate: '0.10',
    reliefMethod: 'CREDIT',
    treatyArticle: '',
    notes: '',
  });
  const [whtResult, setWhtResult] = useState<TreatyWhtSummary | null>(null);
  const [whtHistory, setWhtHistory] = useState<TreatyWhtCalculation[]>([]);
  const [loadingCompute, setLoadingCompute] = useState(false);

  const [cases, setCases] = useState<TaxDisputeCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseEvents, setCaseEvents] = useState<TaxDisputeEvent[]>([]);
  const [caseLoading, setCaseLoading] = useState(false);
  const [eventLoading, setEventLoading] = useState(false);

  const [caseForm, setCaseForm] = useState({
    caseType: 'MAP' as 'MAP' | 'APA',
    counterpartyJurisdiction: '',
    counterpartyAuthority: '',
    caseReference: '',
    status: 'OPEN' as TaxDisputeCase['status'],
    openedOn: '',
    expectedResolution: '',
    reliefAmount: '',
    issueSummary: '',
    notes: '',
  });

  const [eventForm, setEventForm] = useState({
    eventType: 'SUBMISSION',
    eventDate: '',
    description: '',
  });

  const canExecute = isSupabaseConfigured;

  useEffect(() => {
    if (!taxEntityId && currentOrg) {
      setTaxEntityId(currentOrg.id);
    }
  }, [currentOrg, taxEntityId]);

  useEffect(() => {
    if (!canExecute || !currentOrg?.slug) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        const [historyResponse, casesResponse] = await Promise.all([
          listTreatyWhtCalculations({ orgSlug: currentOrg.slug, taxEntityId }).catch(() => ({ data: [] })),
          listTaxDisputeCases({ orgSlug: currentOrg.slug, taxEntityId }).catch(() => ({ data: [] })),
        ]);

        if (!controller.signal.aborted) {
          setWhtHistory(Array.isArray(historyResponse.data) ? historyResponse.data : []);
          setCases(Array.isArray(casesResponse.data) ? casesResponse.data : []);
        }
      } catch (error) {
        console.error('treaty-wht-load', error);
      }
    };

    load();

    return () => controller.abort();
  }, [canExecute, currentOrg?.slug, taxEntityId]);

  useEffect(() => {
    if (!canExecute || !currentOrg?.slug || !selectedCaseId) {
      if (!canExecute) {
        // Demo mode retains local events
        return;
      }
      setCaseEvents([]);
      return;
    }

    const controller = new AbortController();

    const loadEvents = async () => {
      try {
        const response = await listTaxDisputeEvents({ orgSlug: currentOrg.slug, disputeId: selectedCaseId });
        if (!controller.signal.aborted) {
          setCaseEvents(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        console.error('treaty-wht-events', error);
      }
    };

    loadEvents();

    return () => controller.abort();
  }, [canExecute, currentOrg?.slug, selectedCaseId]);

  const formatCurrency = (value: number) => numberFormatter.format(value || 0);
  const formatPercent = (value: number) => percentFormatter.format(value);

  const selectedCase = useMemo(() => cases.find(item => item.id === selectedCaseId) ?? null, [cases, selectedCaseId]);

  const handleCompute = async () => {
    if (!whtForm.counterpartyJurisdiction.trim() || !whtForm.paymentType.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing inputs',
        description: 'Provide counterparty jurisdiction and payment type.',
      });
      return;
    }

    setLoadingCompute(true);
    try {
      const payload = {
        orgSlug: currentOrg?.slug ?? '',
        taxEntityId: taxEntityId || (currentOrg?.id ?? ''),
        counterpartyJurisdiction: whtForm.counterpartyJurisdiction.trim(),
        paymentType: whtForm.paymentType.trim(),
        grossAmount: Number(whtForm.grossAmount || 0),
        domesticRate: Number(whtForm.domesticRate || 0),
        treatyRate: Number(whtForm.treatyRate || 0),
        reliefMethod: whtForm.reliefMethod,
        treatyArticle: whtForm.treatyArticle.trim() || undefined,
        notes: whtForm.notes.trim() || undefined,
      };

      if (!canExecute || !currentOrg?.slug) {
        const result = calculateTreatyWht({
          grossAmount: payload.grossAmount,
          domesticRate: payload.domesticRate,
          treatyRate: payload.treatyRate,
        });
        setWhtResult(result);
        const demoCalc: TreatyWhtCalculation = {
          id: crypto.randomUUID(),
          org_id: currentOrg?.id ?? 'demo-org',
          tax_entity_id: payload.taxEntityId,
          counterparty_jurisdiction: payload.counterpartyJurisdiction,
          payment_type: payload.paymentType,
          treaty_article: payload.treatyArticle ?? null,
          domestic_rate: result.domesticRate,
          treaty_rate: result.treatyRate,
          gross_amount: payload.grossAmount,
          withholding_before: result.withholdingBefore,
          withholding_after: result.withholdingAfter,
          relief_amount: result.reliefAmount,
          relief_method: payload.reliefMethod,
          notes: payload.notes ?? null,
          metadata: {},
          created_by: 'demo-user',
          updated_by: 'demo-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setWhtHistory(prev => [demoCalc, ...prev.slice(0, 49)]);
        toast({ title: 'Computed treaty relief (demo mode)' });
        return;
      }

      const response = await computeTreatyWht(payload);
      setWhtResult(response.result);
      setWhtHistory(prev => [response.calculation, ...prev.filter(item => item.id !== response.calculation.id)]);
      toast({ title: 'Treaty withholding computed' });
    } catch (error) {
      console.error('treaty-wht-compute', error);
      toast({
        variant: 'destructive',
        title: 'Unable to compute withholding',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoadingCompute(false);
    }
  };

  const handleCaseSubmit = async () => {
    if (!caseForm.counterpartyJurisdiction.trim()) {
      toast({
        variant: 'destructive',
        title: 'Counterparty jurisdiction required',
        description: 'Provide the jurisdiction for the dispute case.',
      });
      return;
    }

    try {
      setCaseLoading(true);
      if (!canExecute || !currentOrg?.slug) {
        const newCase: TaxDisputeCase = {
          id: crypto.randomUUID(),
          org_id: currentOrg?.id ?? 'demo-org',
          tax_entity_id: taxEntityId || (currentOrg?.id ?? ''),
          case_type: caseForm.caseType,
          counterparty_jurisdiction: caseForm.counterpartyJurisdiction.trim(),
          counterparty_authority: caseForm.counterpartyAuthority.trim() || null,
          case_reference: caseForm.caseReference.trim() || null,
          status: caseForm.status,
          opened_on: caseForm.openedOn || new Date().toISOString().slice(0, 10),
          expected_resolution: caseForm.expectedResolution || null,
          relief_amount: caseForm.reliefAmount ? Number(caseForm.reliefAmount) : null,
          issue_summary: caseForm.issueSummary.trim() || null,
          notes: caseForm.notes.trim() || null,
          metadata: {},
          created_by: 'demo-user',
          updated_by: 'demo-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setCases(prev => [newCase, ...prev]);
        setSelectedCaseId(newCase.id);
        toast({ title: 'Dispute case stored (demo mode)' });
        return;
      }

      const response = await upsertTaxDisputeCase({
        orgSlug: currentOrg.slug,
        taxEntityId: taxEntityId || currentOrg.id,
        caseType: caseForm.caseType,
        counterpartyJurisdiction: caseForm.counterpartyJurisdiction.trim(),
        counterpartyAuthority: caseForm.counterpartyAuthority.trim() || undefined,
        caseReference: caseForm.caseReference.trim() || undefined,
        status: caseForm.status,
        openedOn: caseForm.openedOn || undefined,
        expectedResolution: caseForm.expectedResolution || undefined,
        reliefAmount: caseForm.reliefAmount ? Number(caseForm.reliefAmount) : undefined,
        issueSummary: caseForm.issueSummary.trim() || undefined,
        notes: caseForm.notes.trim() || undefined,
      });

      setCases(prev => [response.case, ...prev.filter(item => item.id !== response.case.id)]);
      setSelectedCaseId(response.case.id);
      toast({ title: 'Dispute case saved' });
    } catch (error) {
      console.error('treaty-wht-case', error);
      toast({
        variant: 'destructive',
        title: 'Unable to save case',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setCaseLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!selectedCaseId) {
      toast({ variant: 'destructive', title: 'Select a case first' });
      return;
    }

    try {
      setEventLoading(true);
      if (!canExecute || !currentOrg?.slug) {
        const newEvent: TaxDisputeEvent = {
          id: crypto.randomUUID(),
          org_id: currentOrg?.id ?? 'demo-org',
          dispute_id: selectedCaseId,
          event_type: eventForm.eventType.trim() || 'EVENT',
          event_date: eventForm.eventDate || new Date().toISOString().slice(0, 10),
          description: eventForm.description.trim() || null,
          metadata: {},
          created_by: 'demo-user',
          created_at: new Date().toISOString(),
        };
        setCaseEvents(prev => [newEvent, ...prev]);
        toast({ title: 'Event logged (demo mode)' });
        return;
      }

      const response = await addTaxDisputeEvent({
        orgSlug: currentOrg.slug,
        caseId: selectedCaseId,
        eventType: eventForm.eventType.trim() || 'EVENT',
        eventDate: eventForm.eventDate || undefined,
        description: eventForm.description.trim() || undefined,
      });

      setCaseEvents(prev => [response.event, ...prev]);
      toast({ title: 'Event logged' });
    } catch (error) {
      console.error('treaty-wht-event', error);
      toast({
        variant: 'destructive',
        title: 'Unable to log event',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setEventLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Treaty WHT & MAP tracker</h1>
          <p className="text-muted-foreground">
            Compute treaty withholding relief, document treaty positions, and manage MAP/APA disputes end-to-end.
          </p>
        </div>
        <Badge variant={canExecute ? 'default' : 'outline'}>{canExecute ? 'Connected' : 'Demo mode'}</Badge>
      </div>

      <Card className="border border-primary/20">
        <CardHeader>
          <CardTitle>Treaty computation</CardTitle>
          <CardDescription>Enter treaty details and compute relief in line with model conventions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="font-medium text-muted-foreground">Tax entity ID</label>
              <Input value={taxEntityId} onChange={event => setTaxEntityId(event.target.value)} />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Counterparty jurisdiction</label>
              <Input
                value={whtForm.counterpartyJurisdiction}
                onChange={event => setWhtForm(prev => ({ ...prev, counterpartyJurisdiction: event.target.value }))}
                placeholder="e.g. United States"
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Payment type</label>
              <Input
                value={whtForm.paymentType}
                onChange={event => setWhtForm(prev => ({ ...prev, paymentType: event.target.value }))}
                placeholder="Dividends"
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Treaty article</label>
              <Input
                value={whtForm.treatyArticle}
                onChange={event => setWhtForm(prev => ({ ...prev, treatyArticle: event.target.value }))}
                placeholder="Article 10"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="font-medium text-muted-foreground">Gross amount</label>
              <Input
                value={whtForm.grossAmount}
                onChange={event => setWhtForm(prev => ({ ...prev, grossAmount: toNumberString(event.target.value) }))}
                placeholder="100000"
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Domestic rate</label>
              <Input
                value={whtForm.domesticRate}
                onChange={event => setWhtForm(prev => ({ ...prev, domesticRate: toNumberString(event.target.value) }))}
                placeholder="0.25"
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Treaty rate</label>
              <Input
                value={whtForm.treatyRate}
                onChange={event => setWhtForm(prev => ({ ...prev, treatyRate: toNumberString(event.target.value) }))}
                placeholder="0.10"
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Relief method</label>
              <Select
                value={whtForm.reliefMethod}
                onValueChange={value => setWhtForm(prev => ({ ...prev, reliefMethod: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {reliefMethods.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Notes</label>
              <Textarea
                value={whtForm.notes}
                onChange={event => setWhtForm(prev => ({ ...prev, notes: event.target.value }))}
                placeholder="Relief claimed via credit mechanism"
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleCompute} disabled={loadingCompute}>
              {loadingCompute ? 'Computing…' : 'Compute treaty relief'}
            </Button>
          </div>

          {whtResult && (
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Withholding before treaty</p>
                <p className="text-lg font-semibold">{formatCurrency(whtResult.withholdingBefore)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Withholding after treaty</p>
                <p className="text-lg font-semibold">{formatCurrency(whtResult.withholdingAfter)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Relief amount</p>
                <p className="text-lg font-semibold text-emerald-600">{formatCurrency(whtResult.reliefAmount)}</p>
                <p className="text-xs text-muted-foreground">Relief rate {formatPercent(whtResult.reliefRate)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Treaty computation history</CardTitle>
          <CardDescription>Recent computations stored for evidence and reuse.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {whtHistory.length === 0 && <p className="text-muted-foreground">No treaty computations yet.</p>}
          <div className="grid gap-3">
            {whtHistory.map(item => (
              <div key={item.id} className="rounded-lg border border-dashed p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{item.id.slice(0, 8)}</span>
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Payment type</p>
                    <p className="font-medium">{item.payment_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Jurisdiction</p>
                    <p className="font-medium">{item.counterparty_jurisdiction}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Domestic vs treaty</p>
                    <p className="font-medium">
                      {formatPercent(item.domestic_rate)} → {formatPercent(item.treaty_rate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Relief</p>
                    <p className="font-medium text-emerald-600">{formatCurrency(item.relief_amount)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>MAP / APA case management</CardTitle>
          <CardDescription>Track treaty disputes, resolution milestones, and relief obtained.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="font-medium text-muted-foreground">Case type</label>
              <Select value={caseForm.caseType} onValueChange={value => setCaseForm(prev => ({ ...prev, caseType: value as 'MAP' | 'APA' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAP">MAP</SelectItem>
                  <SelectItem value="APA">APA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Counterparty jurisdiction</label>
              <Input
                value={caseForm.counterpartyJurisdiction}
                onChange={event => setCaseForm(prev => ({ ...prev, counterpartyJurisdiction: event.target.value }))}
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Tax authority</label>
              <Input
                value={caseForm.counterpartyAuthority}
                onChange={event => setCaseForm(prev => ({ ...prev, counterpartyAuthority: event.target.value }))}
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Case reference</label>
              <Input
                value={caseForm.caseReference}
                onChange={event => setCaseForm(prev => ({ ...prev, caseReference: event.target.value }))}
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Status</label>
              <Select value={caseForm.status} onValueChange={value => setCaseForm(prev => ({ ...prev, status: value as TaxDisputeCase['status'] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {caseStatusOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {option.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="font-medium text-muted-foreground">Opened on</label>
              <Input
                type="date"
                value={caseForm.openedOn}
                onChange={event => setCaseForm(prev => ({ ...prev, openedOn: event.target.value }))}
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Expected resolution</label>
              <Input
                type="date"
                value={caseForm.expectedResolution}
                onChange={event => setCaseForm(prev => ({ ...prev, expectedResolution: event.target.value }))}
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Relief amount</label>
              <Input
                value={caseForm.reliefAmount}
                onChange={event => setCaseForm(prev => ({ ...prev, reliefAmount: toNumberString(event.target.value) }))}
                placeholder="50000"
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Notes</label>
              <Textarea
                value={caseForm.notes}
                onChange={event => setCaseForm(prev => ({ ...prev, notes: event.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-muted-foreground">Issue summary</label>
            <Textarea
              value={caseForm.issueSummary}
              onChange={event => setCaseForm(prev => ({ ...prev, issueSummary: event.target.value }))}
              rows={3}
              placeholder="Provide a concise summary of the dispute and relief sought."
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleCaseSubmit} disabled={caseLoading}>
              {caseLoading ? 'Saving…' : 'Save dispute case'}
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{cases.length} cases</span>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full divide-y divide-border text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Reference</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-left font-medium">Jurisdiction</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Opened</th>
                    <th className="px-3 py-2 text-left font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cases.map(item => (
                    <tr key={item.id} className={item.id === selectedCaseId ? 'bg-primary/5' : undefined}>
                      <td className="px-3 py-2 font-mono text-xs">{item.case_reference ?? '—'}</td>
                      <td className="px-3 py-2">{item.case_type}</td>
                      <td className="px-3 py-2">{item.counterparty_jurisdiction}</td>
                      <td className="px-3 py-2">{item.status.replace('_', ' ')}</td>
                      <td className="px-3 py-2">{item.opened_on}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="xs"
                          variant={item.id === selectedCaseId ? 'default' : 'ghost'}
                          onClick={() => setSelectedCaseId(item.id)}
                        >
                          {item.id === selectedCaseId ? 'Selected' : 'Select'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {cases.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-center text-muted-foreground" colSpan={6}>
                        No dispute cases recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case timeline</CardTitle>
          <CardDescription>Log MAP/APA milestones and monitor progress.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!selectedCase && <p className="text-muted-foreground">Select a case to view its timeline.</p>}

          {selectedCase && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="font-medium text-muted-foreground">Event type</label>
                  <Input
                    value={eventForm.eventType}
                    onChange={event => setEventForm(prev => ({ ...prev, eventType: event.target.value }))}
                    placeholder="Submission"
                  />
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">Event date</label>
                  <Input
                    type="date"
                    value={eventForm.eventDate}
                    onChange={event => setEventForm(prev => ({ ...prev, eventDate: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="font-medium text-muted-foreground">Description</label>
                  <Textarea
                    value={eventForm.description}
                    onChange={event => setEventForm(prev => ({ ...prev, description: event.target.value }))}
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleAddEvent} disabled={eventLoading}>
                  {eventLoading ? 'Logging…' : 'Log event'}
                </Button>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{caseEvents.length} events</span>
                </div>
                <div className="space-y-2">
                  {caseEvents.map(event => (
                    <div key={event.id} className="rounded-lg border border-dashed p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{event.event_date}</span>
                        <span>{event.event_type}</span>
                      </div>
                      {event.description && <p className="mt-2 text-sm">{event.description}</p>}
                    </div>
                  ))}
                  {caseEvents.length === 0 && (
                    <p className="text-muted-foreground">No events captured yet.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
