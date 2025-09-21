import { useEffect, useMemo, useState, MouseEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Plus, Edit, CalendarDays, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { listClients, ClientRecord } from '@/lib/clients';
import {
  createEngagement,
  listEngagements,
  updateEngagement,
  deleteEngagement,
  EngagementRecord,
  NonAuditServiceSelection,
} from '@/lib/engagements';
import { auditChecklists, accountingChecklists, taxChecklists, ChecklistDefinition } from '@/data/checklists';
import { useEvidenceStore } from '@/stores/evidence';

const maltaVatWorkingPaperUrl = new URL('../../CHECKLISTS/TAX/malta_vat_working_paper.md', import.meta.url).href;
const maltaCitWorkingPaperUrl = new URL('../../CHECKLISTS/TAX/malta_cit_working_paper.md', import.meta.url).href;

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
    id: 'aggressive-tax',
    label: 'Aggressive tax planning',
    service: 'Aggressive tax planning',
    prohibited: true,
    description: 'Designing or implementing unsupported tax strategies or contingent fee arrangements.',
  },
  {
    id: 'it-systems',
    label: 'Financial IT systems design',
    service: 'Financial IT systems design',
    prohibited: true,
    description: 'Designing or implementing financial systems that form part of the accounting records.',
  },
  {
    id: 'internal-audit',
    label: 'Internal audit outsourcing',
    service: 'Internal audit outsourcing',
    prohibited: true,
    description: 'Performing internal audit services relating to significant audit areas.',
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
  {
    id: 'training',
    label: 'Training & technical updates',
    service: 'Training & technical updates',
    prohibited: false,
    description: 'Providing general training on accounting or auditing standards (allowed with safeguards).',
  },
];

const NAS_BY_ID = new Map(NAS_CATALOG.map((item) => [item.id, item]));
const NAS_BY_SERVICE = new Map(NAS_CATALOG.map((item) => [item.service, item]));

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

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

type ChecklistState = {
  checked: Record<string, boolean>;
  notes: Record<string, string>;
  applicable: Record<string, boolean>;
};

const createEmptyChecklistState = (): ChecklistState => ({
  checked: {},
  notes: {},
  applicable: {},
});

const getChecklistKey = (engagementId: string, checklist: ChecklistDefinition) =>
  `${engagementId}::${checklist.title}`;

export function Engagements() {
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const [engagements, setEngagements] = useState<EngagementRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEngagement, setEditingEngagement] = useState<EngagementRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingEngagement, setConfirmingEngagement] = useState<EngagementRecord | null>(null);
  const [binderOpen, setBinderOpen] = useState(false);
  const [selectedEngagement, setSelectedEngagement] = useState<EngagementRecord | null>(null);
  const [activeChecklistTab, setActiveChecklistTab] = useState<'audit' | 'accounting' | 'tax'>('audit');
  const [checklistState, setChecklistState] = useState<Record<string, ChecklistState>>({});
  const [selectedNas, setSelectedNas] = useState<string[]>([]);
  const [independenceChecked, setIndependenceChecked] = useState(false);
  const [independenceStatus, setIndependenceStatus] = useState<'UNRUN' | 'OK' | 'PROHIBITED' | 'OVERRIDE'>('UNRUN');
  const taxWorkingPaperLinks = [
    {
      title: 'Malta VAT Working Paper',
      description: 'Evidence template for Malta VAT return (CAP 406).',
      href: maltaVatWorkingPaperUrl,
    },
    {
      title: 'Malta CIT Working Paper',
      description: 'Support for Malta corporate income tax computation and refund claims.',
      href: maltaCitWorkingPaperUrl,
    },
  ];

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

  const isAuditClientValue = form.watch('isAuditClient');
  const overrideNoteValue = form.watch('overrideNote');

  useEffect(() => {
    if (!isAuditClientValue) {
      setIndependenceStatus('UNRUN');
      setIndependenceChecked(false);
      return;
    }

    if (!independenceChecked) {
      return;
    }

    const hasProhibited = selectedNas.some((id) => NAS_BY_ID.get(id)?.prohibited);
    if (!hasProhibited) {
      setIndependenceStatus('OK');
      return;
    }

    const note = (overrideNoteValue ?? '').trim();
    setIndependenceStatus(note.length > 0 ? 'OVERRIDE' : 'PROHIBITED');
  }, [isAuditClientValue, selectedNas, overrideNoteValue, independenceChecked]);

  const handleNasToggle = (id: string, checked: boolean) => {
    setSelectedNas((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  };

  const runIndependenceCheck = () => {
    if (!isAuditClientValue) {
      setIndependenceStatus('OK');
      setIndependenceChecked(false);
      return;
    }
    setIndependenceChecked(true);
    const hasProhibited = selectedNas.some((id) => NAS_BY_ID.get(id)?.prohibited);
    if (!hasProhibited) {
      setIndependenceStatus('OK');
    } else {
      const note = (overrideNoteValue ?? '').trim();
      setIndependenceStatus(note.length > 0 ? 'OVERRIDE' : 'PROHIBITED');
    }
  };

  const mapSelectedNasToServices = (): NonAuditServiceSelection[] =>
    selectedNas
      .map((id) => NAS_BY_ID.get(id))
      .filter((item): item is (typeof NAS_CATALOG)[number] => Boolean(item))
      .map((item) => ({
        service: item.service,
        prohibited: item.prohibited,
        description: item.description,
      }));

  const buildIndependencePayload = () => {
    const overrideNote = (overrideNoteValue ?? '').trim();
    return {
      isAuditClient: isAuditClientValue,
      requiresEqr: form.getValues('requiresEqr'),
      nonAuditServices: mapSelectedNasToServices(),
      independenceChecked: isAuditClientValue ? independenceChecked : false,
      overrideNote: overrideNote.length > 0 ? overrideNote : null,
    };
  };

  const independenceMessage = (() => {
    if (!isAuditClientValue) {
      return 'Not marked as an audit client.';
    }
    if (!independenceChecked) {
      return 'Run the independence check to document NAS evaluation.';
    }
    if (independenceStatus === 'OK') {
      return 'Independence check passed – no prohibited non-audit services selected.';
    }
    if (independenceStatus === 'OVERRIDE') {
      return 'Partner override will be routed for approval before activation.';
    }
    return 'Prohibited non-audit services selected. Provide an override note for partner approval or remove the service(s).';
  })();

  useEffect(() => {
    if (!orgSlug) {
      setEngagements([]);
      setClients([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [engagementRows, clientRows] = await Promise.all([
          listEngagements(orgSlug),
          listClients(orgSlug),
        ]);
        setEngagements(engagementRows);
        setClients(clientRows);
      } catch (error) {
        toast({
          title: 'Failed to load engagements',
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [orgSlug, toast]);

  const clientNameById = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);
  const addEvidenceRecord = useEvidenceStore((state) => state.addEvidence);

  const getChecklistStateFor = (engagementId: string, checklist: ChecklistDefinition): ChecklistState => {
    const key = getChecklistKey(engagementId, checklist);
    return checklistState[key] ?? createEmptyChecklistState();
  };

  const updateChecklistState = (
    engagementId: string,
    checklist: ChecklistDefinition,
    updater: (current: ChecklistState) => ChecklistState
  ) => {
    const key = getChecklistKey(engagementId, checklist);
    setChecklistState((prev) => ({
      ...prev,
      [key]: updater(prev[key] ?? createEmptyChecklistState()),
    }));
  };

  const getChecklistMetrics = (engagementId: string, checklist: ChecklistDefinition) => {
    const state = getChecklistStateFor(engagementId, checklist);
    let total = 0;
    let completed = 0;

    checklist.sections.forEach((section) => {
      section.items.forEach((item) => {
        const applicable = state.applicable[item.id] ?? item.defaultApplicable ?? true;
        if (applicable) {
          total += 1;
          if (state.checked[item.id]) {
            completed += 1;
          }
        }
      });
    });

    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { state, total, completed, percent };
  };

  const handleApplicableChange = (
    engagementId: string,
    checklist: ChecklistDefinition,
    itemId: string,
    applicable: boolean
  ) => {
    updateChecklistState(engagementId, checklist, (current) => {
      const next: ChecklistState = {
        checked: { ...current.checked },
        notes: { ...current.notes },
        applicable: { ...current.applicable, [itemId]: applicable },
      };
      if (!applicable) {
        next.checked[itemId] = false;
      }
      return next;
    });
  };

  const handleToggleItem = (
    engagementId: string,
    checklist: ChecklistDefinition,
    itemId: string,
    checked: boolean
  ) => {
    updateChecklistState(engagementId, checklist, (current) => ({
      checked: { ...current.checked, [itemId]: checked },
      notes: { ...current.notes },
      applicable: { ...current.applicable },
    }));
  };

  const handleNoteChange = (
    engagementId: string,
    checklist: ChecklistDefinition,
    itemId: string,
    note: string
  ) => {
    updateChecklistState(engagementId, checklist, (current) => ({
      checked: { ...current.checked },
      notes: { ...current.notes, [itemId]: note },
      applicable: { ...current.applicable },
    }));
  };

  const openBinder = (engagement: EngagementRecord) => {
    setSelectedEngagement(engagement);
    setActiveChecklistTab('audit');
    setBinderOpen(true);
  };

  const binderSummary = selectedEngagement
    ? (() => {
        let total = 0;
        let completed = 0;
        const engagementId = selectedEngagement.id;
        [...auditChecklists, ...accountingChecklists, ...taxChecklists].forEach((checklist) => {
          const metrics = getChecklistMetrics(engagementId, checklist);
          total += metrics.total;
          completed += metrics.completed;
        });
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
        return { total, completed, percent };
      })()
    : { total: 0, completed: 0, percent: 0 };

  const renderChecklistGroup = (engagementId: string, checklists: ChecklistDefinition[]) => (
    <div className="space-y-4">
      {checklists.map((checklist) => {
        const { state, total, completed, percent } = getChecklistMetrics(engagementId, checklist);

        return (
          <Card key={getChecklistKey(engagementId, checklist)}>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{checklist.title}</CardTitle>
                <p className="text-sm text-muted-foreground">Standard: {checklist.code}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Completion</div>
                <div className="text-xl font-semibold">{percent}%</div>
                <Progress value={percent} className="mt-1 w-40" />
                <div className="text-xs text-muted-foreground mt-1">{completed} of {total} items complete</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="max-h-72 pr-4">
                <div className="space-y-4">
                  {checklist.sections.map((section) => (
                    <div key={section.title} className="space-y-3">
                      <div className="text-sm font-semibold text-foreground">{section.title}</div>
                      {section.items.map((item) => {
                        const applicable = state.applicable[item.id] ?? item.defaultApplicable ?? true;
                        const checked = state.checked[item.id] ?? false;
                        const note = state.notes[item.id] ?? '';

                        return (
                          <div key={item.id} className="rounded-lg border border-border/40 p-3 space-y-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={applicable ? checked : false}
                                  disabled={!applicable}
                                  onCheckedChange={(value) =>
                                    handleToggleItem(engagementId, checklist, item.id, value === true)
                                  }
                                />
                                <div>
                                  <div className="text-sm font-medium text-foreground leading-snug">
                                    {item.text}
                                  </div>
                                  <Badge variant="outline" className="mt-1">
                                    {item.standard}
                                  </Badge>
                                </div>
                              </div>
                            {item.defaultApplicable !== undefined && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Switch
                                  checked={applicable}
                                  onCheckedChange={(value) =>
                                    handleApplicableChange(engagementId, checklist, item.id, value)
                                  }
                                />
                                <span>Applicable</span>
                              </div>
                            )}
                          </div>
                          {applicable && (
                              <div className="space-y-2">
                                <Textarea
                                  value={note}
                                  onChange={(event) =>
                                    handleNoteChange(engagementId, checklist, item.id, event.target.value)
                                  }
                                  placeholder="Evidence / notes / reviewer feedback"
                                  rows={2}
                                />
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={() => {
                                      const record = addEvidenceRecord({
                                        title: `${checklist.title} • ${item.text}`,
                                        standard: item.standard,
                                        control: checklist.title,
                                        documentUrl: `/documents?engagementId=${engagementId}&source=${item.id}`,
                                      });
                                      toast({
                                        title: 'Evidence added',
                                        description: `${record.title} linked to ${item.standard}.`,
                                      });
                                    }}
                                  >
                                    Add as Evidence
                                  </Button>
                                  <span>Link evidence via Documents module.</span>
                                </div>
                              </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/documents?engagementId=${engagementId}`} target="_blank" rel="noopener noreferrer">
                    Attach evidence via Documents
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const handleCreate = async (values: EngagementFormValues) => {
    if (!orgSlug) return;

    const independencePayload = buildIndependencePayload();
    const hasProhibited = independencePayload.nonAuditServices.some((svc) => svc.prohibited);

    if (independencePayload.isAuditClient) {
      if (!independencePayload.independenceChecked) {
        toast({
          title: 'Independence check required',
          description: 'Run the independence check before activating an audit engagement.',
          variant: 'destructive',
        });
        return;
      }
      if (hasProhibited && !independencePayload.overrideNote) {
        toast({
          title: 'Partner override note required',
          description: 'Provide rationale for the prohibited non-audit services or remove them.',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      if (editingEngagement) {
        const updated = await updateEngagement({
          orgSlug,
          engagementId: editingEngagement.id,
          clientId: values.clientId,
          title: values.title.trim(),
          status: values.status,
          startDate: values.startDate,
          endDate: values.endDate,
          description: values.description,
          independence: {
            isAuditClient: independencePayload.isAuditClient,
            requiresEqr: independencePayload.requiresEqr,
            nonAuditServices: independencePayload.nonAuditServices,
            independenceChecked: independencePayload.independenceChecked,
            overrideNote: independencePayload.overrideNote,
          },
        });

        setEngagements((prev) => prev.map((eng) => (eng.id === updated.id ? updated : eng)));
        toast({
          title: 'Engagement updated',
          description: `${updated.title} was saved successfully.`,
        });
      } else {
        const created = await createEngagement({
          orgSlug,
          clientId: values.clientId,
          title: values.title.trim(),
          status: values.status,
          startDate: values.startDate,
          endDate: values.endDate,
          description: values.description,
          independence: {
            isAuditClient: independencePayload.isAuditClient,
            requiresEqr: independencePayload.requiresEqr,
            nonAuditServices: independencePayload.nonAuditServices,
            independenceChecked: independencePayload.independenceChecked,
            overrideNote: independencePayload.overrideNote,
          },
        });

        setEngagements((prev) => [created, ...prev]);
        toast({
          title: 'Engagement created',
          description: `${created.title} was added successfully.`,
        });
      }
      setDialogOpen(false);
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
      setEditingEngagement(null);
      setSelectedNas([]);
      setIndependenceChecked(false);
      setIndependenceStatus('UNRUN');
    } catch (error) {
      toast({
        title: 'Failed to save engagement',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  if (!currentOrg) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Engagements</h1>
        <p className="mt-2 text-muted-foreground">Join or select an organization to manage engagements.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Engagements</h1>
          <p className="text-muted-foreground">Track project progress and deliverables</p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
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
              setEditingEngagement(null);
              setSelectedNas([]);
              setIndependenceChecked(false);
              setIndependenceStatus('UNRUN');
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="gradient"
              onClick={() => {
                setEditingEngagement(null);
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
                setSelectedNas([]);
                setIndependenceChecked(false);
                setIndependenceStatus('UNRUN');
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Engagement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingEngagement ? 'Update Engagement' : 'Create Engagement'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <FormLabel>Engagement Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Year-end audit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Key scope details, deliverables, milestones" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <FormField
                      control={form.control}
                      name="isAuditClient"
                      render={({ field }) => (
                        <FormItem className="flex flex-col space-y-1">
                          <FormLabel>Audit engagement</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(val) => {
                                field.onChange(val);
                                if (!val) {
                                  setSelectedNas([]);
                                  setIndependenceChecked(false);
                                  setIndependenceStatus('UNRUN');
                                  form.setValue('overrideNote', '');
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="requiresEqr"
                      render={({ field }) => (
                        <FormItem className="flex flex-col space-y-1">
                          <FormLabel>Requires EQR</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {isAuditClientValue && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Non-audit services</p>
                        <p className="text-xs text-muted-foreground">
                          Select NAS provided to this audit client. Prohibited services require a documented partner override and approval.
                        </p>
                      </div>

                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {NAS_CATALOG.map((item) => {
                          const checked = selectedNas.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className={`flex gap-3 rounded-lg border p-3 transition-colors ${checked ? 'border-primary/70 bg-primary/10' : 'border-border bg-background'}`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(val) => handleNasToggle(item.id, Boolean(val))}
                              />
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                                  <span>{item.label}</span>
                                  <Badge variant={item.prohibited ? 'destructive' : 'outline'}>
                                    {item.prohibited ? 'Prohibited' : 'Allowed w/ safeguards'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Button type="button" variant="outline" onClick={runIndependenceCheck} className="w-full sm:w-auto">
                          Run Independence Check
                        </Button>
                        <Button variant="link" size="sm" className="justify-start sm:justify-end" asChild>
                          <a href="/STANDARDS/POLICY/independence_catalog.md" target="_blank" rel="noreferrer">
                            View NAS catalog
                          </a>
                        </Button>
                      </div>

                      {independenceChecked && (
                        <Alert
                          variant={
                            independenceStatus === 'OK'
                              ? 'default'
                              : independenceStatus === 'OVERRIDE'
                              ? 'warning'
                              : 'destructive'
                          }
                        >
                          <AlertTitle>
                            {independenceStatus === 'OK'
                              ? 'Independence OK'
                              : independenceStatus === 'OVERRIDE'
                              ? 'Override required'
                              : 'Prohibited services selected'}
                          </AlertTitle>
                          <AlertDescription className="text-xs leading-relaxed">
                            {independenceMessage}
                          </AlertDescription>
                        </Alert>
                      )}

                      {(independenceStatus === 'PROHIBITED' || independenceStatus === 'OVERRIDE') && (
                        <FormField
                          control={form.control}
                          name="overrideNote"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Partner override note</FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={3}
                                  placeholder="Document rationale, safeguards, and reviewer sign-off plan"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDialogOpen(false);
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
                      setEditingEngagement(null);
                      setSelectedNas([]);
                      setIndependenceChecked(false);
                      setIndependenceStatus('UNRUN');
                    }}
                    disabled={form.formState.isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="gradient" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Engagement
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {engagements.map((engagement, index) => (
          <motion.div
            key={engagement.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card className="hover-lift glass">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarDays className="w-5 h-5" />
                    <span>{clientNameById.get(engagement.client_id) ?? 'Client'}</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{engagement.title}</p>
                </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[engagement.status ?? 'PLANNING'] ?? 'bg-gray-100 text-gray-800'}>
                      {(engagement.status ?? 'PLANNING').replace(/_/g, ' ')}
                    </Badge>
                    {engagement.is_audit_client && (
                      <Badge
                        variant={
                          engagement.independence_conclusion === 'OK'
                            ? 'outline'
                            : engagement.independence_conclusion === 'OVERRIDE'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {engagement.independence_conclusion === 'OK'
                          ? 'Independence OK'
                          : engagement.independence_conclusion === 'OVERRIDE'
                          ? 'Override pending'
                          : 'Prohibited NAS'}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingEngagement(engagement);
                        form.reset({
                          clientId: engagement.client_id,
                          title: engagement.title,
                          status: (engagement.status ?? 'PLANNING').toUpperCase(),
                          startDate: engagement.start_date ?? '',
                          endDate: engagement.end_date ?? '',
                          description: engagement.description ?? '',
                          isAuditClient: engagement.is_audit_client,
                          requiresEqr: engagement.requires_eqr,
                          overrideNote: engagement.independence_conclusion_note ?? '',
                        });
                        const nasFromRecord = (engagement.non_audit_services ?? [])
                          .map((svc) => NAS_BY_SERVICE.get(svc.service)?.id)
                          .filter((id): id is string => Boolean(id));
                        setSelectedNas(nasFromRecord);
                        setIndependenceChecked(engagement.is_audit_client ? engagement.independence_checked : false);
                        setIndependenceStatus(
                          engagement.is_audit_client
                            ? (engagement.independence_conclusion as 'OK' | 'PROHIBITED' | 'OVERRIDE')
                            : 'UNRUN'
                        );
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={deletingId === engagement.id}
                      onClick={() => setConfirmingEngagement(engagement)}
                    >
                      {deletingId === engagement.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-foreground">Start</span>
                    <div>{formatDate(engagement.start_date)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">End</span>
                    <div>{formatDate(engagement.end_date)}</div>
                  </div>
                </div>
                {engagement.description && <p>{engagement.description}</p>}
                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" size="sm" onClick={() => openBinder(engagement)}>
                    Review Checklists
                  </Button>
                  <Button variant="link" size="sm" className="justify-start sm:justify-end" asChild>
                    <a
                      href={`/documents?engagementId=${engagement.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Documents module
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {engagements.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          No engagements yet. Create one to get started.
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-10 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      <AlertDialog
        open={Boolean(confirmingEngagement)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmingEngagement(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete engagement?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {confirmingEngagement?.title}. Linked tasks must be completed or reassigned before deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId === confirmingEngagement?.id}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingId === confirmingEngagement?.id}
              onClick={async (event: MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                if (!orgSlug || !confirmingEngagement) return;
                try {
                  setDeletingId(confirmingEngagement.id);
                  await deleteEngagement(orgSlug, confirmingEngagement.id);
                  setEngagements((prev) => prev.filter((row) => row.id !== confirmingEngagement.id));
                  toast({
                    title: 'Engagement deleted',
                    description: `${confirmingEngagement.title} was removed successfully.`,
                  });
                  setConfirmingEngagement(null);
                } catch (error) {
                  let message = (error as Error).message;
                  if (message === 'engagement_has_tasks') {
                    message = 'Cannot delete engagement while tasks are linked. Complete or reassign tasks before deleting.';
                  }
                  toast({
                    title: 'Failed to delete engagement',
                    description: message,
                    variant: 'destructive',
                  });
                } finally {
                  setDeletingId(null);
                }
              }}
            >
              {deletingId === confirmingEngagement?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet
        open={binderOpen}
        onOpenChange={(open) => {
          setBinderOpen(open);
          if (!open) {
            setSelectedEngagement(null);
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Engagement Checklists {selectedEngagement ? `• ${selectedEngagement.title}` : ''}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Standards-linked checklists help demonstrate compliance with ISA, IFRS, and Malta regulations.
            </p>
          </SheetHeader>
          {selectedEngagement && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
                <div>
                  <div className="text-sm text-muted-foreground">Overall coverage</div>
                  <div className="text-2xl font-semibold">{binderSummary.percent}%</div>
                </div>
                <div className="w-48">
                  <Progress value={binderSummary.percent} />
                  <div className="mt-1 text-xs text-muted-foreground">
                    {binderSummary.completed} of {binderSummary.total} applicable items completed
                  </div>
                </div>
              </div>

              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">Quick evidence links</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Capture frequently referenced artifacts (FS draft, JE analytics, checklists) as evidence for approval reviews.
                  </p>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {[{
                    title: 'Financial statement draft snapshot',
                    standard: 'IAS 1',
                    control: 'Financial reporting',
                    description: 'Attach the latest FS PDF exported via Documents module.',
                    documentUrl: selectedEngagement ? `/documents?engagementId=${selectedEngagement.id}&source=fs-draft` : '#',
                  }, {
                    title: 'Journal entry analytics report',
                    standard: 'ISA 240',
                    control: 'Management override response',
                    description: 'Link JE analytics export reviewed during close.',
                    documentUrl: selectedEngagement ? `/documents?engagementId=${selectedEngagement.id}&source=je-analytics` : '#',
                  }].map((quick) => (
                    <div key={quick.title} className="rounded-lg border border-border/40 p-3 space-y-2">
                      <div className="text-sm font-medium text-foreground">{quick.title}</div>
                      <div className="text-xs text-muted-foreground">{quick.description}</div>
                      <div className="text-xs text-muted-foreground">Standard: {quick.standard}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!selectedEngagement) return;
                          const record = addEvidenceRecord({
                            title: quick.title,
                            standard: quick.standard,
                            control: quick.control,
                            documentUrl: quick.documentUrl,
                          });
                          toast({
                            title: 'Evidence added',
                            description: `${record.title} linked to ${record.standard}.`,
                          });
                        }}
                      >
                        Add as Evidence
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Tabs value={activeChecklistTab} onValueChange={(value) => setActiveChecklistTab(value as 'audit' | 'accounting' | 'tax')} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="audit">Audit</TabsTrigger>
                  <TabsTrigger value="accounting">Accounting</TabsTrigger>
                  <TabsTrigger value="tax">Tax</TabsTrigger>
                </TabsList>
                <TabsContent value="audit">
                  {renderChecklistGroup(selectedEngagement.id, auditChecklists)}
                </TabsContent>
                <TabsContent value="accounting">
                  {renderChecklistGroup(selectedEngagement.id, accountingChecklists)}
                </TabsContent>
                <TabsContent value="tax">
                  <div className="space-y-4">
                    {renderChecklistGroup(selectedEngagement.id, taxChecklists)}
                    <div className="grid gap-3 md:grid-cols-2">
                      {taxWorkingPaperLinks.map((link) => (
                        <Card key={link.title} className="border-dashed">
                          <CardHeader>
                            <CardTitle className="text-base">{link.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">{link.description}</p>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <Button variant="outline" size="sm" asChild>
                                <a href={link.href} target="_blank" rel="noopener noreferrer">
                                  Open working paper template
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (!selectedEngagement) return;
                                  const record = addEvidenceRecord({
                                    title: link.title,
                                    standard: link.title.includes('VAT') ? 'Malta VAT Act' : 'Malta Income Tax Act',
                                    control: 'Tax working paper',
                                    documentUrl: link.href,
                                  });
                                  toast({
                                    title: 'Evidence added',
                                    description: `${record.title} linked to ${record.standard}.`,
                                  });
                                }}
                              >
                                Add as Evidence
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
