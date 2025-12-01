import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { useOrganizations } from '@/hooks/use-organizations';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { computeVatReturn, listVatFilings, type VatFiling } from '@prisma-glow/tax-mt-service';
import { logger } from '@/lib/logger';

type VatFormState = {
  outputsStandard: string;
  outputsReduced: string;
  inputsStandard: string;
  inputsCapitalGoods: string;
  inputVatRecoveryRate: string;
  intraCommunityAcquisitions: string;
  distanceSales: string;
  manualAdjustments: string;
  notes: string;
};

const defaultForm: VatFormState = {
  outputsStandard: '',
  outputsReduced: '',
  inputsStandard: '',
  inputsCapitalGoods: '',
  inputVatRecoveryRate: '1',
  intraCommunityAcquisitions: '',
  distanceSales: '',
  manualAdjustments: '0',
  notes: '',
};

export default function VatOssPage() {
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();

  const [taxEntityId, setTaxEntityId] = useState('');
  const [period, setPeriod] = useState('2025-Q1');
  const [form, setForm] = useState<VatFormState>(defaultForm);
  const [result, setResult] = useState<VatFiling | null>(null);
  const [history, setHistory] = useState<VatFiling[]>([]);
  const [loading, setLoading] = useState(false);

  const canExecute = isSupabaseConfigured;

  useEffect(() => {
    if (!taxEntityId && currentOrg) {
      setTaxEntityId(currentOrg.id);
    }
  }, [currentOrg, taxEntityId]);

  useEffect(() => {
    if (!canExecute || !currentOrg?.slug || !taxEntityId) {
      setHistory([]);
      return;
    }

    const controller = new AbortController();

    const loadHistory = async () => {
      try {
        const response = await listVatFilings({ orgSlug: currentOrg.slug, taxEntityId, period });
        if (!controller.signal.aborted) {
          setHistory(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        logger.error('vat_oss.history_load_failed', error);
      }
    };

    loadHistory();

    return () => controller.abort();
  }, [canExecute, currentOrg?.slug, taxEntityId, period]);

  const handleInputChange = (field: keyof VatFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCompute = async () => {
    if (!canExecute) {
      toast({ variant: 'destructive', title: 'Supabase not configured', description: 'Connect to backend first.' });
      return;
    }
    if (!currentOrg?.slug || !taxEntityId) {
      toast({ variant: 'destructive', title: 'Select a tax entity', description: 'Tax entity is required.' });
      return;
    }

    try {
      setLoading(true);
      const response = await computeVatReturn({
        orgSlug: currentOrg.slug,
        taxEntityId,
        period,
        outputsStandard: Number(form.outputsStandard || 0),
        outputsReduced: form.outputsReduced ? Number(form.outputsReduced) : undefined,
        inputsStandard: form.inputsStandard ? Number(form.inputsStandard) : undefined,
        inputsCapitalGoods: form.inputsCapitalGoods ? Number(form.inputsCapitalGoods) : undefined,
        inputVatRecoveryRate: form.inputVatRecoveryRate ? Number(form.inputVatRecoveryRate) : undefined,
        intraCommunityAcquisitions: form.intraCommunityAcquisitions
          ? Number(form.intraCommunityAcquisitions)
          : undefined,
        distanceSales: form.distanceSales ? Number(form.distanceSales) : undefined,
        manualAdjustments: form.manualAdjustments ? Number(form.manualAdjustments) : undefined,
        notes: form.notes || undefined,
      });

      setResult(response.computation);
      setHistory((prev) => [response.computation, ...prev]);
      toast({ title: 'VAT return computed', description: 'Return stored with activity log.' });
    } catch (error) {
      logger.error('vat_oss.compute_failed', error);
      toast({
        variant: 'destructive',
        title: 'Failed to compute VAT return',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const netPayable = useMemo(() => result?.net_payable_after_adjustments ?? 0, [result]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">VAT & OSS filings</h1>
          <p className="text-muted-foreground">Compute Malta VAT / OSS returns with automated net payable tracking.</p>
        </div>
        <Badge variant={canExecute ? 'default' : 'outline'}>{canExecute ? 'Connected' : 'Demo mode'}</Badge>
      </div>

      <Card className="border border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle>Return inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Tax entity ID</label>
              <Input value={taxEntityId} onChange={(event) => setTaxEntityId(event.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Period</label>
              <Input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="2025-Q1" />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Outputs (standard rate)</label>
              <Input
                type="number"
                value={form.outputsStandard}
                onChange={(event) => handleInputChange('outputsStandard', event.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Outputs (reduced rate)</label>
              <Input
                type="number"
                value={form.outputsReduced}
                onChange={(event) => handleInputChange('outputsReduced', event.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Inputs (standard rate)</label>
              <Input
                type="number"
                value={form.inputsStandard}
                onChange={(event) => handleInputChange('inputsStandard', event.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Inputs (capital goods)</label>
              <Input
                type="number"
                value={form.inputsCapitalGoods}
                onChange={(event) => handleInputChange('inputsCapitalGoods', event.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Recovery rate</label>
              <Input
                type="number"
                step="0.01"
                value={form.inputVatRecoveryRate}
                onChange={(event) => handleInputChange('inputVatRecoveryRate', event.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Manual adjustments</label>
              <Input
                type="number"
                value={form.manualAdjustments}
                onChange={(event) => handleInputChange('manualAdjustments', event.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Intra-community acquisitions</label>
              <Input
                type="number"
                value={form.intraCommunityAcquisitions}
                onChange={(event) => handleInputChange('intraCommunityAcquisitions', event.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Distance sales (OSS)</label>
              <Input
                type="number"
                value={form.distanceSales}
                onChange={(event) => handleInputChange('distanceSales', event.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <Textarea
            rows={2}
            placeholder="Notes captured with computation"
            value={form.notes}
            onChange={(event) => handleInputChange('notes', event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="gradient" onClick={handleCompute} disabled={loading}>
              Compute VAT return
            </Button>
            <Button variant="ghost" onClick={() => setForm(defaultForm)} disabled={loading}>
              Reset inputs
            </Button>
          </div>
          {result && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm space-y-1">
              <p>Taxable outputs: {result.taxable_outputs.toFixed(2)}</p>
              <p>Output VAT: {result.output_vat.toFixed(2)} • Input VAT: {result.input_vat.toFixed(2)}</p>
              <p>Net payable after adjustments: {netPayable.toFixed(2)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent filings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto text-sm">
              <table className="min-w-full border text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2">Net VAT payable</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">{new Date(item.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2">{item.period}</td>
                      <td className="px-3 py-2">{item.net_payable_after_adjustments.toFixed(2)}</td>
                      <td className="px-3 py-2">{item.filing_type}</td>
                      <td className="px-3 py-2">{item.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
