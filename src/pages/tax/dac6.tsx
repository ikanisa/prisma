import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganizations } from '@/hooks/use-organizations';
import { isSupabaseConfigured } from '@/integrations/supabase/client';
import { createDac6Arrangement, listDac6Arrangements, type Dac6Arrangement } from '@prisma-glow/tax-mt-service';
import { logger } from '@/lib/logger';

type ParticipantInput = {
  id: string;
  name: string;
  role: 'INTERMEDIARY' | 'RELEVANT_TAXPAYER' | 'ASSOCIATED_ENTERPRISE';
  jurisdiction: string;
  tin: string;
};

type HallmarkInput = {
  id: string;
  category: 'A' | 'B' | 'C' | 'D' | 'E';
  code: string;
  mainBenefitTest: boolean;
  description: string;
};

const defaultHallmark = (): HallmarkInput => ({
  id: crypto.randomUUID(),
  category: 'A',
  code: 'A3',
  mainBenefitTest: false,
  description: '',
});

const defaultParticipant = (): ParticipantInput => ({
  id: crypto.randomUUID(),
  name: '',
  role: 'RELEVANT_TAXPAYER',
  jurisdiction: '',
  tin: '',
});

export default function Dac6Page() {
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();

  const [taxEntityId, setTaxEntityId] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [firstStepDate, setFirstStepDate] = useState('');
  const [disclosureDueDate, setDisclosureDueDate] = useState('');
  const [hallmarks, setHallmarks] = useState<HallmarkInput[]>([defaultHallmark()]);
  const [participants, setParticipants] = useState<ParticipantInput[]>([defaultParticipant()]);
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<Dac6Arrangement[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const canExecute = isSupabaseConfigured;

  useEffect(() => {
    if (!taxEntityId && currentOrg) {
      setTaxEntityId(currentOrg.id);
    }
  }, [currentOrg, taxEntityId]);

  useEffect(() => {
    if (!canExecute || !currentOrg?.slug) {
      setHistory([]);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await listDac6Arrangements({ orgSlug: currentOrg.slug, status: statusFilter });
        if (!controller.signal.aborted) {
          setHistory(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        logger.error('dac6.history_load_failed', error);
      }
    };

    load();

    return () => controller.abort();
  }, [canExecute, currentOrg?.slug, statusFilter]);

  const handleHallmarkChange = (id: string, field: keyof HallmarkInput, value: string | boolean) => {
    setHallmarks((prev) => prev.map((hallmark) => (hallmark.id === id ? { ...hallmark, [field]: value } : hallmark)));
  };

  const addHallmark = () => setHallmarks((prev) => [...prev, defaultHallmark()]);
  const removeHallmark = (id: string) => setHallmarks((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const handleParticipantChange = (id: string, field: keyof ParticipantInput, value: string) => {
    setParticipants((prev) => prev.map((participant) => (participant.id === id ? { ...participant, [field]: value } : participant)));
  };

  const addParticipant = () => setParticipants((prev) => [...prev, defaultParticipant()]);
  const removeParticipant = (id: string) =>
    setParticipants((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));

  const handleSubmit = async () => {
    if (!canExecute) {
      toast({ variant: 'destructive', title: 'Supabase not configured', description: 'Connect to backend first.' });
      return;
    }
    if (!currentOrg?.slug || !taxEntityId) {
      toast({ variant: 'destructive', title: 'Select a tax entity', description: 'Tax entity is required.' });
      return;
    }
    if (!reference.trim()) {
      toast({ variant: 'destructive', title: 'Reference required', description: 'Enter arrangement reference.' });
      return;
    }

    try {
      setLoading(true);
      const response = await createDac6Arrangement({
        orgSlug: currentOrg.slug,
        taxEntityId,
        reference,
        description,
        firstStepDate: firstStepDate || undefined,
        disclosureDueDate: disclosureDueDate || undefined,
        hallmarks: hallmarks.map((hallmark) => ({
          category: hallmark.category,
          code: hallmark.code,
          mainBenefitTest: hallmark.mainBenefitTest,
          description: hallmark.description,
        })),
        participants: participants.map((participant) => ({
          name: participant.name,
          role: participant.role,
          jurisdiction: participant.jurisdiction || undefined,
          tin: participant.tin || undefined,
        })),
        notes: notes || undefined,
      });

      toast({
        title: 'DAC6 arrangement assessed',
        description: response.arrangement.status === 'READY_FOR_SUBMISSION'
          ? 'Reporting required – status set to ready for submission.'
          : 'Arrangement created in draft status.',
      });
      setHistory((prev) => [response.arrangement, ...prev]);
      setReference('');
      setDescription('');
      setFirstStepDate('');
      setDisclosureDueDate('');
      setHallmarks([defaultHallmark()]);
      setParticipants([defaultParticipant()]);
      setNotes('');
    } catch (error) {
      logger.error('dac6.create_failed', error);
      toast({
        variant: 'destructive',
        title: 'Unable to create DAC6 arrangement',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">DAC6 hallmarks</h1>
          <p className="text-muted-foreground">Identify cross-border arrangements and track disclosure readiness.</p>
        </div>
        <Badge variant={canExecute ? 'default' : 'outline'}>{canExecute ? 'Connected' : 'Demo mode'}</Badge>
      </div>

      <Card className="border border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle>Arrangement details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="font-medium text-muted-foreground">Tax entity ID</label>
              <Input value={taxEntityId} onChange={(event) => setTaxEntityId(event.target.value)} />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Arrangement reference</label>
              <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="DAC6-2025-01" />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">First step date</label>
              <Input type="date" value={firstStepDate} onChange={(event) => setFirstStepDate(event.target.value)} />
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Disclosure due date</label>
              <Input type="date" value={disclosureDueDate} onChange={(event) => setDisclosureDueDate(event.target.value)} />
            </div>
          </div>
          <Textarea
            rows={2}
            placeholder="Short description of the arrangement"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-muted-foreground">Hallmarks</p>
              <Button variant="ghost" size="sm" onClick={addHallmark}>
                Add hallmark
              </Button>
            </div>
            {hallmarks.map((hallmark) => (
              <div key={hallmark.id} className="grid gap-2 md:grid-cols-5 items-center">
                <Select value={hallmark.category} onValueChange={(value) => handleHallmarkChange(hallmark.id, 'category', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Category A</SelectItem>
                    <SelectItem value="B">Category B</SelectItem>
                    <SelectItem value="C">Category C</SelectItem>
                    <SelectItem value="D">Category D</SelectItem>
                    <SelectItem value="E">Category E</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Hallmark code"
                  value={hallmark.code}
                  onChange={(event) => handleHallmarkChange(hallmark.id, 'code', event.target.value)}
                />
                <Input
                  placeholder="Description"
                  value={hallmark.description}
                  onChange={(event) => handleHallmarkChange(hallmark.id, 'description', event.target.value)}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={hallmark.mainBenefitTest}
                    onChange={(event) => handleHallmarkChange(hallmark.id, 'mainBenefitTest', event.target.checked)}
                  />
                  Main benefit met
                </label>
                <Button variant="ghost" size="sm" onClick={() => removeHallmark(hallmark.id)} disabled={hallmarks.length === 1}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-muted-foreground">Participants</p>
              <Button variant="ghost" size="sm" onClick={addParticipant}>
                Add participant
              </Button>
            </div>
            {participants.map((participant) => (
              <div key={participant.id} className="grid gap-2 md:grid-cols-5 items-center">
                <Input
                  placeholder="Name"
                  value={participant.name}
                  onChange={(event) => handleParticipantChange(participant.id, 'name', event.target.value)}
                />
                <Select value={participant.role} onValueChange={(value) => handleParticipantChange(participant.id, 'role', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RELEVANT_TAXPAYER">Relevant taxpayer</SelectItem>
                    <SelectItem value="INTERMEDIARY">Intermediary</SelectItem>
                    <SelectItem value="ASSOCIATED_ENTERPRISE">Associated enterprise</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Jurisdiction"
                  value={participant.jurisdiction}
                  onChange={(event) => handleParticipantChange(participant.id, 'jurisdiction', event.target.value)}
                />
                <Input
                  placeholder="TIN"
                  value={participant.tin}
                  onChange={(event) => handleParticipantChange(participant.id, 'tin', event.target.value)}
                />
                <Button variant="ghost" size="sm" onClick={() => removeParticipant(participant.id)} disabled={participants.length === 1}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <Textarea
            rows={2}
            placeholder="Internal notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />

          <div className="flex gap-2">
            <Button variant="gradient" onClick={handleSubmit} disabled={loading}>
              Assess hallmarks
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>DAC6 arrangements</CardTitle>
          <Select
            value={statusFilter ?? 'ALL'}
            onValueChange={(value) => setStatusFilter(value === 'ALL' ? undefined : value)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="READY_FOR_SUBMISSION">Ready for submission</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No arrangements recorded yet.</p>
          ) : (
            <div className="overflow-x-auto text-sm">
              <table className="min-w-full border text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Tax entity</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">First step</th>
                    <th className="px-3 py-2">Due date</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">{item.reference}</td>
                      <td className="px-3 py-2">{item.tax_entity_id}</td>
                      <td className="px-3 py-2">{item.status}</td>
                      <td className="px-3 py-2">{item.first_step_date ?? '—'}</td>
                      <td className="px-3 py-2">{item.disclosure_due_date ?? '—'}</td>
                      <td className="px-3 py-2">{new Date(item.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
