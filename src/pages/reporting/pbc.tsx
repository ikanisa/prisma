import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BellRing, CheckCircle2, Loader2, UploadCloud } from 'lucide-react';

import { useOrganizations } from '@/hooks/use-organizations';
import { usePbcManager, type PbcRequest, type PbcRequestStatus } from '@/hooks/use-pbc';
import { useAcceptanceStatus } from '@/hooks/use-acceptance-status';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';

import type { Database } from '@/integrations/supabase/types';
import { matchProcedureId } from '@/utils/pbc';

const STATUS_BADGE: Record<PbcRequestStatus, string> = {
  REQUESTED: 'bg-slate-100 text-slate-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  OBSOLETE: 'bg-amber-100 text-amber-800',
};

type PlannedProcedure = Database['public']['Tables']['audit_planned_procedures']['Row'];
type DocumentRow = Database['public']['Tables']['documents']['Row'];

type TemplateItem = {
  item: string;
  description: string;
  dueInDays: number;
  procedureMatch?: string;
};

type TemplateDefinition = {
  id: string;
  cycle: string;
  label: string;
  items: TemplateItem[];
};

const addDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'revenue',
    cycle: 'Revenue',
    label: 'Revenue cycle',
    items: [
      {
        item: 'Sales contracts and significant amendments',
        description: 'Executed sales contracts, amendments, or side agreements impacting revenue recognition.',
        dueInDays: 7,
        procedureMatch: 'contract review',
      },
      {
        item: 'Sales invoice listing with revenue cut-off flags',
        description: 'Listing of invoices around period end with supporting documentation for cut-off testing.',
        dueInDays: 7,
        procedureMatch: 'cut-off',
      },
      {
        item: 'Revenue reconciliation to trial balance',
        description: 'Reconciliation of general ledger revenue to supporting schedules by product or region.',
        dueInDays: 10,
        procedureMatch: 'reconciliation',
      },
    ],
  },
  {
    id: 'cash',
    cycle: 'Cash',
    label: 'Cash & cash equivalents',
    items: [
      {
        item: 'Bank statements (all operating accounts)',
        description: 'Signed bank statements for all cash accounts covering the audit period.',
        dueInDays: 5,
        procedureMatch: 'bank recon',
      },
      {
        item: 'Bank reconciliations and outstanding items',
        description: 'Prepared bank reconciliations with support for outstanding checks and deposits in transit.',
        dueInDays: 5,
        procedureMatch: 'bank reconciliation',
      },
      {
        item: 'Bank confirmation contact details',
        description: 'Contact details for financial institutions to support external confirmations.',
        dueInDays: 6,
        procedureMatch: 'bank confirmation',
      },
    ],
  },
];

export default function PbcManagerPage() {
  const { engagementId, orgSlug } = useParams<{ engagementId: string; orgSlug: string }>();
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const acceptanceStatus = useAcceptanceStatus(engagementId ?? null);
  const acceptanceApproved =
    acceptanceStatus.data?.status?.status === 'APPROVED' &&
    acceptanceStatus.data?.status?.decision === 'ACCEPT';

  const manager = usePbcManager(engagementId ?? null);

  const proceduresQuery = useQuery<PlannedProcedure[]>({
    queryKey: ['pbc-procedures', currentOrg?.id, engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_planned_procedures')
        .select('id, title, objective')
        .eq('org_id', currentOrg!.id)
        .eq('engagement_id', engagementId!);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: Boolean(currentOrg?.id && engagementId),
    staleTime: 60_000,
  });

  const documentsQuery = useQuery<DocumentRow[]>({
    queryKey: ['pbc-documents', currentOrg?.id, engagementId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, created_at')
        .eq('org_id', currentOrg!.id)
        .eq('engagement_id', engagementId!);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: Boolean(currentOrg?.id && engagementId),
    staleTime: 60_000,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<PbcRequest | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [selectedProcedure, setSelectedProcedure] = useState<string>('');
  const [note, setNote] = useState('');

  const isLoading =
    acceptanceStatus.isLoading ||
    manager.isLoading ||
    manager.instantiate.isPending ||
    manager.updateStatus.isPending;

  const templateOptions = useMemo(() => TEMPLATES, []);

  const handleInstantiate = async () => {
    if (!selectedTemplate || !engagementId || !orgSlug) {
      toast({ title: 'Select a template', description: 'Choose a PBC template before instantiating.', variant: 'destructive' });
      return;
    }

    const template = templateOptions.find((t) => t.id === selectedTemplate);
    if (!template) return;

    const procedures = proceduresQuery.data ?? [];

    const items = template.items.map((item) => {
      const procedureId = matchProcedureId(procedures, item.procedureMatch);
      return {
        item: item.item,
        description: item.description,
        dueAt: addDays(item.dueInDays),
        procedureId,
      };
    });

    try {
      await manager.instantiate.mutateAsync({
        orgSlug,
        engagementId,
        cycle: template.cycle,
        items,
      });
      toast({ title: `${template.cycle} PBC list created`, description: `${items.length} items requested.` });
    } catch (error: any) {
      toast({ title: 'Template instantiation failed', description: error.message, variant: 'destructive' });
    }
  };

  const openReceiveDialog = (request: PbcRequest) => {
    setActiveRequest(request);
    setDialogOpen(true);
    setSelectedDocument('');
    setNote('');
    setSelectedProcedure(request.procedure_id ?? '');
  };

  const handleStatusChange = async (request: PbcRequest, status: PbcRequestStatus) => {
    if (!orgSlug) return;

    if (status === 'RECEIVED') {
      openReceiveDialog(request);
      return;
    }

    try {
      await manager.updateStatus.mutateAsync({
        requestId: request.id,
        status,
      });
      toast({ title: 'Status updated', description: `${request.item} marked ${status.toLowerCase()}.` });
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleReminder = async (request: PbcRequest) => {
    if (!orgSlug) return;
    try {
      await manager.remind.mutateAsync({ requestId: request.id });
      toast({ title: 'Reminder scheduled', description: `Client reminder queued for ${request.item}.` });
    } catch (error: any) {
      toast({ title: 'Reminder failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleIngest = async () => {
    if (!activeRequest || !orgSlug) return;
    if (!selectedDocument) {
      toast({ title: 'Select document', description: 'Choose a document to attach before marking received.', variant: 'destructive' });
      return;
    }
    try {
      await manager.updateStatus.mutateAsync({
        requestId: activeRequest.id,
        status: 'RECEIVED',
        documentId: selectedDocument,
        note: note || undefined,
        procedureId: selectedProcedure || undefined,
      });
      toast({
        title: 'Delivery recorded',
        description: `${activeRequest.item} ingested to evidence.`,
      });
      setDialogOpen(false);
      setActiveRequest(null);
    } catch (error: any) {
      toast({ title: 'Ingestion failed', description: error.message, variant: 'destructive' });
    }
  };

  const acceptanceBlocking = !acceptanceApproved;

  if (acceptanceStatus.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Checking acceptance…
      </div>
    );
  }

  if (acceptanceBlocking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Engagement acceptance pending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Complete engagement acceptance and obtain Partner approval before launching PBC requests.</p>
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
          <h1 className="text-3xl font-bold gradient-text">Provided by Client (PBC) manager</h1>
          <p className="text-muted-foreground">Plan and track evidence requests by cycle, log reminders, and ingest delivered support directly to audit evidence.</p>
          <p className="text-xs text-muted-foreground mt-1">Org: {orgSlug} • Engagement: {engagementId}</p>
        </div>
        <Badge variant="outline">ISA 300 • ISA 230</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instantiate template</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-64">
            <Label className="text-xs font-medium text-muted-foreground">Select cycle template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose template" />
              </SelectTrigger>
              <SelectContent>
                {templateOptions.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInstantiate} disabled={!selectedTemplate || manager.instantiate.isPending}>
            {manager.instantiate.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            Create requests
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PBC tracking</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading requests…
            </div>
          ) : manager.requests.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No PBC items yet. Instantiate a template to kick off client requests.
            </div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead>Deliveries</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manager.requests.map((request) => {
                    const statusColor = STATUS_BADGE[request.status];
                    const dueText = request.due_at ? new Date(request.due_at).toLocaleDateString() : '—';
                    const procedure = proceduresQuery.data?.find((p) => p.id === request.procedure_id) ?? null;
                    const latestDelivery = request.deliveries?.[request.deliveries.length - 1] ?? null;

                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="font-medium">{request.item}</div>
                          {request.description && (
                            <div className="text-xs text-muted-foreground max-w-md">{request.description}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.cycle}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColor}>{request.status}</Badge>
                        </TableCell>
                        <TableCell>{dueText}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {procedure ? procedure.title : request.procedure_id ? 'Procedure linked' : 'Not mapped'}
                        </TableCell>
                        <TableCell>
                          {request.deliveries.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Pending upload</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {request.deliveries.map((delivery) => (
                                <div key={delivery.id} className="text-xs text-muted-foreground">
                                  <span className="font-medium">{new Date(delivery.delivered_at).toLocaleDateString()}</span>
                                  {delivery.note ? ` — ${delivery.note}` : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="space-y-2 text-right">
                          <Select
                            value={request.status}
                            onValueChange={(value) => handleStatusChange(request, value as PbcRequestStatus)}
                          >
                            <SelectTrigger className="h-8 text-xs justify-between">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="REQUESTED">Requested</SelectItem>
                              <SelectItem value="RECEIVED">Received</SelectItem>
                              <SelectItem value="REJECTED">Rejected</SelectItem>
                              <SelectItem value="OBSOLETE">Obsolete</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReminder(request)}
                              disabled={manager.remind.isPending}
                            >
                              <BellRing className="w-4 h-4 mr-1" /> Remind
                            </Button>
                            {request.status === 'RECEIVED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openReceiveDialog(request)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Ingest again
                              </Button>
                            )}
                            {request.status !== 'RECEIVED' && (
                              <Button size="sm" onClick={() => openReceiveDialog(request)}>
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Mark received
                              </Button>
                            )}
                          </div>
                          {latestDelivery && request.status === 'RECEIVED' && (
                            <div className="text-[11px] text-muted-foreground">
                              Last delivery {new Date(latestDelivery.delivered_at).toLocaleDateString()}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setActiveRequest(null);
            setSelectedDocument('');
            setSelectedProcedure('');
            setNote('');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeRequest ? `Mark received: ${activeRequest.item}` : 'Mark received'}</DialogTitle>
            <DialogDescription>
              Attach the delivered document and optionally map to the relevant procedure. An audit evidence record will be created automatically.
            </DialogDescription>
          </DialogHeader>
          {activeRequest && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Document</Label>
                <Select value={selectedDocument} onValueChange={setSelectedDocument}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentsQuery.data?.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Procedure mapping</Label>
                <Select value={selectedProcedure} onValueChange={setSelectedProcedure}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional: map to planned procedure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not linked</SelectItem>
                    {proceduresQuery.data?.map((proc) => (
                      <SelectItem key={proc.id} value={proc.id}>
                        {proc.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Context for this delivery" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleIngest} disabled={manager.updateStatus.isPending}>
                  {manager.updateStatus.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Confirm & ingest
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertCircle className="w-3 h-3" />
        Activity Log entries emitted: PBC_CREATED, PBC_REMINDER_SENT, PBC_RECEIVED (ISA 300/230 traceability).
      </div>
    </div>
  );
}
