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
} from '@/lib/onboarding';

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
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={creatingChecklist || Boolean(checklist)} onClick={handleStart}>
            {t('onboarding.start')}
          </Button>
          <Badge variant="secondary">Assistant-ready</Badge>
        </div>
      </header>

      {!checklist ? (
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
      ) : null}

      {checklist ? (
        <div className="grid gap-6">
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
        </div>
      ) : null}

      {checklist ? (
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
      ) : null}
    </motion.div>
  );
}
