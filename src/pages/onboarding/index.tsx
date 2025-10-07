import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from '@/components/file-upload';
import { useOrganizations } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/use-i18n';
import { uploadDocument } from '@/lib/documents';
import {
  startOnboarding,
  linkChecklistDocument,
  commitOnboarding,
  type OnboardingChecklist,
  type OnboardingChecklistItem,
  type OnboardingTaskSeed,
} from '@/lib/onboarding';
import { Progress } from '@/components/ui/progress';
import { ClientOnboardingAgent } from '@/components/clients/client-onboarding-agent';
import type { TaskRecord } from '@/lib/tasks';

const CATEGORY_REPO_MAP: Record<string, string> = {
  Legal: '01_Legal',
  Tax: '02_Tax',
  Accounting: '03_Accounting',
  Banking: '04_Banking',
  Payroll: '05_Payroll',
  Contracts: '06_Contracts',
  Audit: '07_Audit',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Legal: 'Corporate formation, governance, and ownership artefacts.',
  Tax: 'Registrations, assessments, and treaty documentation.',
  Accounting: 'Ledgers, policies, and trial balances needed for reporting.',
  Banking: 'Mandates and statements for cash control and reconciliations.',
  Payroll: 'Employer registrations, payroll summaries, and contracts.',
};

export default function OnboardingPage() {
  const { currentOrg } = useOrganizations();
  const { toast } = useToast();
  const { t } = useI18n();
  const [checklist, setChecklist] = useState<OnboardingChecklist | null>(null);
  const [creatingChecklist, setCreatingChecklist] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [profileSummary, setProfileSummary] = useState<Record<string, unknown> | null>(null);
  const [taskSeeds, setTaskSeeds] = useState<OnboardingTaskSeed[]>([]);
  const [seededTasks, setSeededTasks] = useState<TaskRecord[]>([]);

  const orgSlug = currentOrg?.slug ?? null;

  const groupedItems = useMemo(() => {
    if (!checklist) return [] as Array<{ category: string; items: OnboardingChecklistItem[] }>;
    const map = new Map<string, OnboardingChecklistItem[]>();
    for (const item of checklist.items) {
      const category = item.category ?? 'Other';
      const list = map.get(category) ?? [];
      list.push(item);
      map.set(category, list);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }, [checklist]);

  const canCommit = useMemo(() => {
    if (!checklist) return false;
    return checklist.items.every((item) => Boolean(item.document_id));
  }, [checklist]);

  const totalItems = checklist?.items.length ?? 0;
  const completedItems = checklist ? checklist.items.filter((item) => item.document_id).length : 0;
  const progressValue = totalItems ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleStart = useCallback(async () => {
    if (!orgSlug) {
      toast({
        title: 'Join an organisation',
        description: 'Select an organisation before starting onboarding.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setCreatingChecklist(true);
      const payload = await startOnboarding(orgSlug, 'professional_services', 'MT');
      setChecklist(payload.checklist);
      setProfileSummary(null);
      setSeededTasks([]);
      setTaskSeeds([]);
      toast({
        title: 'Checklist ready',
        description: 'Drop the core documents into each section and the assistant will do the rest.',
      });
    } catch (error) {
      toast({
        title: 'Unable to start onboarding',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setCreatingChecklist(false);
    }
  }, [orgSlug, toast]);

  const handleUpload = useCallback(
    (item: OnboardingChecklistItem) =>
      async (files: File[]) => {
        if (!orgSlug || !checklist) return;
        try {
          const repoFolder = CATEGORY_REPO_MAP[item.category] ?? '99_Other';
          for (const file of files) {
            const document = await uploadDocument(file, {
              orgSlug,
              repoFolder,
              name: `${item.label} – ${file.name}`,
            });
            const response = await linkChecklistDocument({
              checklistId: checklist.id,
              itemId: item.id,
              documentId: document.id,
            });
            setChecklist(response.checklist);
            toast({
              title: 'Document captured',
              description: `${item.label} is ready for extraction.`,
            });
          }
        } catch (error) {
          toast({
            title: 'Upload failed',
            description: (error as Error).message,
            variant: 'destructive',
          });
        }
      },
    [orgSlug, checklist, toast],
  );

  const handleCommit = useCallback(async () => {
    if (!checklist) return;
    try {
      setCommitting(true);
      const profile = {
        name: checklist.temp_entity_id,
        industry: checklist.industry,
        country: checklist.country,
      };
      const result = await commitOnboarding({ checklistId: checklist.id, profile });
      setChecklist(result.checklist);
      setProfileSummary(result.profile ?? null);
      setSeededTasks(result.tasks ?? []);
      setTaskSeeds(result.taskSeeds);
      toast({
        title: 'Onboarding committed',
        description: 'The entity profile has been drafted. Review and approve to go live.',
      });
    } catch (error) {
      toast({
        title: 'Unable to commit',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setCommitting(false);
    }
  }, [checklist, toast]);

  if (!currentOrg) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Onboarding</h1>
        <p className="mt-2 text-muted-foreground">Join or select an organisation to orchestrate onboarding.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">{t('onboarding.title')}</h1>
          <p className="text-muted-foreground">{t('onboarding.subtitle')}</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {checklist ? (
            <div className="rounded-xl border border-primary/20 bg-background/60 p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Document progress</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="min-w-[140px]">
                  <Progress value={progressValue} />
                </div>
                <span className="text-sm text-muted-foreground">
                  {completedItems}/{totalItems} ready
                </span>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={creatingChecklist || Boolean(checklist)} onClick={handleStart}>
              {t('onboarding.start')}
            </Button>
            <Badge variant="secondary">Assistant-ready</Badge>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          {checklist ? (
            <>
              <Card className="glass border-primary/20">
                <CardHeader>
                  <CardTitle>Checklist progress</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Documents attached</p>
                    <p className="text-2xl font-semibold">{completedItems}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Remaining items</p>
                    <p className="text-2xl font-semibold">{totalItems - completedItems}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Progress value={progressValue} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {completedItems} of {totalItems} checklist documents uploaded
                    </p>
                  </div>
                </CardContent>
              </Card>

              {groupedItems.map(({ category, items }) => (
                <Card key={category} className="border-border/60">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span>{category}</span>
                        <Badge variant="outline">{items.filter((item) => item.document_id).length}/{items.length}</Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {CATEGORY_DESCRIPTIONS[category] ?? 'Provide the supporting documents for this category.'}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    {items.map((item) => (
                      <div key={item.id} className="space-y-3 rounded-xl border border-border/60 bg-background p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{item.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.document_id ? 'Document captured' : 'Attach the supporting document'}
                            </p>
                          </div>
                          <Badge
                            variant={item.document_id ? 'default' : 'outline'}
                            className={item.document_id ? 'bg-emerald-500 text-white' : ''}
                          >
                            {item.document_id ? 'Ready' : 'Pending'}
                          </Badge>
                        </div>
                        <FileUpload
                          multiple={false}
                          maxSize={25}
                          onUpload={handleUpload(item)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-end">
                <Button
                  variant="gradient"
                  size="lg"
                  disabled={!canCommit || committing}
                  onClick={handleCommit}
                >
                  {committing ? 'Committing...' : 'Commit onboarding'}
                </Button>
              </div>
            </>
          ) : (
            <Card className="border-dashed border-muted-foreground/40 bg-muted/30">
              <CardContent className="py-12 text-center space-y-3">
                <h2 className="text-xl font-semibold">No checklist yet</h2>
                <p className="text-sm text-muted-foreground">
                  Kick off onboarding to generate an industry-aware checklist with drag-and-drop drop zones for every
                  document we need.
                </p>
                <Button variant="gradient" size="lg" onClick={handleStart} disabled={creatingChecklist}>
                  {creatingChecklist ? 'Creating...' : 'Start now'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-6">
          <ClientOnboardingAgent />

          {profileSummary ? (
            <Card className="glass border-primary/30">
              <CardHeader>
                <CardTitle>Drafted profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {Object.entries(profileSummary)
                  .slice(0, 8)
                  .map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium text-right">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </span>
                    </div>
                  ))}
                {Object.keys(profileSummary).length > 8 ? (
                  <p className="text-xs text-muted-foreground">Additional fields captured in the draft profile.</p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {taskSeeds.length || seededTasks.length ? (
            <Card className="border-secondary/40">
              <CardHeader>
                <CardTitle>Follow-up tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {seededTasks.length ? (
                  <div className="space-y-2">
                    {seededTasks.map((task) => (
                      <div key={task.id} className="rounded-lg border border-border/50 bg-background/70 p-3">
                        <p className="font-medium">{task.title}</p>
                        {task.description ? (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                        ) : null}
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{task.priority}</Badge>
                          {task.due_date ? <span>Due {new Date(task.due_date).toLocaleDateString()}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No follow-up tasks seeded yet.</p>
                )}
                {taskSeeds.length ? (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-semibold uppercase">Seeds</p>
                    <ul className="mt-1 space-y-1">
                      {taskSeeds.map((seed) => (
                        <li key={`${seed.title}-${seed.documentId ?? 'doc'}`}>
                          • {seed.title} ({seed.category ?? 'General'})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
