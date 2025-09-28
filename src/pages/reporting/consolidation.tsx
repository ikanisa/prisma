import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Loader2, Table } from 'lucide-react';

import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { fetchConsolidatedTrialBalance } from '@/lib/consolidation-service';

export default function ConsolidationPage() {
  const { orgSlug, engagementId } = useParams<{ orgSlug: string; engagementId: string }>();
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();

  const [subsidiaryIds, setSubsidiaryIds] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof fetchConsolidatedTrialBalance>> | null>(null);

  const handleRun = async () => {
    if (!currentOrg || !engagementId) {
      toast({ title: 'Missing engagement context', description: 'Select an engagement first.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const subs = subsidiaryIds
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      const response = await fetchConsolidatedTrialBalance({
        orgId: currentOrg.id,
        parentEntityId: engagementId,
        subsidiaries: subs,
        currency,
      });

      setResult(response);
      toast({ title: 'Consolidation complete', description: 'Trial balance consolidated across group entities.' });
    } catch (error: any) {
      toast({ title: 'Consolidation failed', description: error.message ?? 'Unexpected error.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Group consolidation</h1>
          <p className="text-muted-foreground">
            Aggregate entity ledgers, calculate elimination entries, and validate IFRS 10/11/12 plus IAS 21 exposure.
          </p>
        </div>
        <Badge variant="outline">Basis currency: {currency}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Parent engagement entity ID</Label>
              <Input value={engagementId ?? ''} disabled className="bg-muted text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Defaults to the current engagement ID.</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Subsidiary entity IDs</Label>
              <Textarea
                rows={2}
                placeholder="entity-id-1, entity-id-2"
                value={subsidiaryIds}
                onChange={(event) => setSubsidiaryIds(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Comma separated. Include all controlled entities participating in consolidation.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Reporting currency</Label>
              <Input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
            </div>
          </div>
          <Button onClick={handleRun} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Table className="w-4 h-4 mr-2" />}
            Consolidate trial balance
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,380px)_1fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>Assets: {result.summary.assets.toLocaleString(undefined, { style: 'currency', currency })}</div>
                <div>Liabilities: {result.summary.liabilities.toLocaleString(undefined, { style: 'currency', currency })}</div>
                <div>Equity: {result.summary.equity.toLocaleString(undefined, { style: 'currency', currency })}</div>
                <Separator className="my-2" />
                <div className="flex items-center gap-2">
                  <span>Balance check:</span>
                  <Badge variant={result.summary.check === 0 ? 'outline' : 'destructive'}>
                    {result.summary.check.toFixed(2)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proposed eliminations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {result.eliminations.length === 0 ? (
                  <p className="text-muted-foreground">No intercompany balances detected.</p>
                ) : (
                  <ul className="space-y-2">
                    {result.eliminations.map((item, index) => (
                      <li key={index} className="rounded-md border border-border p-2">
                        <div className="font-medium">{item.description}</div>
                        <div className="text-xs text-muted-foreground">
                          Amount: {item.amount.toFixed(2)} {currency}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Elimination guidance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <AlertCircle className="inline mr-2 h-4 w-4" />
                  Review automatic suggestions for intercompany balances. Post manual journals via the close engine where
                  necessary and rerun consolidation.
                </p>
                <p>
                  Apply FX adjustments per IAS 21 (closing rate method) for foreign subsidiaries. Use the currency field
                  to define the reporting presentation currency.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Consolidated trial balance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[480px]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-2 text-left">Code</th>
                      <th className="px-4 py-2 text-left">Account</th>
                      <th className="px-4 py-2 text-right">Amount ({currency})</th>
                      <th className="px-4 py-2 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.consolidatedTrialBalance.map((line) => (
                      <tr key={line.accountId} className="border-b border-border/60">
                        <td className="px-4 py-2 font-mono text-xs">{line.code}</td>
                        <td className="px-4 py-2">{line.name}</td>
                        <td className="px-4 py-2 text-right">{line.amount.toFixed(2)}</td>
                        <td className="px-4 py-2 text-muted-foreground">{line.type ?? 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
