import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/mock-data';
import {
  computeUsOverlay,
  listUsOverlayCalculations,
  type UsOverlayCalculation,
} from '@/lib/tax-mt-service';
import {
  calculateGilti,
  calculateSection163J,
  calculateCamt,
  calculateExcise4501,
  calculateUsOverlay,
} from '@/lib/tax/calculators';
import { logger } from '@/lib/logger';

const numberFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 2,
});

const overlayOptions = [
  { value: 'GILTI', label: 'GILTI' },
  { value: '163J', label: '§163(j)' },
  { value: 'CAMT', label: 'CAMT' },
  { value: 'EXCISE_4501', label: 'IRC §4501 Excise' },
] as const;

type OverlayOption = (typeof overlayOptions)[number]['value'];

const sanitizeNumeric = (value: string) => value.replace(/[^\d.-]/g, '');

const defaultGilti = {
  testedIncome: '500000',
  testedLoss: '0',
  qbaI: '200000',
  interestExpense: '20000',
  foreignTaxesPaid: '30000',
  ftcLimit: '0.8',
  corporateRate: '0.21',
  section250DeductionRate: '0.5',
  ftcPercentage: '0.8',
};

const default163j = {
  businessInterestExpense: '400000',
  businessInterestIncome: '10000',
  adjustedTaxableIncome: '1000000',
  floorPlanInterest: '5000',
  carryforwardInterest: '50000',
};

const defaultCamt = {
  adjustedFinancialStatementIncome: '2000000',
  camtCreditCarryforward: '100000',
  regularTaxLiability: '250000',
  camtRate: '0.15',
};

const defaultExcise = {
  netRepurchase: '300000',
  permittedExceptions: '50000',
  rate: '0.01',
};

export default function UsOverlaysPage() {
  const { toast } = useToast();
  const { currentOrg } = useAppStore();
  const [taxEntityId, setTaxEntityId] = useState('');
  const [period, setPeriod] = useState(() => new Date().getFullYear().toString());
  const [overlayType, setOverlayType] = useState<OverlayOption>('GILTI');
  const canExecute = isSupabaseConfigured;

  const [giltiForm, setGiltiForm] = useState(defaultGilti);
  const [section163jForm, setSection163jForm] = useState(default163j);
  const [camtForm, setCamtForm] = useState(defaultCamt);
  const [exciseForm, setExciseForm] = useState(defaultExcise);
  const [notes, setNotes] = useState('');

  const [history, setHistory] = useState<UsOverlayCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeResult, setActiveResult] = useState<Record<string, unknown> | null>(null);

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
        const response = await listUsOverlayCalculations({
          orgSlug: currentOrg.slug,
          taxEntityId,
          overlayType,
        });
        if (!controller.signal.aborted) {
          setHistory(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        logger.error('us_overlays.history_load_failed', error);
      }
    };

    load();

    return () => controller.abort();
  }, [canExecute, currentOrg?.slug, taxEntityId, overlayType]);

  const formState = useMemo(() => {
    switch (overlayType) {
      case '163J':
        return [section163jForm, setSection163jForm] as const;
      case 'CAMT':
        return [camtForm, setCamtForm] as const;
      case 'EXCISE_4501':
        return [exciseForm, setExciseForm] as const;
      case 'GILTI':
      default:
        return [giltiForm, setGiltiForm] as const;
    }
  }, [overlayType, giltiForm, section163jForm, camtForm, exciseForm]);

  const [formValues, setFormValues] = formState;

  const computeDemo = () => {
    const numericInputs = getNumericInputs(overlayType, formValues);
    switch (overlayType) {
      case 'GILTI':
        return calculateGilti(numericInputs as Parameters<typeof calculateGilti>[0]);
      case '163J':
        return calculateSection163J(numericInputs as Parameters<typeof calculateSection163J>[0]);
      case 'CAMT':
        return calculateCamt(numericInputs as Parameters<typeof calculateCamt>[0]);
      case 'EXCISE_4501':
      default:
        return calculateExcise4501(numericInputs as Parameters<typeof calculateExcise4501>[0]);
    }
  };

  const handleCompute = async () => {
    if (!taxEntityId.trim()) {
      toast({ variant: 'destructive', title: 'Tax entity required' });
      return;
    }

    setLoading(true);
    try {
      const numericInputs = getNumericInputs(overlayType, formValues);

      if (!canExecute || !currentOrg?.slug) {
        const result = calculateUsOverlay({ overlayType, ...numericInputs } as any);
        setActiveResult(result);
        const demoCalculation: UsOverlayCalculation = {
          id: crypto.randomUUID(),
          org_id: currentOrg?.id ?? 'demo-org',
          tax_entity_id: taxEntityId,
          period,
          overlay_type: overlayType,
          inputs: numericInputs,
          results: result,
          adjustment_amount: getAdjustmentAmount(overlayType, result),
          notes: notes || null,
          metadata: {},
          created_by: 'demo-user',
          updated_by: 'demo-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setHistory(prev => [demoCalculation, ...prev]);
        toast({ title: 'Overlay computation stored (demo mode)' });
        return;
      }

      const response = await computeUsOverlay({
        orgSlug: currentOrg.slug,
        taxEntityId,
        period,
        overlayType,
        inputs: numericInputs,
        notes: notes || undefined,
      });

      setActiveResult(response.result);
      setHistory(prev => [response.calculation, ...prev.filter(item => item.id !== response.calculation.id)]);
      toast({ title: 'Overlay computation stored' });
    } catch (error) {
      logger.error('us_overlays.compute_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to compute overlay',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">US tax overlays</h1>
          <p className="text-muted-foreground">
            Evaluate GILTI, §163(j), CAMT, and stock buyback excise impacts for US filing requirements.
          </p>
        </div>
        <Badge variant={canExecute ? 'default' : 'outline'}>{canExecute ? 'Connected' : 'Demo mode'}</Badge>
      </div>

      <Card className="border border-primary/20">
        <CardHeader>
          <CardTitle>Overlay inputs</CardTitle>
          <CardDescription>Select an overlay and provide its base data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="font-medium text-muted-foreground">Tax entity ID</label>
              <Input value={taxEntityId} onChange={event => setTaxEntityId(event.target.value)} />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Period</label>
              <Input value={period} onChange={event => setPeriod(event.target.value)} placeholder="2025" />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Overlay type</label>
              <Select value={overlayType} onValueChange={value => setOverlayType(value as OverlayOption)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {overlayOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="font-medium text-muted-foreground">Notes</label>
              <Textarea value={notes} onChange={event => setNotes(event.target.value)} rows={2} />
            </div>
          </div>

          {overlayType === 'GILTI' && (
            <GiltiForm form={giltiForm} onChange={setGiltiForm} />
          )}
          {overlayType === '163J' && (
            <Section163JForm form={section163jForm} onChange={setSection163jForm} />
          )}
          {overlayType === 'CAMT' && (
            <CamtForm form={camtForm} onChange={setCamtForm} />
          )}
          {overlayType === 'EXCISE_4501' && (
            <ExciseForm form={exciseForm} onChange={setExciseForm} />
          )}

          <div className="flex justify-end">
            <Button onClick={handleCompute} disabled={loading}>
              {loading ? 'Computing…' : 'Compute overlay'}
            </Button>
          </div>

          {activeResult && (
            <OverlayResult overlayType={overlayType} result={activeResult} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Computation history</CardTitle>
          <CardDescription>Recent overlay calculations kept for audit trail.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {history.length === 0 && <p className="text-muted-foreground">No overlay computations yet.</p>}
          <div className="grid gap-3">
            {history.map(item => (
              <div key={item.id} className="rounded-lg border border-dashed p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{item.overlay_type}</span>
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Period</p>
                    <p className="font-medium">{item.period}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Adjustment amount</p>
                    <p className="font-medium">{numberFormatter.format(item.adjustment_amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Key metric</p>
                    <p className="font-medium">{formatPrimaryMetric(item.overlay_type, item.results)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Notes</p>
                    <p className="font-medium">{item.notes ?? '—'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getNumericInputs(overlayType: OverlayOption, values: Record<string, string>) {
  const toNumber = (value: string, fallback = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  };

  if (overlayType === 'GILTI') {
    const {
      testedIncome,
      testedLoss,
      qbaI,
      interestExpense,
      foreignTaxesPaid,
      ftcLimit,
      corporateRate,
      section250DeductionRate,
      ftcPercentage,
    } = values as typeof defaultGilti;

    return {
      testedIncome: toNumber(testedIncome, 0),
      testedLoss: toNumber(testedLoss, 0),
      qbaI: toNumber(qbaI, 0),
      interestExpense: toNumber(interestExpense, 0),
      foreignTaxesPaid: toNumber(foreignTaxesPaid, 0),
      ftcLimit: toNumber(ftcLimit, 0.8),
      corporateRate: toNumber(corporateRate, 0.21),
      section250DeductionRate: toNumber(section250DeductionRate, 0.5),
      ftcPercentage: toNumber(ftcPercentage, 0.8),
    };
  }

  if (overlayType === '163J') {
    const {
      businessInterestExpense,
      businessInterestIncome,
      adjustedTaxableIncome,
      floorPlanInterest,
      carryforwardInterest,
    } = values as typeof default163j;

    return {
      businessInterestExpense: toNumber(businessInterestExpense, 0),
      businessInterestIncome: toNumber(businessInterestIncome, 0),
      adjustedTaxableIncome: toNumber(adjustedTaxableIncome, 0),
      floorPlanInterest: toNumber(floorPlanInterest, 0),
      carryforwardInterest: toNumber(carryforwardInterest, 0),
    };
  }

  if (overlayType === 'CAMT') {
    const { adjustedFinancialStatementIncome, camtCreditCarryforward, regularTaxLiability, camtRate } =
      values as typeof defaultCamt;
    return {
      adjustedFinancialStatementIncome: toNumber(adjustedFinancialStatementIncome, 0),
      camtCreditCarryforward: toNumber(camtCreditCarryforward, 0),
      regularTaxLiability: toNumber(regularTaxLiability, 0),
      camtRate: toNumber(camtRate, 0.15),
    };
  }

  const { netRepurchase, permittedExceptions, rate } = values as typeof defaultExcise;
  return {
    netRepurchase: toNumber(netRepurchase, 0),
    permittedExceptions: toNumber(permittedExceptions, 0),
    rate: toNumber(rate, 0.01),
  };
}

function getAdjustmentAmount(overlayType: OverlayOption, result: Record<string, unknown>) {
  switch (overlayType) {
    case 'GILTI':
      return Number(result.netGiltiTax ?? 0);
    case '163J':
      return Number(result.disallowedInterest ?? 0);
    case 'CAMT':
      return Number(result.camtTopUp ?? 0);
    case 'EXCISE_4501':
    default:
      return Number(result.exciseTax ?? 0);
  }
}

function formatPrimaryMetric(overlayType: OverlayOption, results: Record<string, unknown>) {
  switch (overlayType) {
    case 'GILTI':
      return numberFormatter.format(Number(results.netGiltiTax ?? 0));
    case '163J':
      return numberFormatter.format(Number(results.disallowedInterest ?? 0));
    case 'CAMT':
      return numberFormatter.format(Number(results.camtTopUp ?? 0));
    case 'EXCISE_4501':
    default:
      return numberFormatter.format(Number(results.exciseTax ?? 0));
  }
}

type GiltiFormProps = {
  form: typeof defaultGilti;
  onChange: (values: typeof defaultGilti) => void;
};

function GiltiForm({ form, onChange }: GiltiFormProps) {
  const update = (key: keyof typeof defaultGilti) => (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, [key]: sanitizeNumeric(event.target.value) });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <label className="font-medium text-muted-foreground">Tested income</label>
        <Input value={form.testedIncome} onChange={update('testedIncome')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">Tested loss</label>
        <Input value={form.testedLoss} onChange={update('testedLoss')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">QBAI</label>
        <Input value={form.qbaI} onChange={update('qbaI')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">Interest expense</label>
        <Input value={form.interestExpense} onChange={update('interestExpense')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">Foreign taxes paid</label>
        <Input value={form.foreignTaxesPaid} onChange={update('foreignTaxesPaid')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">FTC limit</label>
        <Input value={form.ftcLimit} onChange={update('ftcLimit')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">Corporate rate</label>
        <Input value={form.corporateRate} onChange={update('corporateRate')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">Section 250 deduction rate</label>
        <Input value={form.section250DeductionRate} onChange={update('section250DeductionRate')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">FTC percentage</label>
        <Input value={form.ftcPercentage} onChange={update('ftcPercentage')} />
      </div>
    </div>
  );
}

type Section163JFormProps = {
  form: typeof default163j;
  onChange: (values: typeof default163j) => void;
};

function Section163JForm({ form, onChange }: Section163JFormProps) {
  const update = (key: keyof typeof default163j) => (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, [key]: sanitizeNumeric(event.target.value) });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <label className="font-medium text-muted-foreground">Business interest expense</label>
        <Input value={form.businessInterestExpense} onChange={update('businessInterestExpense')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">Business interest income</label>
        <Input value={form.businessInterestIncome} onChange={update('businessInterestIncome')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">Adjusted taxable income</label>
        <Input value={form.adjustedTaxableIncome} onChange={update('adjustedTaxableIncome')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">Floor plan interest</label>
        <Input value={form.floorPlanInterest} onChange={update('floorPlanInterest')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">Carryforward interest</label>
        <Input value={form.carryforwardInterest} onChange={update('carryforwardInterest')} />
      </div>
    </div>
  );
}

type CamtFormProps = {
  form: typeof defaultCamt;
  onChange: (values: typeof defaultCamt) => void;
};

function CamtForm({ form, onChange }: CamtFormProps) {
  const update = (key: keyof typeof defaultCamt) => (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, [key]: sanitizeNumeric(event.target.value) });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="font-medium text-muted-foreground">Adjusted financial statement income</label>
        <Input value={form.adjustedFinancialStatementIncome} onChange={update('adjustedFinancialStatementIncome')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">CAMT credit carryforward</label>
        <Input value={form.camtCreditCarryforward} onChange={update('camtCreditCarryforward')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">Regular tax liability</label>
        <Input value={form.regularTaxLiability} onChange={update('regularTaxLiability')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">CAMT rate</label>
        <Input value={form.camtRate} onChange={update('camtRate')} />
      </div>
    </div>
  );
}

type ExciseFormProps = {
  form: typeof defaultExcise;
  onChange: (values: typeof defaultExcise) => void;
};

function ExciseForm({ form, onChange }: ExciseFormProps) {
  const update = (key: keyof typeof defaultExcise) => (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, [key]: sanitizeNumeric(event.target.value) });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <label className="font-medium text-muted-foreground">Net repurchase</label>
        <Input value={form.netRepurchase} onChange={update('netRepurchase')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">Permitted exceptions</label>
        <Input value={form.permittedExceptions} onChange={update('permittedExceptions')} />
      </div>
      <div>
        <label className="font-medium text-muted-foreground">Rate</label>
        <Input value={form.rate} onChange={update('rate')} />
      </div>
    </div>
  );
}

type OverlayResultProps = {
  overlayType: OverlayOption;
  result: Record<string, unknown>;
};

function OverlayResult({ overlayType, result }: OverlayResultProps) {
  const toCurrency = (value: unknown) => numberFormatter.format(Number(value ?? 0));
  const toPercent = (value: unknown) => percentFormatter.format(Number(value ?? 0));

  switch (overlayType) {
    case 'GILTI':
      return (
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <ResultTile label="GILTI base" value={toCurrency(result.giltiBase)} />
          <ResultTile label="Section 250 deduction" value={toCurrency(result.section250Deduction)} />
          <ResultTile label="Net GILTI tax" value={toCurrency(result.netGiltiTax)} highlight />
        </div>
      );
    case '163J':
      return (
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <ResultTile label="Limitation" value={toCurrency(result.limitation)} />
          <ResultTile label="Allowed interest" value={toCurrency(result.allowedInterest)} />
          <ResultTile label="Disallowed interest" value={toCurrency(result.disallowedInterest)} highlight />
        </div>
      );
    case 'CAMT':
      return (
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <ResultTile label="CAMT base" value={toCurrency(result.camtBase)} />
          <ResultTile label="CAMT liability" value={toCurrency(result.camtLiability)} />
          <ResultTile label="Top-up" value={toCurrency(result.camtTopUp)} highlight />
        </div>
      );
    case 'EXCISE_4501':
    default:
      return (
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <ResultTile label="Excise base" value={toCurrency(result.exciseBase)} />
          <ResultTile label="Excise tax" value={toCurrency(result.exciseTax)} highlight />
        </div>
      );
  }
}

type ResultTileProps = {
  label: string;
  value: string;
  highlight?: boolean;
};

function ResultTile({ label, value, highlight }: ResultTileProps) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-primary text-primary' : ''}`}>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
