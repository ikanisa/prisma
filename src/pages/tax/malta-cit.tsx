import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/mock-data';
import {
  computeCit,
  prepareCitReturn,
  submitCitForApproval,
  approveCit,
  computeNidAdjustment,
  computePatentBoxAdjustment,
  listNidComputations,
  listPatentBoxComputations,
  type NidComputation,
  type PatentBoxComputation,
  computeInterestLimitation,
  computeCfcInclusion,
  listInterestLimitationComputations,
  listCfcInclusions,
  type InterestLimitationComputation,
  type CfcInclusion,
  computeFiscalUnity,
  listFiscalUnityComputations,
  type FiscalUnityComputation,
} from '@prisma-glow/tax-mt-service';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const REFUND_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: '6_7', label: '6/7ths refund' },
  { value: '5_7', label: '5/7ths refund' },
  { value: '2_3', label: '2/3rds refund' },
];

export default function MaltaCitPage() {
  const { currentOrg } = useAppStore();
  const { toast } = useToast();

  const [taxEntityId, setTaxEntityId] = useState('');
  const [period, setPeriod] = useState('2025');
  const [preTaxProfit, setPreTaxProfit] = useState('');
  const [adjustments, setAdjustments] = useState<Array<{ id: string; label: string; amount: string }>>([
    { id: crypto.randomUUID(), label: 'Timing differences', amount: '0' },
  ]);
  const [participationExempt, setParticipationExempt] = useState(false);
  const [refundProfile, setRefundProfile] = useState<'NONE' | '6_7' | '5_7' | '2_3'>('NONE');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<{
    chargeableIncome: number;
    citAmount: number;
    refundAmount: number;
    computationId: string;
  } | null>(null);
  const [returnPreview, setReturnPreview] = useState<Record<string, unknown> | null>(null);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nidForm, setNidForm] = useState({
    equityBase: '',
    riskFreeRate: '0.015',
    riskPremium: '0.05',
    referenceRateOverride: '',
    priorDeduction: '0',
    chargeableIncomeBeforeNid: '',
    capRatio: '0.9',
    notes: '',
  });
  const [nidResult, setNidResult] = useState<{
    computation: NidComputation;
    adjustmentAmount: number;
  } | null>(null);
  const [nidHistory, setNidHistory] = useState<NidComputation[]>([]);
  const [patentForm, setPatentForm] = useState({
    qualifyingIpIncome: '',
    qualifyingExpenditure: '',
    overallExpenditure: '',
    routineReturnRate: '0.1',
    upliftCap: '0.3',
    deductionRate: '0.95',
    notes: '',
  });
  const [patentResult, setPatentResult] = useState<{
    computation: PatentBoxComputation;
    adjustmentAmount: number;
  } | null>(null);
  const [patentHistory, setPatentHistory] = useState<PatentBoxComputation[]>([]);
  const [interestForm, setInterestForm] = useState({
    exceedingBorrowingCosts: '',
    taxEbitda: '',
    standaloneAllowance: '0',
    safeHarbourAmount: '3000000',
    carryforwardInterest: '0',
    carryforwardCapacity: '0',
    disallowedCarryforward: '0',
    notes: '',
  });
  const [interestResult, setInterestResult] = useState<{
    computation: InterestLimitationComputation;
    adjustmentAmount: number;
  } | null>(null);
  const [interestHistory, setInterestHistory] = useState<InterestLimitationComputation[]>([]);
  const [cfcForm, setCfcForm] = useState({
    cfcEntityName: '',
    cfcProfit: '',
    foreignTaxPaid: '',
    foreignRate: '',
    domesticRate: '0.35',
    participationPercentage: '1',
    profitAttributionRatio: '1',
    notes: '',
  });
  const [cfcResult, setCfcResult] = useState<{
    computation: CfcInclusion;
    adjustmentAmount: number;
  } | null>(null);
  const [cfcHistory, setCfcHistory] = useState<CfcInclusion[]>([]);
  const [fiscalMembers, setFiscalMembers] = useState<Array<{ id: string; taxEntityId: string; name: string; chargeableIncome: string; taxCredits: string }>>([
    { id: crypto.randomUUID(), taxEntityId: '', name: '', chargeableIncome: '', taxCredits: '0' },
  ]);
  const [fiscalForm, setFiscalForm] = useState({
    adjustments: '0',
    taxRate: '0.35',
    openingTaxAccount: '0',
    paymentsMade: '0',
    notes: '',
  });
  const [fiscalResult, setFiscalResult] = useState<{
    computation: FiscalUnityComputation;
    adjustmentAmount: number;
  } | null>(null);
  const [fiscalHistory, setFiscalHistory] = useState<FiscalUnityComputation[]>([]);

  const canExecute = isSupabaseConfigured;

  useEffect(() => {
    if (!taxEntityId && currentOrg) {
      setTaxEntityId(currentOrg.id);
    }
  }, [currentOrg, taxEntityId]);

  useEffect(() => {
    if (!canExecute || !currentOrg?.slug || !taxEntityId) {
      setNidHistory([]);
      setPatentHistory([]);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        const [nidResponse, patentResponse, ilrResponse, cfcResponse, fiscalResponse] = await Promise.all([
          listNidComputations({ orgSlug: currentOrg.slug, taxEntityId, period }).catch(() => ({ data: [] })),
          listPatentBoxComputations({ orgSlug: currentOrg.slug, taxEntityId, period }).catch(() => ({ data: [] })),
          listInterestLimitationComputations({ orgSlug: currentOrg.slug, taxEntityId, period }).catch(() => ({ data: [] })),
          listCfcInclusions({ orgSlug: currentOrg.slug, taxEntityId, period }).catch(() => ({ data: [] })),
          listFiscalUnityComputations({ orgSlug: currentOrg.slug, parentTaxEntityId: taxEntityId, period }).catch(() => ({ data: [] })),
        ]);

        if (!controller.signal.aborted) {
          setNidHistory(Array.isArray(nidResponse.data) ? nidResponse.data : []);
          setPatentHistory(Array.isArray(patentResponse.data) ? patentResponse.data : []);
          setInterestHistory(Array.isArray(ilrResponse.data) ? ilrResponse.data : []);
          setCfcHistory(Array.isArray(cfcResponse.data) ? cfcResponse.data : []);
          setFiscalHistory(Array.isArray(fiscalResponse.data) ? fiscalResponse.data : []);
        }
      } catch (error) {
        logger.error('malta_cit.adjustments_load_failed', error);
      }
    };

    load();

    return () => controller.abort();
  }, [canExecute, currentOrg?.slug, taxEntityId, period]);

  const handleAdjustmentChange = (id: string, field: 'label' | 'amount', value: string) => {
    setAdjustments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleAddAdjustment = () => {
    setAdjustments((prev) => [...prev, { id: crypto.randomUUID(), label: '', amount: '0' }]);
  };

  const applyCalculatedAdjustment = (label: string, amount: number, id: string) => {
    setAdjustments((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      return [...filtered, { id, label, amount: amount.toFixed(2) }];
    });
    toast({ title: 'Adjustment applied', description: `${label} pushed into CIT adjustments.` });
  };

  const handleComputeNid = async () => {
    if (!canExecute) {
      toast({ variant: 'destructive', title: 'Supabase not configured', description: 'Connect to backend first.' });
      return;
    }
    if (!currentOrg?.slug || !taxEntityId) {
      toast({ variant: 'destructive', title: 'Select a tax entity', description: 'Tax entity is required.' });
      return;
    }
    const equityBase = Number(nidForm.equityBase ?? 0);
    if (!Number.isFinite(equityBase) || equityBase <= 0) {
      toast({ variant: 'destructive', title: 'Enter equity base', description: 'Provide qualifying equity for NID.' });
      return;
    }

    try {
      setLoading(true);
      const response = await computeNidAdjustment({
        orgSlug: currentOrg.slug,
        taxEntityId,
        period,
        equityBase,
        riskFreeRate: Number(nidForm.riskFreeRate ?? 0),
        riskPremium: Number(nidForm.riskPremium ?? 0.05),
        referenceRateOverride: nidForm.referenceRateOverride ? Number(nidForm.referenceRateOverride) : undefined,
        priorDeduction: Number(nidForm.priorDeduction ?? 0),
        chargeableIncomeBeforeNid: nidForm.chargeableIncomeBeforeNid
          ? Number(nidForm.chargeableIncomeBeforeNid)
          : undefined,
        capRatio: nidForm.capRatio ? Number(nidForm.capRatio) : undefined,
        notes: nidForm.notes || undefined,
      });

      setNidResult({ computation: response.computation, adjustmentAmount: response.result.adjustmentAmount });
      setNidHistory((prev) => [response.computation, ...prev]);
      toast({ title: 'NID computed', description: 'Deduction recorded and ready to apply.' });
    } catch (error) {
      logger.error('malta_cit.nid_compute_failed', error);
      toast({
        variant: 'destructive',
        title: 'Failed to compute NID',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComputePatentBox = async () => {
    if (!canExecute) {
      toast({ variant: 'destructive', title: 'Supabase not configured', description: 'Connect to backend first.' });
      return;
    }
    if (!currentOrg?.slug || !taxEntityId) {
      toast({ variant: 'destructive', title: 'Select a tax entity', description: 'Tax entity is required.' });
      return;
    }

    const qualifyingIncome = Number(patentForm.qualifyingIpIncome ?? 0);
    const qualifyingExpenditure = Number(patentForm.qualifyingExpenditure ?? 0);
    const overallExpenditure = Number(patentForm.overallExpenditure ?? 0);

    if (!Number.isFinite(qualifyingIncome) || qualifyingIncome <= 0) {
      toast({ variant: 'destructive', title: 'Enter qualifying IP income', description: 'Provide a positive amount.' });
      return;
    }
    if (!Number.isFinite(qualifyingExpenditure) || qualifyingExpenditure < 0) {
      toast({ variant: 'destructive', title: 'Enter qualifying expenditure', description: 'Provide expenditure amount.' });
      return;
    }
    if (!Number.isFinite(overallExpenditure) || overallExpenditure <= 0) {
      toast({ variant: 'destructive', title: 'Enter overall expenditure', description: 'Provide overall expenditure amount.' });
      return;
    }

    try {
      setLoading(true);
      const response = await computePatentBoxAdjustment({
        orgSlug: currentOrg.slug,
        taxEntityId,
        period,
        qualifyingIpIncome: qualifyingIncome,
        qualifyingExpenditure,
        overallExpenditure,
        routineReturnRate: Number(patentForm.routineReturnRate ?? 0.1),
        upliftCap: Number(patentForm.upliftCap ?? 0.3),
        deductionRate: Number(patentForm.deductionRate ?? 0.95),
        notes: patentForm.notes || undefined,
      });

      setPatentResult({ computation: response.computation, adjustmentAmount: response.result.adjustmentAmount });
      setPatentHistory((prev) => [response.computation, ...prev]);
      toast({ title: 'Patent box deduction computed', description: 'Deduction recorded and ready to apply.' });
    } catch (error) {
      logger.error('malta_cit.patent_box_compute_failed', error);
      toast({
        variant: 'destructive',
        title: 'Failed to compute patent box deduction',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComputeInterestLimitation = async () => {
    if (!canExecute) {
      toast({ variant: 'destructive', title: 'Supabase not configured', description: 'Connect to backend first.' });
      return;
    }
    if (!currentOrg?.slug || !taxEntityId) {
      toast({ variant: 'destructive', title: 'Select a tax entity', description: 'Tax entity is required.' });
      return;
    }

    const ebc = Number(interestForm.exceedingBorrowingCosts ?? 0);
    const ebitda = Number(interestForm.taxEbitda ?? 0);
    if (!Number.isFinite(ebc) || ebc < 0) {
      toast({ variant: 'destructive', title: 'Enter exceeding borrowing costs', description: 'Provide a numeric value.' });
      return;
    }
    if (!Number.isFinite(ebitda) || ebitda < 0) {
      toast({ variant: 'destructive', title: 'Enter tax EBITDA', description: 'Provide a numeric value.' });
      return;
    }

    try {
      setLoading(true);
      const response = await computeInterestLimitation({
        orgSlug: currentOrg.slug,
        taxEntityId,
        period,
        exceedingBorrowingCosts: ebc,
        taxEbitda: ebitda,
        standaloneAllowance: Number(interestForm.standaloneAllowance ?? 0),
        safeHarbourAmount: Number(interestForm.safeHarbourAmount ?? 3_000_000),
        carryforwardInterest: Number(interestForm.carryforwardInterest ?? 0),
        carryforwardCapacity: Number(interestForm.carryforwardCapacity ?? 0),
        disallowedCarryforward: Number(interestForm.disallowedCarryforward ?? 0),
        notes: interestForm.notes || undefined,
      });

      setInterestResult({ computation: response.computation, adjustmentAmount: response.result.adjustmentAmount });
      setInterestHistory((prev) => [response.computation, ...prev]);
      toast({ title: 'Interest limitation computed', description: 'Disallowed interest ready for adjustment.' });
    } catch (error) {
      logger.error('malta_cit.ilr_compute_failed', error);
      toast({
        variant: 'destructive',
        title: 'Failed to compute ATAD interest limitation',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComputeCfc = async () => {
    if (!canExecute) {
      toast({ variant: 'destructive', title: 'Supabase not configured', description: 'Connect to backend first.' });
      return;
    }
    if (!currentOrg?.slug || !taxEntityId) {
      toast({ variant: 'destructive', title: 'Select a tax entity', description: 'Tax entity is required.' });
      return;
    }

    const profit = Number(cfcForm.cfcProfit ?? 0);
    const foreignTax = Number(cfcForm.foreignTaxPaid ?? 0);
    if (!Number.isFinite(profit) || profit <= 0) {
      toast({ variant: 'destructive', title: 'Enter CFC profit', description: 'Provide a positive amount.' });
      return;
    }
    if (!Number.isFinite(foreignTax) || foreignTax < 0) {
      toast({ variant: 'destructive', title: 'Enter foreign tax paid', description: 'Provide foreign tax amount.' });
      return;
    }

    try {
      setLoading(true);
      const response = await computeCfcInclusion({
        orgSlug: currentOrg.slug,
        taxEntityId,
        period,
        cfcProfit: profit,
        foreignTaxPaid: foreignTax,
        foreignRate: cfcForm.foreignRate ? Number(cfcForm.foreignRate) : undefined,
        domesticRate: cfcForm.domesticRate ? Number(cfcForm.domesticRate) : undefined,
        participationPercentage: Number(cfcForm.participationPercentage ?? 1),
        profitAttributionRatio: cfcForm.profitAttributionRatio
          ? Number(cfcForm.profitAttributionRatio)
          : undefined,
        cfcEntityName: cfcForm.cfcEntityName || undefined,
        notes: cfcForm.notes || undefined,
      });

      setCfcResult({ computation: response.computation, adjustmentAmount: response.result.adjustmentAmount });
      setCfcHistory((prev) => [response.computation, ...prev]);
      toast({ title: 'CFC inclusion computed', description: 'Inclusion amount ready for adjustment.' });
    } catch (error) {
      logger.error('malta_cit.cfc_compute_failed', error);
      toast({
        variant: 'destructive',
        title: 'Failed to compute CFC inclusion',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFiscalMember = () => {
    setFiscalMembers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), taxEntityId: '', name: '', chargeableIncome: '', taxCredits: '0' },
    ]);
  };

  const handleFiscalMemberChange = (
    id: string,
    field: 'taxEntityId' | 'name' | 'chargeableIncome' | 'taxCredits',
    value: string,
  ) => {
    setFiscalMembers((prev) => prev.map((member) => (member.id === id ? { ...member, [field]: value } : member)));
  };

  const handleRemoveFiscalMember = (id: string) => {
    setFiscalMembers((prev) => (prev.length > 1 ? prev.filter((member) => member.id !== id) : prev));
  };

  const handleComputeFiscalUnity = async () => {
    if (!canExecute) {
      toast({ variant: 'destructive', title: 'Supabase not configured', description: 'Connect to backend first.' });
      return;
    }
    if (!currentOrg?.slug || !taxEntityId) {
      toast({ variant: 'destructive', title: 'Select parent entity', description: 'Tax entity is required.' });
      return;
    }

    const members = fiscalMembers
      .map((member) => ({
        taxEntityId: member.taxEntityId || taxEntityId,
        name: member.name || undefined,
        chargeableIncome: Number(member.chargeableIncome ?? 0),
        taxCredits: Number(member.taxCredits ?? 0),
      }))
      .filter((member) => Number.isFinite(member.chargeableIncome));

    if (members.length === 0) {
      toast({ variant: 'destructive', title: 'Add at least one member', description: 'Provide member chargeable income.' });
      return;
    }

    try {
      setLoading(true);
      const response = await computeFiscalUnity({
        orgSlug: currentOrg.slug,
        parentTaxEntityId: taxEntityId,
        period,
        members,
        adjustments: Number(fiscalForm.adjustments ?? 0),
        taxRate: Number(fiscalForm.taxRate ?? 0.35),
        openingTaxAccount: Number(fiscalForm.openingTaxAccount ?? 0),
        paymentsMade: Number(fiscalForm.paymentsMade ?? 0),
        notes: fiscalForm.notes || undefined,
      });

      setFiscalResult({ computation: response.computation, adjustmentAmount: response.result.adjustmentAmount });
      setFiscalHistory((prev) => [response.computation, ...prev]);
      toast({ title: 'Fiscal unity computed', description: 'Group tax consolidation stored.' });
    } catch (error) {
      logger.error('malta_cit.fiscal_unity_compute_failed', error);
      toast({
        variant: 'destructive',
        title: 'Failed to compute fiscal unity',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompute = async () => {
    if (!canExecute) {
      toast({
        variant: 'destructive',
        title: 'Supabase not configured',
        description: 'Connect to the secure backend to run tax computations.',
      });
      return;
    }
    if (!taxEntityId) {
      toast({ variant: 'destructive', title: 'Select a tax entity', description: 'Tax entity is required.' });
      return;
    }
    try {
      setLoading(true);
      const numericAdjustments = adjustments
        .filter((item) => item.label.trim().length > 0 || Number(item.amount) !== 0)
        .map((item) => ({ label: item.label, amount: Number(item.amount ?? 0) }));

      const payload = await computeCit({
        orgSlug: currentOrg?.slug ?? '',
        taxEntityId,
        period,
        preTaxProfit: Number(preTaxProfit || 0),
        adjustments: numericAdjustments,
        participationExempt,
        refundProfile,
        notes: notes || undefined,
      });

      setResult(payload);
      toast({ title: 'CIT computed', description: `Chargeable income ${payload.chargeableIncome.toFixed(2)}.` });
    } catch (error) {
      logger.error('malta_cit.compute_failed', error);
      toast({
        variant: 'destructive',
        title: 'Computation failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareReturn = async () => {
    if (!canExecute) {
      toast({ variant: 'destructive', title: 'Supabase not configured', description: 'Connect to backend first.' });
      return;
    }
    try {
      setLoading(true);
      const response = await prepareCitReturn({ orgSlug: currentOrg?.slug ?? '', taxEntityId, period });
      const payloadMeta = response.returnFile?.payload_meta;
      setReturnPreview(
        payloadMeta && typeof payloadMeta === 'object' && !Array.isArray(payloadMeta)
          ? (payloadMeta as Record<string, unknown>)
          : null,
      );
      toast({ title: 'Return prepared', description: 'Schedules generated for review.' });
    } catch (error) {
      logger.error('malta_cit.return_generation_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to prepare return',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canExecute) {
      toast({ variant: 'destructive', title: 'Supabase not configured', description: 'Connect to backend first.' });
      return;
    }
    try {
      setLoading(true);
      const response = await submitCitForApproval({
        orgSlug: currentOrg?.slug ?? '',
        taxEntityId,
        period,
        engagementId: null,
      });
      setApprovalId(response.approvalId);
      toast({
        title: 'Submitted for approval',
        description: 'Partner review queued (Malta Income Tax Act full imputation).',
      });
    } catch (error) {
      logger.error('malta_cit.submit_failed', error);
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!canExecute) {
      toast({ variant: 'destructive', title: 'Supabase not configured', description: 'Connect to backend first.' });
      return;
    }
    if (!approvalId) return;
    try {
      setLoading(true);
      await approveCit({
        orgSlug: currentOrg?.slug ?? '',
        taxEntityId,
        period,
        approvalId,
        decision: 'APPROVED',
      });
      toast({ title: 'Return approved', description: 'CIT computation locked and ready for filing.' });
    } catch (error) {
      logger.error('malta_cit.approve_failed', error);
      toast({
        variant: 'destructive',
        title: 'Approval failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalAdjustments = useMemo(
    () =>
      adjustments.reduce((sum, item) => {
        const value = Number(item.amount ?? 0);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [adjustments],
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Malta CIT &amp; Tax Accounts</h1>
          <p className="text-muted-foreground">
            Malta Income Tax Act, full imputation system &amp; refund entitlements (T‑1A)
          </p>
        </div>
        <Badge variant={canExecute ? 'default' : 'outline'}>
          {canExecute ? 'Connected' : 'Demo mode'}
        </Badge>
      </div>

      <Card className="border border-primary/10 shadow-md">
        <CardHeader>
          <CardTitle>Computation inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Tax entity ID</label>
              <Input value={taxEntityId} onChange={(event) => setTaxEntityId(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Period</label>
              <Input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="2025" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Pre-tax profit</label>
              <Input
                type="number"
                value={preTaxProfit}
                onChange={(event) => setPreTaxProfit(event.target.value)}
                placeholder="e.g. 500000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Adjustments (add backs/deductions)</label>
            <div className="space-y-2">
              {adjustments.map((item) => (
                <div key={item.id} className="grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder="Description"
                    value={item.label}
                    onChange={(event) => handleAdjustmentChange(item.id, 'label', event.target.value)}
                  />
                  <Input
                    type="number"
                    value={item.amount}
                    onChange={(event) => handleAdjustmentChange(item.id, 'amount', event.target.value)}
                  />
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={handleAddAdjustment}>
              Add adjustment
            </Button>
            <p className="text-xs text-muted-foreground">Total adjustments: {totalAdjustments.toFixed(2)}</p>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <input
                type="checkbox"
                checked={participationExempt}
                onChange={(event) => setParticipationExempt(event.target.checked)}
              />
              Participation exemption applies
            </label>
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Refund profile</span>
              <Select value={refundProfile} onValueChange={(value) => setRefundProfile(value as typeof refundProfile)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select refund profile" />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Textarea
            rows={3}
            placeholder="Notes for computation memo (NID impact, fiscal unity adjustments, reference to Malta Income Tax Act)."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />

          <div className="flex flex-wrap gap-3">
            <Button variant="gradient" onClick={handleCompute} disabled={loading}>
              Compute CIT @ 35%
            </Button>
            <Button variant="secondary" onClick={handlePrepareReturn} disabled={loading || !result}>
              Prepare return schedules
            </Button>
            <Button variant="outline" onClick={handleSubmit} disabled={loading || !result}>
              Submit for partner approval
            </Button>
            <Button variant="outline" onClick={handleApprove} disabled={loading || !approvalId}>
              Partner approve & lock
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle>Normal Interest Deduction (NID)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Qualifying equity base</label>
              <Input
                type="number"
                value={nidForm.equityBase}
                onChange={(event) => setNidForm((prev) => ({ ...prev, equityBase: event.target.value }))}
                placeholder="e.g. 750000"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Risk-free rate</label>
              <Input
                type="number"
                step="0.0001"
                value={nidForm.riskFreeRate}
                onChange={(event) => setNidForm((prev) => ({ ...prev, riskFreeRate: event.target.value }))}
                placeholder="0.015"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Risk premium</label>
              <Input
                type="number"
                step="0.0001"
                value={nidForm.riskPremium}
                onChange={(event) => setNidForm((prev) => ({ ...prev, riskPremium: event.target.value }))}
                placeholder="0.05"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Reference rate override</label>
              <Input
                type="number"
                step="0.0001"
                value={nidForm.referenceRateOverride}
                onChange={(event) =>
                  setNidForm((prev) => ({ ...prev, referenceRateOverride: event.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Carryforward NID utilised</label>
              <Input
                type="number"
                value={nidForm.priorDeduction}
                onChange={(event) => setNidForm((prev) => ({ ...prev, priorDeduction: event.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Chargeable income before NID</label>
              <Input
                type="number"
                value={nidForm.chargeableIncomeBeforeNid}
                onChange={(event) =>
                  setNidForm((prev) => ({ ...prev, chargeableIncomeBeforeNid: event.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Cap ratio</label>
              <Input
                type="number"
                step="0.01"
                value={nidForm.capRatio}
                onChange={(event) => setNidForm((prev) => ({ ...prev, capRatio: event.target.value }))}
              />
            </div>
          </div>
          <Textarea
            rows={2}
            placeholder="Notes captured with computation"
            value={nidForm.notes}
            onChange={(event) => setNidForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleComputeNid} disabled={loading}>
              Compute NID deduction
            </Button>
            {nidResult && (
              <Button
                variant="secondary"
                onClick={() =>
                  applyCalculatedAdjustment(
                    `NID deduction (${period})`,
                    nidResult.adjustmentAmount,
                    nidResult.computation.id,
                  )
                }
              >
                Apply deduction to CIT adjustments
              </Button>
            )}
          </div>
          {nidResult && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900 space-y-1">
              <p>Reference rate: {(nidResult.computation.reference_rate * 100).toFixed(2)}%</p>
              <p>Deduction after carryforward: {nidResult.computation.deduction_after_carryforward.toFixed(2)}</p>
              <p>Adjustment pushed to CIT: {nidResult.adjustmentAmount.toFixed(2)}</p>
            </div>
          )}
          {nidHistory.length > 0 && (
            <div className="space-y-2 text-xs">
              <p className="font-medium text-muted-foreground">Recent NID computations</p>
              <div className="overflow-x-auto">
                <table className="min-w-full border text-left">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Period</th>
                      <th className="px-3 py-2">Deduction</th>
                      <th className="px-3 py-2">Adjustment</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nidHistory.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">{new Date(item.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{item.period}</td>
                        <td className="px-3 py-2">{item.deduction_after_carryforward.toFixed(2)}</td>
                        <td className="px-3 py-2">{item.adjustment_amount.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              applyCalculatedAdjustment(
                                `NID deduction (${item.period})`,
                                item.adjustment_amount,
                                item.id,
                              )
                            }
                          >
                            Apply
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle>Patent Box (Malta) deduction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Qualifying IP income</label>
              <Input
                type="number"
                value={patentForm.qualifyingIpIncome}
                onChange={(event) => setPatentForm((prev) => ({ ...prev, qualifyingIpIncome: event.target.value }))}
                placeholder="e.g. 250000"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Qualifying expenditure</label>
              <Input
                type="number"
                value={patentForm.qualifyingExpenditure}
                onChange={(event) =>
                  setPatentForm((prev) => ({ ...prev, qualifyingExpenditure: event.target.value }))
                }
                placeholder="e.g. 120000"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Overall expenditure</label>
              <Input
                type="number"
                value={patentForm.overallExpenditure}
                onChange={(event) =>
                  setPatentForm((prev) => ({ ...prev, overallExpenditure: event.target.value }))
                }
                placeholder="e.g. 160000"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Routine return rate</label>
              <Input
                type="number"
                step="0.01"
                value={patentForm.routineReturnRate}
                onChange={(event) => setPatentForm((prev) => ({ ...prev, routineReturnRate: event.target.value }))}
                placeholder="0.1"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Uplift cap</label>
              <Input
                type="number"
                step="0.01"
                value={patentForm.upliftCap}
                onChange={(event) => setPatentForm((prev) => ({ ...prev, upliftCap: event.target.value }))}
                placeholder="0.3"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Deduction rate</label>
              <Input
                type="number"
                step="0.01"
                value={patentForm.deductionRate}
                onChange={(event) => setPatentForm((prev) => ({ ...prev, deductionRate: event.target.value }))}
                placeholder="0.95"
              />
            </div>
          </div>
          <Textarea
            rows={2}
            placeholder="Notes captured with computation"
            value={patentForm.notes}
            onChange={(event) => setPatentForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleComputePatentBox} disabled={loading}>
              Compute patent box deduction
            </Button>
            {patentResult && (
              <Button
                variant="secondary"
                onClick={() =>
                  applyCalculatedAdjustment(
                    `Patent box deduction (${period})`,
                    patentResult.adjustmentAmount,
                    patentResult.computation.id,
                  )
                }
              >
                Apply deduction to CIT adjustments
              </Button>
            )}
          </div>
          {patentResult && (
            <div className="rounded-md border border-blue-200 bg-blue-50/70 p-3 text-sm text-blue-900 space-y-1">
              <p>Deduction base: {patentResult.computation.deduction_base?.toFixed?.(2) ?? ''}</p>
              <p>Deduction amount: {patentResult.computation.deduction_amount.toFixed(2)}</p>
              <p>Adjustment pushed to CIT: {patentResult.adjustmentAmount.toFixed(2)}</p>
            </div>
          )}
          {patentHistory.length > 0 && (
            <div className="space-y-2 text-xs">
              <p className="font-medium text-muted-foreground">Recent patent box computations</p>
              <div className="overflow-x-auto">
                <table className="min-w-full border text-left">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Period</th>
                      <th className="px-3 py-2">Deduction</th>
                      <th className="px-3 py-2">Adjustment</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patentHistory.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">{new Date(item.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{item.period}</td>
                        <td className="px-3 py-2">{item.deduction_amount.toFixed(2)}</td>
                        <td className="px-3 py-2">{item.adjustment_amount.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              applyCalculatedAdjustment(
                                `Patent box deduction (${item.period})`,
                                item.adjustment_amount,
                                item.id,
                              )
                            }
                          >
                            Apply
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle>ATAD Interest Limitation (ILR)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Exceeding borrowing costs</label>
              <Input
                type="number"
                value={interestForm.exceedingBorrowingCosts}
                onChange={(event) => setInterestForm((prev) => ({ ...prev, exceedingBorrowingCosts: event.target.value }))}
                placeholder="e.g. 4500000"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Tax EBITDA</label>
              <Input
                type="number"
                value={interestForm.taxEbitda}
                onChange={(event) => setInterestForm((prev) => ({ ...prev, taxEbitda: event.target.value }))}
                placeholder="e.g. 12000000"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Standalone allowance</label>
              <Input
                type="number"
                value={interestForm.standaloneAllowance}
                onChange={(event) => setInterestForm((prev) => ({ ...prev, standaloneAllowance: event.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Safe harbour amount</label>
              <Input
                type="number"
                value={interestForm.safeHarbourAmount}
                onChange={(event) => setInterestForm((prev) => ({ ...prev, safeHarbourAmount: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Carryforward interest</label>
              <Input
                type="number"
                value={interestForm.carryforwardInterest}
                onChange={(event) => setInterestForm((prev) => ({ ...prev, carryforwardInterest: event.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Carryforward capacity</label>
              <Input
                type="number"
                value={interestForm.carryforwardCapacity}
                onChange={(event) => setInterestForm((prev) => ({ ...prev, carryforwardCapacity: event.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Disallowed interest carryforward</label>
              <Input
                type="number"
                value={interestForm.disallowedCarryforward}
                onChange={(event) => setInterestForm((prev) => ({ ...prev, disallowedCarryforward: event.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <Textarea
            rows={2}
            placeholder="Notes captured with computation"
            value={interestForm.notes}
            onChange={(event) => setInterestForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleComputeInterestLimitation} disabled={loading}>
              Compute ATAD ILR
            </Button>
            {interestResult && (
              <Button
                variant="secondary"
                onClick={() =>
                  applyCalculatedAdjustment(
                    `ATAD ILR disallowed interest (${period})`,
                    interestResult.adjustmentAmount,
                    interestResult.computation.id,
                  )
                }
              >
                Apply disallowed interest
              </Button>
            )}
          </div>
          {interestResult && (
            <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900 space-y-1">
              <p>Allowed interest: {interestResult.computation.allowed_interest.toFixed(2)}</p>
              <p>Disallowed interest: {interestResult.computation.disallowed_interest.toFixed(2)}</p>
              <p>Adjustment pushed to CIT: {interestResult.adjustmentAmount.toFixed(2)}</p>
            </div>
          )}
          {interestHistory.length > 0 && (
            <div className="space-y-2 text-xs">
              <p className="font-medium text-muted-foreground">Recent ILR computations</p>
              <div className="overflow-x-auto">
                <table className="min-w-full border text-left">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Period</th>
                      <th className="px-3 py-2">Disallowed</th>
                      <th className="px-3 py-2">Adjustment</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interestHistory.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">{new Date(item.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{item.period}</td>
                        <td className="px-3 py-2">{item.disallowed_interest.toFixed(2)}</td>
                        <td className="px-3 py-2">{item.adjustment_amount.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              applyCalculatedAdjustment(
                                `ATAD ILR disallowed interest (${item.period})`,
                                item.adjustment_amount,
                                item.id,
                              )
                            }
                          >
                            Apply
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle>CFC Inclusion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">CFC entity name</label>
              <Input
                value={cfcForm.cfcEntityName}
                onChange={(event) => setCfcForm((prev) => ({ ...prev, cfcEntityName: event.target.value }))}
                placeholder="Subsidiary Ltd"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">CFC profit</label>
              <Input
                type="number"
                value={cfcForm.cfcProfit}
                onChange={(event) => setCfcForm((prev) => ({ ...prev, cfcProfit: event.target.value }))}
                placeholder="e.g. 500000"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Foreign tax paid</label>
              <Input
                type="number"
                value={cfcForm.foreignTaxPaid}
                onChange={(event) => setCfcForm((prev) => ({ ...prev, foreignTaxPaid: event.target.value }))}
                placeholder="e.g. 60000"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Foreign rate (optional)</label>
              <Input
                type="number"
                step="0.0001"
                value={cfcForm.foreignRate}
                onChange={(event) => setCfcForm((prev) => ({ ...prev, foreignRate: event.target.value }))}
                placeholder="calculated if blank"
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Domestic rate</label>
              <Input
                type="number"
                step="0.0001"
                value={cfcForm.domesticRate}
                onChange={(event) => setCfcForm((prev) => ({ ...prev, domesticRate: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Participation %</label>
              <Input
                type="number"
                step="0.01"
                value={cfcForm.participationPercentage}
                onChange={(event) => setCfcForm((prev) => ({ ...prev, participationPercentage: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Profit attribution ratio</label>
              <Input
                type="number"
                step="0.01"
                value={cfcForm.profitAttributionRatio}
                onChange={(event) => setCfcForm((prev) => ({ ...prev, profitAttributionRatio: event.target.value }))}
              />
            </div>
          </div>
          <Textarea
            rows={2}
            placeholder="Notes captured with computation"
            value={cfcForm.notes}
            onChange={(event) => setCfcForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleComputeCfc} disabled={loading}>
              Compute CFC inclusion
            </Button>
            {cfcResult && (
              <Button
                variant="secondary"
                onClick={() =>
                  applyCalculatedAdjustment(
                    `CFC inclusion (${period})`,
                    cfcResult.adjustmentAmount,
                    cfcResult.computation.id,
                  )
                }
              >
                Apply inclusion to CIT
              </Button>
            )}
          </div>
          {cfcResult && (
            <div className="rounded-md border border-purple-200 bg-purple-50/70 p-3 text-sm text-purple-900 space-y-1">
              <p>Inclusion amount: {cfcResult.computation.adjustment_amount.toFixed(2)}</p>
              <p>Foreign rate: {(cfcResult.computation.foreign_rate * 100).toFixed(2)}%</p>
              <p>Tax credit eligible: {cfcResult.computation.tax_credit_eligible.toFixed(2)}</p>
            </div>
          )}
          {cfcHistory.length > 0 && (
            <div className="space-y-2 text-xs">
              <p className="font-medium text-muted-foreground">Recent CFC inclusions</p>
              <div className="overflow-x-auto">
                <table className="min-w-full border text-left">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Period</th>
                      <th className="px-3 py-2">Entity</th>
                      <th className="px-3 py-2">Inclusion</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cfcHistory.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">{new Date(item.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{item.period}</td>
                        <td className="px-3 py-2">{item.cfc_entity_name ?? '—'}</td>
                        <td className="px-3 py-2">{item.adjustment_amount.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              applyCalculatedAdjustment(
                                `CFC inclusion (${item.period})`,
                                item.adjustment_amount,
                                item.id,
                              )
                            }
                          >
                            Apply
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle>Fiscal Unity Consolidation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Enter members of the fiscal unit and their chargeable income. Consolidated CIT is computed at group level and
              allocated by relative income.
            </p>
            <div className="space-y-2">
              {fiscalMembers.map((member, index) => (
                <div key={member.id} className="grid gap-2 md:grid-cols-5 items-center">
                  <Input
                    placeholder="Member tax entity ID"
                    value={member.taxEntityId}
                    onChange={(event) => handleFiscalMemberChange(member.id, 'taxEntityId', event.target.value)}
                    className="md:col-span-1"
                  />
                  <Input
                    placeholder="Member name"
                    value={member.name}
                    onChange={(event) => handleFiscalMemberChange(member.id, 'name', event.target.value)}
                    className="md:col-span-1"
                  />
                  <Input
                    type="number"
                    placeholder="Chargeable income"
                    value={member.chargeableIncome}
                    onChange={(event) => handleFiscalMemberChange(member.id, 'chargeableIncome', event.target.value)}
                    className="md:col-span-1"
                  />
                  <Input
                    type="number"
                    placeholder="Tax credits"
                    value={member.taxCredits}
                    onChange={(event) => handleFiscalMemberChange(member.id, 'taxCredits', event.target.value)}
                    className="md:col-span-1"
                  />
                  <div className="flex items-center gap-2 md:col-span-1">
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveFiscalMember(member.id)} disabled={fiscalMembers.length === 1}>
                      ×
                    </Button>
                    <span className="text-xs text-muted-foreground">Member {index + 1}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleAddFiscalMember}>
              Add member
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Group adjustments</label>
              <Input
                type="number"
                value={fiscalForm.adjustments}
                onChange={(event) => setFiscalForm((prev) => ({ ...prev, adjustments: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Tax rate</label>
              <Input
                type="number"
                step="0.0001"
                value={fiscalForm.taxRate}
                onChange={(event) => setFiscalForm((prev) => ({ ...prev, taxRate: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Opening tax account</label>
              <Input
                type="number"
                value={fiscalForm.openingTaxAccount}
                onChange={(event) => setFiscalForm((prev) => ({ ...prev, openingTaxAccount: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-muted-foreground">Payments made</label>
              <Input
                type="number"
                value={fiscalForm.paymentsMade}
                onChange={(event) => setFiscalForm((prev) => ({ ...prev, paymentsMade: event.target.value }))}
              />
            </div>
          </div>
          <Textarea
            rows={2}
            placeholder="Notes captured with computation"
            value={fiscalForm.notes}
            onChange={(event) => setFiscalForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleComputeFiscalUnity} disabled={loading}>
              Compute fiscal unity
            </Button>
            {fiscalResult && (
              <Button
                variant="secondary"
                onClick={() =>
                  applyCalculatedAdjustment(
                    `Fiscal unity net tax payable (${period})`,
                    fiscalResult.adjustmentAmount,
                    fiscalResult.computation.id,
                  )
                }
              >
                Apply consolidation adjustment
              </Button>
            )}
          </div>
          {fiscalResult && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm space-y-1">
              <p>Total chargeable income: {fiscalResult.computation.total_chargeable_income.toFixed(2)}</p>
              <p>Consolidated CIT: {fiscalResult.computation.consolidated_cit.toFixed(2)}</p>
              <p>Net tax payable (adjustment): {fiscalResult.adjustmentAmount.toFixed(2)}</p>
            </div>
          )}
          {fiscalHistory.length > 0 && (
            <div className="space-y-2 text-xs">
              <p className="font-medium text-muted-foreground">Recent fiscal unity computations</p>
              <div className="overflow-x-auto">
                <table className="min-w-full border text-left">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Period</th>
                      <th className="px-3 py-2">Net tax payable</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiscalHistory.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">{new Date(item.created_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{item.period}</td>
                        <td className="px-3 py-2">{item.adjustment_amount.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              applyCalculatedAdjustment(
                                `Fiscal unity net tax payable (${item.period})`,
                                item.adjustment_amount,
                                item.id,
                              )
                            }
                          >
                            Apply
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className="border border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle>Computation summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-emerald-900">
            <p>Chargeable income: {result.chargeableIncome.toFixed(2)}</p>
            <p>CIT @ 35%: {result.citAmount.toFixed(2)}</p>
            <p>Refund entitlement: {result.refundAmount.toFixed(2)} ({refundProfile.replace('_', '/')})</p>
            <p className="text-xs text-emerald-700">Computation ID: {result.computationId}</p>
          </CardContent>
        </Card>
      )}

      {returnPreview && (
        <Card className="border border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle>Return schedules</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto text-xs text-blue-900">
              {JSON.stringify(returnPreview, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
