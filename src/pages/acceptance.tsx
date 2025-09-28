import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';

import { useOrganizations } from '@/hooks/use-organizations';
import { useAcceptance } from '@/hooks/use-acceptance';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const defaultScreening = { sanctions: false, pep: false, adverseMedia: [] };

const approvalStatusStyles: Record<'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED', string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  CANCELLED: 'bg-slate-100 text-slate-700',
};

export default function AcceptancePage() {
  const { engagementId, orgSlug } = useParams<{ engagementId: string; orgSlug: string }>();
  const { currentOrg, hasRole } = useOrganizations();
  const { toast } = useToast();
  const engagementQuery = useQuery({
    queryKey: ['engagement', engagementId],
    enabled: Boolean(engagementId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('engagements')
        .select('id, client_id, title')
        .eq('id', engagementId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const clientId = engagementQuery.data?.client_id ?? null;
  const engagementTitle = engagementQuery.data?.title ?? engagementId;

  const acceptance = useAcceptance({ engagementId: engagementId ?? null, clientId });

  const [screening, setScreening] = useState<Record<string, unknown>>(defaultScreening);
  const [riskRating, setRiskRating] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'>('UNKNOWN');
  const [notes, setNotes] = useState('');
  const [threats, setThreats] = useState<string>('');
  const [safeguards, setSafeguards] = useState<string>('');
  const [conclusion, setConclusion] = useState<'OK' | 'SAFEGUARDS_REQUIRED' | 'PROHIBITED'>('OK');
  const [decision, setDecision] = useState<'ACCEPT' | 'DECLINE'>('ACCEPT');
  const [eqrRequired, setEqrRequired] = useState(false);
  const [rationale, setRationale] = useState('');

  useEffect(() => {
    if (!acceptance.data) return;

    const background = acceptance.backgroundData;
    const screeningsData =
      (background?.screenings as Record<string, unknown> | undefined) ?? defaultScreening;
    setScreening({ ...screeningsData });
    setRiskRating(background?.riskRating ?? 'UNKNOWN');
    setNotes(background?.notes ?? '');

    const independence = acceptance.independenceData;
    const threatsList = Array.isArray(independence?.threats)
      ? (independence?.threats as unknown[]).map((item) => String(item))
      : [];
    const safeguardsList = Array.isArray(independence?.safeguards)
      ? (independence?.safeguards as unknown[]).map((item) => String(item))
      : [];
    setThreats(threatsList.join('\n'));
    setSafeguards(safeguardsList.join('\n'));
    setConclusion(independence?.conclusion ?? 'OK');

    setDecision(acceptance.decision ?? 'ACCEPT');
    setEqrRequired(Boolean(acceptance.eqrRequired));
    setRationale(acceptance.rationale ?? '');
  }, [
    acceptance.data,
    acceptance.backgroundData,
    acceptance.independenceData,
    acceptance.decision,
    acceptance.eqrRequired,
    acceptance.rationale,
  ]);

  const approvals = acceptance.approvals;
  const canResolveApproval = hasRole('MANAGER');
  const approvalDecisionPending = acceptance.approveDecision.isPending;

  const statusBadge = useMemo(() => {
    switch (acceptance.status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-500 text-white">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-rose-500 text-white">Rejected</Badge>;
      case 'DRAFT':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">Not started</Badge>;
    }
  }, [acceptance.status]);

  const handleRunScreening = async () => {
    try {
      await acceptance.background.mutateAsync({ screenings: screening, riskRating, notes });
      toast({ title: 'Background check saved' });
    } catch (error: any) {
      toast({ title: 'Background check failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleSaveIndependence = async () => {
    try {
      await acceptance.independence.mutateAsync({
        threats: threats ? threats.split('\n').map((line) => line.trim()).filter(Boolean) : [],
        safeguards: safeguards ? safeguards.split('\n').map((line) => line.trim()).filter(Boolean) : [],
        conclusion,
      });
      toast({ title: 'Independence assessment saved' });
    } catch (error: any) {
      toast({ title: 'Independence assessment failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleSubmitDecision = async () => {
    try {
      await acceptance.submitDecision.mutateAsync({ decision, eqrRequired, rationale });
      toast({ title: 'Decision submitted for approval' });
    } catch (error: any) {
      toast({ title: 'Submit failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleApprovalDecision = async (approvalId: string, approvalDecision: 'APPROVED' | 'REJECTED') => {
    try {
      await acceptance.approveDecision.mutateAsync({ approvalId, decision: approvalDecision });
      toast({
        title: approvalDecision === 'APPROVED' ? 'Acceptance approved' : 'Acceptance rejected',
      });
    } catch (error: any) {
      toast({ title: 'Approval action failed', description: error.message, variant: 'destructive' });
    }
  };

  const isLoading =
    acceptance.isLoading ||
    acceptance.background.isPending ||
    acceptance.independence.isPending ||
    acceptance.submitDecision.isPending ||
    acceptance.approveDecision.isPending ||
    engagementQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Engagement Acceptance & Independence</h1>
          <p className="text-muted-foreground">Document screening, independence assessment, and Partner approval before audit work begins.</p>
          <p className="text-xs text-muted-foreground mt-1">Org: {orgSlug} • Engagement: {engagementTitle ?? engagementId}</p>
        </div>
        <div className="text-right space-y-2">
          {statusBadge}
          {acceptance.eqrRequired && <Badge className="bg-amber-500/10 text-amber-900 border-amber-300">EQR required</Badge>}
          <div className="text-xs text-muted-foreground">
            Decision: {acceptance.decision ?? 'N/A'}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldQuestion className="w-4 h-4" /> Background screening
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium">Risk rating</label>
              <select
                className="w-full border rounded-md px-2 py-2 text-sm"
                value={riskRating}
                onChange={(e) => setRiskRating(e.target.value as typeof riskRating)}
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Screening notes</label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sanctions hits, adverse media summary..." />
            </div>
            <Button onClick={handleRunScreening} disabled={acceptance.background.isPending}>
              {acceptance.background.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Save background check
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Independence assessment (IESBA)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium">Threats (one per line)</label>
              <Textarea rows={4} value={threats} onChange={(e) => setThreats(e.target.value)} placeholder="Self-interest – consulting revenue..." />
            </div>
            <div>
              <label className="text-xs font-medium">Safeguards (one per line)</label>
              <Textarea rows={4} value={safeguards} onChange={(e) => setSafeguards(e.target.value)} placeholder="Separate team for permitted NAS..." />
            </div>
            <div>
              <label className="text-xs font-medium">Conclusion</label>
              <select
                className="w-full border rounded-md px-2 py-2 text-sm"
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value as typeof conclusion)}
              >
                <option value="OK">OK</option>
                <option value="SAFEGUARDS_REQUIRED">Safeguards required</option>
                <option value="PROHIBITED">Prohibited</option>
              </select>
            </div>
            <Button onClick={handleSaveIndependence} disabled={acceptance.independence.isPending}>
              {acceptance.independence.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Save assessment
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acceptance decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium">Decision</label>
              <select
                className="w-full border rounded-md px-2 py-2 text-sm"
                value={decision}
                onChange={(e) => setDecision(e.target.value as typeof decision)}
              >
                <option value="ACCEPT">Accept</option>
                <option value="DECLINE">Decline</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="eqr-required"
                type="checkbox"
                className="h-4 w-4"
                checked={eqrRequired}
                onChange={(e) => setEqrRequired(e.target.checked)}
              />
              <label htmlFor="eqr-required" className="text-sm">Engagement Quality Review (EQR) required</label>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Rationale / key considerations</label>
            <Textarea rows={4} value={rationale} onChange={(e) => setRationale(e.target.value)} />
          </div>
          <Button onClick={handleSubmitDecision} disabled={acceptance.submitDecision.isPending}>
            {acceptance.submitDecision.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Submit for Partner approval
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partner approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {approvals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Partner review is queued once a decision is submitted. Submit the decision above to request approval.
            </p>
          ) : (
            <div className="space-y-3">
              {approvals.map((item) => (
                <div key={item.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{item.stage} review</div>
                    <Badge className={approvalStatusStyles[item.status]}>{item.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Requested {new Date(item.createdAt).toLocaleString()}
                    {item.resolvedAt && ` • Resolved ${new Date(item.resolvedAt).toLocaleString()}`}
                  </div>
                  {item.resolutionNote && (
                    <div className="text-xs text-muted-foreground mt-1">Note: {item.resolutionNote}</div>
                  )}
                  {canResolveApproval && item.status === 'PENDING' && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleApprovalDecision(item.id, 'APPROVED')}
                        disabled={approvalDecisionPending}
                      >
                        {approvalDecisionPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleApprovalDecision(item.id, 'REJECTED')}
                        disabled={approvalDecisionPending}
                      >
                        {approvalDecisionPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Working…
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Need help? Review <Link to="/STANDARDS/POLICY/tcwg_communications.md" className="underline">standards policy</Link> or contact your quality team.
      </div>
    </div>
  );
}
