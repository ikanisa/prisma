import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useOrganizations } from '@/hooks/use-organizations';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { PostgrestError } from '@supabase/supabase-js';
import {
  computePillarTwo,
  listPillarTwoComputations,
  type PillarTwoComputation,
  type PillarTwoSummary,
} from '@prisma-glow/tax-mt-service';
import { calculatePillarTwo } from '@/lib/tax/calculators';
import { logger } from '@/lib/logger';

const numberFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 1,
});

type TaxEntityRelationship = {
  id: string;
  parent_tax_entity_id: string;
  child_tax_entity_id: string;
  ownership_percentage: number;
  effective_date: string | null;
  notes: string | null;
  created_at: string;
};

type TaxEntityRelationshipRow = Database['public']['Tables']['tax_entity_relationships']['Row'];

function mapRelationship(row: TaxEntityRelationshipRow): TaxEntityRelationship {
  return {
    id: row.id,
    parent_tax_entity_id: row.parent_tax_entity_id,
    child_tax_entity_id: row.child_tax_entity_id,
    ownership_percentage: row.ownership_percentage ?? 0,
    effective_date: row.effective_date,
    notes: row.notes,
    created_at: row.created_at,
  };
}

function isMissingRelationshipTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as Partial<PostgrestError> & { message?: string };
  if (typeof candidate.code === 'string' && candidate.code.trim().toUpperCase() === '42P01') {
    return true;
  }

  const message = candidate.message ?? (error instanceof Error ? error.message : undefined);
  if (!message) {
    return false;
  }

  const normalised = message.toLowerCase();
  return normalised.includes('tax_entity_relationships') &&
    (normalised.includes('does not exist') || normalised.includes('missing') || normalised.includes('undefined table'));
}

type JurisdictionRow = {
  id: string;
  taxEntityId: string;
  jurisdiction: string;
  globeIncome: string;
  coveredTaxes: string;
  substanceCarveOut: string;
  qdmtPaid: string;
  ownershipPercentage: string;
  safeHarbourThreshold: string;
};

const defaultJurisdictions = (): JurisdictionRow[] => [
  {
    id: crypto.randomUUID(),
    taxEntityId: 'org-parent',
    jurisdiction: 'Malta',
    globeIncome: '500000',
    coveredTaxes: '90000',
    substanceCarveOut: '50000',
    qdmtPaid: '0',
    ownershipPercentage: '1',
    safeHarbourThreshold: '0',
  },
  {
    id: crypto.randomUUID(),
    taxEntityId: 'org-subsidiary-1',
    jurisdiction: 'Germany',
    globeIncome: '300000',
    coveredTaxes: '20000',
    substanceCarveOut: '60000',
    qdmtPaid: '10000',
    ownershipPercentage: '1',
    safeHarbourThreshold: '0',
  },
];

export default function PillarTwoPage() {
  const { toast } = useToast();
  const { currentOrg } = useOrganizations();

  const [rootTaxEntityId, setRootTaxEntityId] = useState('');
  const [period, setPeriod] = useState('2025');
  const [minimumRate, setMinimumRate] = useState('0.15');
  const [notes, setNotes] = useState('');

  const [jurisdictions, setJurisdictions] = useState<JurisdictionRow[]>(defaultJurisdictions);
  const [summary, setSummary] = useState<PillarTwoSummary | null>(null);
  const [history, setHistory] = useState<PillarTwoComputation[]>([]);

  const [relationships, setRelationships] = useState<TaxEntityRelationship[]>([]);
  const [relationshipsLoading, setRelationshipsLoading] = useState(false);
  const [relationshipForm, setRelationshipForm] = useState({
    parent: '',
    child: '',
    ownership: '1',
    effectiveDate: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);

  const canExecute = isSupabaseConfigured;

  useEffect(() => {
    if (currentOrg?.id) {
      setRootTaxEntityId((prev) => (prev ? prev : currentOrg.id));
    }
  }, [currentOrg?.id]);

  useEffect(() => {
    if (!currentOrg?.slug) {
      return;
    }

    if (!canExecute) {
      setHistory([]);
      setRelationships([
        {
          id: 'demo-relationship-1',
          parent_tax_entity_id: 'org-parent',
          child_tax_entity_id: 'org-subsidiary-1',
          ownership_percentage: 1,
          effective_date: '2025-01-01',
          notes: 'Demo relationship for offline mode.',
          created_at: new Date().toISOString(),
        },
      ]);
      return;
    }

    const controller = new AbortController();
    setRelationshipsLoading(true);

    (async () => {
      try {
        let historyRows: PillarTwoComputation[] = [];
        try {
          const historyResponse = await listPillarTwoComputations({ orgSlug: currentOrg.slug });
          historyRows = Array.isArray(historyResponse.data) ? historyResponse.data : [];
        } catch (error) {
        logger.error('pillar_two.history_load_failed', error);
        }

        const relationshipsQuery = supabase.from('tax_entity_relationships') as any;
        const response = await relationshipsQuery
          .select('*')
          .eq('org_id', currentOrg.id)
          .order('created_at', { ascending: false });

        const { data: relationshipRows, error } = response as {
          data: TaxEntityRelationshipRow[] | null;
          error: PostgrestError | null;
        };

        if (error) {
          throw new Error(error.message);
        }

        if (!controller.signal.aborted) {
          setHistory(historyRows);
          const mapped = (relationshipRows ?? []).map(mapRelationship);
          setRelationships(mapped);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
        logger.error('pillar_two.load_failed', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setRelationshipsLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [canExecute, currentOrg?.id, currentOrg?.slug]);

  const handleJurisdictionChange = (id: string, field: keyof JurisdictionRow, value: string) => {
    setJurisdictions((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addJurisdictionRow = () => {
    setJurisdictions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        taxEntityId: '',
        jurisdiction: '',
        globeIncome: '',
        coveredTaxes: '',
        substanceCarveOut: '',
        qdmtPaid: '',
        ownershipPercentage: '1',
        safeHarbourThreshold: '0',
      },
    ]);
  };

  const removeJurisdictionRow = (id: string) => {
    setJurisdictions((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
  };

  const formatValue = (amount: number) => numberFormatter.format(amount);

  const handleAddRelationship = async () => {
    if (!relationshipForm.parent.trim() || !relationshipForm.child.trim()) {
      toast({
        variant: 'destructive',
        title: 'Relationship requires identifiers',
        description: 'Provide both parent and child tax entity identifiers.',
      });
      return;
    }

    const ownership = Number(relationshipForm.ownership);
    if (!Number.isFinite(ownership) || ownership <= 0) {
      toast({
        variant: 'destructive',
        title: 'Ownership percentage invalid',
        description: 'Ownership must be a positive decimal number (e.g. 1 or 0.75).',
      });
      return;
    }

    const newRelationship: TaxEntityRelationship = {
      id: crypto.randomUUID(),
      parent_tax_entity_id: relationshipForm.parent.trim(),
      child_tax_entity_id: relationshipForm.child.trim(),
      ownership_percentage: Math.min(ownership, 1),
      effective_date: relationshipForm.effectiveDate ? relationshipForm.effectiveDate : null,
      notes: relationshipForm.notes ? relationshipForm.notes.trim() : null,
      created_at: new Date().toISOString(),
    };

    if (!canExecute || !currentOrg?.id) {
      setRelationships((prev) => [newRelationship, ...prev]);
      toast({ title: 'Relationship added in demo mode' });
      setRelationshipForm({ parent: '', child: '', ownership: '1', effectiveDate: '', notes: '' });
      return;
    }

    try {
      setRelationshipsLoading(true);
      const insertQuery = supabase.from('tax_entity_relationships') as any;
      const response = await insertQuery
        .insert({
          org_id: currentOrg.id,
          parent_tax_entity_id: newRelationship.parent_tax_entity_id,
          child_tax_entity_id: newRelationship.child_tax_entity_id,
          ownership_percentage: newRelationship.ownership_percentage,
          effective_date: newRelationship.effective_date,
          notes: newRelationship.notes,
        })
        .select('*')
        .maybeSingle();

      const { data, error } = (response ?? {}) as {
        data?: TaxEntityRelationshipRow | null;
        error?: PostgrestError | null;
      };

      if (error || !data) {
        throw error ?? new Error('Failed to add relationship');
      }

      setRelationships((prev) => [mapRelationship(data), ...prev]);
      toast({ title: 'Relationship added' });
      setRelationshipForm({ parent: '', child: '', ownership: '1', effectiveDate: '', notes: '' });
    } catch (error) {
      if (isMissingRelationshipTableError(error)) {
        logger.warn('pillar_two.relationship_table_missing_cache');
        setRelationships((prev) => [newRelationship, ...prev]);
        toast({
          title: 'Relationship cached locally',
          description: 'Supabase table is not provisioned yet. Data stored in session until sync is available.',
        });
        setRelationshipForm({ parent: '', child: '', ownership: '1', effectiveDate: '', notes: '' });
      } else {
        logger.error('pillar_two.relationship_add_failed', error);
        toast({
          variant: 'destructive',
          title: 'Unable to add relationship',
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } finally {
      setRelationshipsLoading(false);
    }
  };

  const handleDeleteRelationship = async (id: string) => {
    if (!canExecute || !currentOrg?.id) {
      setRelationships((prev) => prev.filter((item) => item.id !== id));
      return;
    }

    try {
      setRelationshipsLoading(true);
      const deleteQuery = supabase.from('tax_entity_relationships') as any;
      const { error } = await deleteQuery
        .delete()
        .eq('org_id', currentOrg.id)
        .eq('id', id);
      if (error) throw error;
      setRelationships((prev) => prev.filter((item) => item.id !== id));
      toast({ title: 'Relationship removed' });
    } catch (error) {
      if (isMissingRelationshipTableError(error)) {
        logger.warn('pillar_two.relationship_table_missing_remove');
        setRelationships((prev) => prev.filter((item) => item.id !== id));
        toast({
          title: 'Relationship removed locally',
          description: 'Supabase table is not provisioned yet. Removal applied to local cache only.',
        });
      } else {
        logger.error('pillar_two.relationship_delete_failed', error);
        toast({
          variant: 'destructive',
          title: 'Unable to remove relationship',
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } finally {
      setRelationshipsLoading(false);
    }
  };

  const jurisdictionsPayload = useMemo(
    () =>
      jurisdictions
        .filter((row) => row.taxEntityId.trim() && row.jurisdiction.trim())
        .map((row) => ({
          taxEntityId: row.taxEntityId.trim(),
          jurisdiction: row.jurisdiction.trim(),
          globeIncome: Number(row.globeIncome || 0),
          coveredTaxes: Number(row.coveredTaxes || 0),
          substanceCarveOut: Number(row.substanceCarveOut || 0),
          qdmtPaid: Number(row.qdmtPaid || 0),
          ownershipPercentage: Number(row.ownershipPercentage || 1),
          safeHarbourThreshold: Number(row.safeHarbourThreshold || 0),
        })),
    [jurisdictions],
  );

  const handleCompute = async () => {
    if (!rootTaxEntityId.trim()) {
      toast({
        variant: 'destructive',
        title: 'Root tax entity required',
        description: 'Specify the parent tax entity that will own the Pillar Two computation.',
      });
      return;
    }

    if (jurisdictionsPayload.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Add jurisdictions',
        description: 'Provide at least one jurisdiction row with data.',
      });
      return;
    }

    setLoading(true);
    try {
      if (!canExecute || !currentOrg?.slug) {
        const computed = calculatePillarTwo({
          rootTaxEntityId: rootTaxEntityId.trim(),
          period,
          minimumRate: Number(minimumRate || 0.15),
          jurisdictions: jurisdictionsPayload,
        });

        setSummary(computed);
        const demoComputation: PillarTwoComputation = {
          id: crypto.randomUUID(),
          period,
          root_tax_entity_id: rootTaxEntityId.trim(),
          gir_reference: `GIR-DEMO-${Date.now()}`,
          jurisdiction_results: computed.jurisdictions,
          input_payload: {},
          gir_payload: computed.gir as unknown as Record<string, unknown>,
          total_top_up_tax: computed.totalTopUpTax,
          qdmt_top_up_tax: computed.qdmtTopUpTax,
          iir_top_up_tax: computed.iirTopUpTax,
          notes: notes || null,
          metadata: {},
          created_at: new Date().toISOString(),
        };
        setHistory((prev) => [demoComputation, ...prev]);
        toast({ title: 'Computed Pillar Two outcome (demo mode)' });
        return;
      }

      const response = await computePillarTwo({
        orgSlug: currentOrg.slug,
        rootTaxEntityId: rootTaxEntityId.trim(),
        period,
        jurisdictions: jurisdictionsPayload,
        minimumRate: Number(minimumRate || 0.15),
        notes: notes || undefined,
      });

      setSummary(response.summary);
      setHistory((prev) => [response.computation, ...prev]);
      toast({ title: 'Pillar Two computation stored', description: `Reference ${response.computation.gir_reference ?? ''}` });
    } catch (error) {
      logger.error('pillar_two.compute_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to compute Pillar Two',
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
          <h1 className="text-3xl font-bold gradient-text">Pillar Two engine</h1>
          <p className="text-muted-foreground">
            Model Qualified Domestic Minimum Top-up Tax (QDMTT) and Income Inclusion Rule (IIR) outcomes,
            keep relationships aligned with your tax entity tree, and generate GIR-ready summaries.
          </p>
        </div>
        <Badge variant={canExecute ? 'default' : 'outline'}>{canExecute ? 'Connected' : 'Demo mode'}</Badge>
      </div>

      <Card className="border border-primary/10">
        <CardHeader>
          <CardTitle>Computation inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="font-medium text-muted-foreground">Root tax entity ID</label>
              <Input value={rootTaxEntityId} onChange={(event) => setRootTaxEntityId(event.target.value)} />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Period</label>
              <Input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="2025" />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Minimum rate</label>
              <Input
                value={minimumRate}
                onChange={(event) => setMinimumRate(event.target.value)}
                placeholder="0.15"
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Notes</label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional memo" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-muted/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Entity relationships</CardTitle>
          <Button variant="ghost" onClick={() => setRelationshipForm({ parent: '', child: '', ownership: '1', effectiveDate: '', notes: '' })}>
            Reset form
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="font-medium text-muted-foreground">Parent tax entity</label>
              <Input
                value={relationshipForm.parent}
                onChange={(event) => setRelationshipForm((prev) => ({ ...prev, parent: event.target.value }))}
                placeholder="Parent entity ID"
              />
            </div>
            <div className="md:col-span-2">
              <label className="font-medium text-muted-foreground">Child tax entity</label>
              <Input
                value={relationshipForm.child}
                onChange={(event) => setRelationshipForm((prev) => ({ ...prev, child: event.target.value }))}
                placeholder="Subsidiary entity ID"
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Ownership</label>
              <Input
                value={relationshipForm.ownership}
                onChange={(event) => setRelationshipForm((prev) => ({ ...prev, ownership: event.target.value }))}
                placeholder="1 or 0.75"
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Effective date</label>
              <Input
                type="date"
                value={relationshipForm.effectiveDate}
                onChange={(event) => setRelationshipForm((prev) => ({ ...prev, effectiveDate: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="font-medium text-muted-foreground">Notes</label>
              <Input
                value={relationshipForm.notes}
                onChange={(event) => setRelationshipForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={handleAddRelationship} disabled={relationshipsLoading}>
                Add relationship
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{relationships.length} relationships tracked</span>
              {relationshipsLoading && <span>Refreshing…</span>}
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full divide-y divide-border text-xs">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Parent</th>
                    <th className="px-3 py-2 font-medium">Child</th>
                    <th className="px-3 py-2 font-medium">Ownership</th>
                    <th className="px-3 py-2 font-medium">Effective</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {relationships.map((relationship) => (
                    <tr key={relationship.id}>
                      <td className="px-3 py-2 font-mono text-xs">{relationship.parent_tax_entity_id}</td>
                      <td className="px-3 py-2 font-mono text-xs">{relationship.child_tax_entity_id}</td>
                      <td className="px-3 py-2">{percentFormatter.format(relationship.ownership_percentage)}</td>
                      <td className="px-3 py-2">{relationship.effective_date ?? '—'}</td>
                      <td className="px-3 py-2">{relationship.notes ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRelationship(relationship.id)}
                          disabled={relationshipsLoading}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {relationships.length === 0 && (
                    <tr>
                      <td className="px-3 py-4 text-center text-muted-foreground" colSpan={6}>
                        No relationships captured yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-muted/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Jurisdiction inputs</CardTitle>
          <Button variant="ghost" onClick={addJurisdictionRow} size="sm">
            Add jurisdiction
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full divide-y divide-border text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Tax entity</th>
                  <th className="px-3 py-2 text-left font-medium">Jurisdiction</th>
                  <th className="px-3 py-2 text-left font-medium">GloBE income</th>
                  <th className="px-3 py-2 text-left font-medium">Covered taxes</th>
                  <th className="px-3 py-2 text-left font-medium">Substance carve-out</th>
                  <th className="px-3 py-2 text-left font-medium">QDMTT paid</th>
                  <th className="px-3 py-2 text-left font-medium">Ownership</th>
                  <th className="px-3 py-2 text-left font-medium">Safe harbour threshold</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jurisdictions.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">
                      <Input
                        value={row.taxEntityId}
                        onChange={(event) => handleJurisdictionChange(row.id, 'taxEntityId', event.target.value)}
                        placeholder="Entity ID"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.jurisdiction}
                        onChange={(event) => handleJurisdictionChange(row.id, 'jurisdiction', event.target.value)}
                        placeholder="Jurisdiction"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.globeIncome}
                        onChange={(event) => handleJurisdictionChange(row.id, 'globeIncome', event.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.coveredTaxes}
                        onChange={(event) => handleJurisdictionChange(row.id, 'coveredTaxes', event.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.substanceCarveOut}
                        onChange={(event) => handleJurisdictionChange(row.id, 'substanceCarveOut', event.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.qdmtPaid}
                        onChange={(event) => handleJurisdictionChange(row.id, 'qdmtPaid', event.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.ownershipPercentage}
                        onChange={(event) => handleJurisdictionChange(row.id, 'ownershipPercentage', event.target.value)}
                        placeholder="1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.safeHarbourThreshold}
                        onChange={(event) => handleJurisdictionChange(row.id, 'safeHarbourThreshold', event.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeJurisdictionRow(row.id)}
                        disabled={jurisdictions.length === 1}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Ownership values should be decimal percentages (1 = 100%). Safe harbour thresholds are optional monetary limits.
        </div>
        <Button onClick={handleCompute} disabled={loading}>
          {loading ? 'Computing…' : 'Compute Pillar Two'}
        </Button>
      </div>

      {summary && (
        <Card className="border border-primary/10">
          <CardHeader>
            <CardTitle>Computation summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-xs">Total top-up tax</p>
                <p className="text-lg font-semibold">{formatValue(summary.totalTopUpTax)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">QDMTT captured</p>
                <p className="text-lg font-semibold">{formatValue(summary.qdmtTopUpTax)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Residual IIR</p>
                <p className="text-lg font-semibold">{formatValue(summary.iirTopUpTax)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Minimum rate applied</p>
                <p className="text-lg font-semibold">{percentFormatter.format(summary.minimumRate)}</p>
              </div>
            </div>

            <Separator />

            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full divide-y divide-border text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Jurisdiction</th>
                    <th className="px-3 py-2 text-left font-medium">GloBE income</th>
                    <th className="px-3 py-2 text-left font-medium">Effective rate</th>
                    <th className="px-3 py-2 text-left font-medium">Top-up tax</th>
                    <th className="px-3 py-2 text-left font-medium">QDMTT credit</th>
                    <th className="px-3 py-2 text-left font-medium">Residual IIR</th>
                    <th className="px-3 py-2 text-left font-medium">Safe harbour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.jurisdictions.map((entry) => (
                    <tr key={entry.taxEntityId}>
                      <td className="px-3 py-2 font-medium">{entry.jurisdiction}</td>
                      <td className="px-3 py-2">{formatValue(entry.globeIncome)}</td>
                      <td className="px-3 py-2">{percentFormatter.format(entry.effectiveTaxRate)}</td>
                      <td className="px-3 py-2">{formatValue(entry.topUpTax)}</td>
                      <td className="px-3 py-2">{formatValue(entry.qdmtCredit)}</td>
                      <td className="px-3 py-2">{formatValue(entry.residualTopUp)}</td>
                      <td className="px-3 py-2">
                        {entry.appliedSafeHarbour ? <Badge variant="secondary">Applied</Badge> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-muted/40">
        <CardHeader>
          <CardTitle>Computation history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {history.length === 0 && <p className="text-muted-foreground">No Pillar Two computations yet.</p>}
          <div className="grid gap-3">
            {history.map((item) => (
              <div key={item.id} className="rounded-lg border border-dashed border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-muted-foreground">{item.gir_reference ?? item.id}</span>
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Root entity</p>
                    <p className="font-medium">{item.root_tax_entity_id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Period</p>
                    <p className="font-medium">{item.period}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Total top-up</p>
                    <p className="font-medium">{formatValue(item.total_top_up_tax)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Residual IIR</p>
                    <p className="font-medium">{formatValue(item.iir_top_up_tax)}</p>
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
