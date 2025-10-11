import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { listClients, type ClientRecord } from '@/lib/clients';
import {
  listEngagements,
  createEngagement,
  updateEngagement,
  deleteEngagement,
  type EngagementRecord,
  type NonAuditServiceSelection,
} from '@/lib/engagements';

const STATUS_OPTIONS = [
  { label: 'Planning', value: 'PLANNING' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Review', value: 'REVIEW' },
  { label: 'Completed', value: 'COMPLETED' },
];

const statusColors: Record<string, string> = {
  PLANNING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  REVIEW: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

const NAS_CATALOG = [
  {
    id: 'bookkeeping',
    label: 'Bookkeeping & accounting records',
    service: 'Bookkeeping & accounting records',
    prohibited: true,
    description: 'Preparing accounting records or financial statements that become the audit evidence.',
  },
  {
    id: 'management',
    label: 'Management or decision-making',
    service: 'Management or decision-making',
    prohibited: true,
    description: 'Acting in a management capacity, making decisions, or assuming client responsibilities.',
  },
  {
    id: 'valuation',
    label: 'Valuation as primary audit evidence',
    service: 'Valuation as primary audit evidence',
    prohibited: true,
    description: 'Valuations of material amounts that would be relied upon as audit evidence.',
  },
  {
    id: 'tax-compliance',
    label: 'Tax compliance (returns)',
    service: 'Tax compliance',
    prohibited: false,
    description: 'Preparing routine tax filings based on management-provided data (allowed with safeguards).',
  },
  {
    id: 'tax-advisory',
    label: 'Tax advisory (non-aggressive)',
    service: 'Tax advisory',
    prohibited: false,
    description: 'Advising on tax positions supported by authoritative guidance (allowed with safeguards).',
  },
];

const NAS_BY_ID = new Map(NAS_CATALOG.map((item) => [item.id, item]));
const NAS_BY_SERVICE = new Map(NAS_CATALOG.map((item) => [item.service, item]));

const engagementFormSchema = z.object({
  clientId: z.string({ required_error: 'Client is required' }).min(1, 'Client is required'),
  title: z.string().trim().min(2, 'Title must be at least 2 characters'),
  status: z.string().default('PLANNING'),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  isAuditClient: z.boolean().default(false),
  requiresEqr: z.boolean().default(false),
  overrideNote: z.string().optional().or(z.literal('')),
});

type EngagementFormValues = z.infer<typeof engagementFormSchema>;

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const buildIndependencePayload = (
  values: EngagementFormValues,
  selectedServices: string[],
): {
  services: NonAuditServiceSelection[];
  prohibitedCount: number;
  isAuditClient: boolean;
  overrideNote: string | null;
} => {
  const services = selectedServices
    .map((id) => NAS_BY_ID.get(id))
    .filter((item): item is typeof NAS_CATALOG[number] => Boolean(item))
    .map((item) => ({
      service: item.service,
      prohibited: item.prohibited,
      description: item.description ?? null,
    }));

  const prohibitedCount = services.filter((svc) => svc.prohibited).length;
  return {
    services,
    prohibitedCount,
    isAuditClient: values.isAuditClient,
    overrideNote: values.overrideNote?.trim() ? values.overrideNote.trim() : null,
  };
};

export function Engagements() {
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const [engagements, setEngagements] = useState<EngagementRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEngagement, setEditingEngagement] = useState<EngagementRecord | null>(null);
  const [selectedNas, setSelectedNas] = useState<string[]>([]);
  const [deletingEngagement, setDeletingEngagement] = useState<EngagementRecord | null>(null);

  const orgSlug = currentOrg?.slug ?? null;

  const form = useForm<EngagementFormValues>({
    resolver: zodResolver(engagementFormSchema),
    defaultValues: {
      clientId: '',
      title: '',
      status: 'PLANNING',
      startDate: '',
      endDate: '',
      description: '',
      isAuditClient: false,
      requiresEqr: false,
      overrideNote: '',
    },
  });

  const clientNameById = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);

  const independenceInfo = buildIndependencePayload(form.getValues(), selectedNas);

  const loadData = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    try {
      const [clientRows, engagementRows] = await Promise.all([
        listClients(orgSlug),
        listEngagements(orgSlug),
      ]);
      setClients(clientRows);
      setEngagements(engagementRows);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load engagements',
        description: (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }, [orgSlug, toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateDialog = () => {
    setEditingEngagement(null);
    setSelectedNas([]);
    form.reset({
      clientId: '',
      title: '',
      status: 'PLANNING',
      startDate: '',
      endDate: '',
      description: '',
      isAuditClient: false,
      requiresEqr: false,
      overrideNote: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (engagement: EngagementRecord) => {
    setEditingEngagement(engagement);
    form.reset({
      clientId: engagement.client_id,
      title: engagement.title,
      status: engagement.status ?? 'PLANNING',
      startDate: engagement.start_date ?? '',
      endDate: engagement.end_date ?? '',
      description: engagement.description ?? '',
      isAuditClient: engagement.is_audit_client,
      requiresEqr: engagement.requires_eqr,
      overrideNote: engagement.independence_conclusion_note ?? '',
    });
    setSelectedNas(
      engagement.non_audit_services
        .map((svc) => NAS_BY_SERVICE.get(svc.service)?.id ?? null)
        .filter((id): id is string => Boolean(id)),
    );
    setDialogOpen(true);
  };

  const handleSubmit = async (values: EngagementFormValues) => {
    if (!orgSlug) return;
    const payload = buildIndependencePayload(values, selectedNas);

    if (values.isAuditClient && payload.prohibitedCount > 0 && !payload.overrideNote) {
      toast({
        variant: 'destructive',
        title: 'Override justification required',
        description: 'Provide an override note when prohibited services are selected.',
      });
      return;
    }

    try {
      if (editingEngagement) {
        const updated = await updateEngagement({
          orgSlug,
          engagementId: editingEngagement.id,
          clientId: values.clientId,
          title: values.title,
          description: values.description ?? null,
          status: values.status,
          startDate: values.startDate ?? null,
          endDate: values.endDate ?? null,
          independence: {
            isAuditClient: values.isAuditClient,
            requiresEqr: values.requiresEqr,
            nonAuditServices: payload.services,
            independenceChecked: values.isAuditClient ? true : false,
            overrideNote: payload.overrideNote,
          },
        });
        setEngagements((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        toast({ title: 'Engagement updated' });
      } else {
        const created = await createEngagement({
          orgSlug,
          clientId: values.clientId,
          title: values.title,
          description: values.description ?? null,
          status: values.status,
          startDate: values.startDate ?? null,
          endDate: values.endDate ?? null,
          independence: {
            isAuditClient: values.isAuditClient,
            requiresEqr: values.requiresEqr,
            nonAuditServices: payload.services,
            independenceChecked: values.isAuditClient ? true : false,
            overrideNote: payload.overrideNote,
          },
        });
        setEngagements((prev) => [created, ...prev]);
        toast({ title: 'Engagement created' });
      }
      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: (error as Error).message,
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingEngagement || !orgSlug) return;
    try {
      await deleteEngagement(orgSlug, deletingEngagement.id);
      setEngagements((prev) => prev.filter((item) => item.id !== deletingEngagement.id));
      toast({ title: 'Engagement deleted' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: (error as Error).message,
      });
    } finally {
      setDeletingEngagement(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Engagements</h1>
          <p className="text-muted-foreground">Track audit and advisory engagements with independence safeguards.</p>
        </div>
        <Button variant="gradient" onClick={openCreateDialog} disabled={!orgSlug}>
          <Plus className="mr-2 h-4 w-4" />
          New engagement
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading engagements...
        </div>
      ) : (
        <div className="grid gap-6">
          {engagements.map((engagement, index) => (
            <motion.div
              key={engagement.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover-lift glass">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span>{clientNameById.get(engagement.client_id) ?? 'Unknown client'}</span>
                      <Badge className={statusColors[engagement.status ?? 'PLANNING'] ?? ''}>
                        {engagement.status?.replace('_', ' ') ?? 'PLANNING'}
                      </Badge>
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{engagement.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(engagement)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingEngagement(engagement)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap gap-4">
                    <span>
                      Period: {formatDate(engagement.start_date)} – {formatDate(engagement.end_date)}
                    </span>
                    <span>Budget: {engagement.budget ? `€${engagement.budget.toLocaleString()}` : '—'}</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Independence</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <Badge variant={engagement.independence_conclusion === 'OK' ? 'outline' : 'destructive'}>
                        {engagement.independence_conclusion}
                      </Badge>
                      {engagement.non_audit_services.map((svc) => (
                        <Badge key={svc.service} variant={svc.prohibited ? 'destructive' : 'outline'}>
                          {svc.service}
                        </Badge>
                      ))}
                      {engagement.independence_conclusion_note && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
                          {engagement.independence_conclusion_note}
                        </span>
                      )}
                    </div>
                  </div>
                  {engagement.description && <p>{engagement.description}</p>}
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {engagements.length === 0 && !loading && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No engagements yet. Create one to get started.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEngagement ? 'Edit engagement' : 'New engagement'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Engagement title</FormLabel>
                      <FormControl>
                        <Input placeholder="FY25 Audit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requiresEqr"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-2 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <FormLabel>Requires EQR</FormLabel>
                          <p className="text-sm text-muted-foreground">Escalate to engagement quality reviewer.</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isAuditClient"
                  render={({ field }) => (
                    <FormItem className="flex flex-col gap-2 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <FormLabel>Audit client</FormLabel>
                          <p className="text-sm text-muted-foreground">Enable independence checks for audit engagements.</p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (!checked) {
                              setSelectedNas([]);
                            }
                          }} />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Scope, special considerations..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Non-audit services</FormLabel>
                  <span className="text-xs text-muted-foreground">
                    Select services supplied alongside the engagement.
                  </span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {NAS_CATALOG.map((item) => (
                    <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                      <Checkbox
                        checked={selectedNas.includes(item.id)}
                        onCheckedChange={(checked) => {
                          setSelectedNas((prev) =>
                            checked ? [...prev, item.id] : prev.filter((entry) => entry !== item.id),
                          );
                        }}
                        disabled={!form.getValues('isAuditClient') && item.prohibited}
                      />
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {form.getValues('isAuditClient') && (
                <Alert variant={independenceInfo.prohibitedCount > 0 ? 'destructive' : 'default'}>
                  <AlertTitle>
                    {independenceInfo.prohibitedCount > 0
                      ? 'Prohibited services detected'
                      : 'Independence check complete'}
                  </AlertTitle>
                  <AlertDescription>
                    {independenceInfo.prohibitedCount > 0
                      ? 'Document safeguards and provide an override note to proceed.'
                      : 'No prohibited services selected. Independence check passes.'}
                  </AlertDescription>
                </Alert>
              )}

              {form.getValues('isAuditClient') && independenceInfo.prohibitedCount > 0 && (
                <FormField
                  control={form.control}
                  name="overrideNote"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Override note</FormLabel>
                      <FormControl>
                        <Textarea rows={2} placeholder="Describe safeguards and approval." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingEngagement ? 'Save changes' : 'Create engagement'}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingEngagement)} onOpenChange={() => setDeletingEngagement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete engagement</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The engagement will be removed from the workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
