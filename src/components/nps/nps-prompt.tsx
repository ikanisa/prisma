import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizations } from '@/hooks/use-organizations';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/hooks/use-i18n';

const STORAGE_KEY = 'prismaglow-nps-dismissed';

interface NpsDraft {
  score: number | null;
  feedback: string;
}

export function NpsPrompt() {
  const { currentOrg } = useOrganizations();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<NpsDraft>({ score: null, feedback: '' });
  const disabled = !currentOrg || !user;

  useEffect(() => {
    if (disabled) return;
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [disabled]);

  const scoreOptions = useMemo(() => Array.from({ length: 11 }).map((_, index) => index), []);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1');
    }
    setVisible(false);
  };

  const handleSubmit = async () => {
    if (draft.score === null || !currentOrg) return;
    try {
      const response = await fetch('/api/analytics/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrg.id,
          userId: user?.id,
          score: draft.score,
          feedback: draft.feedback?.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'nps_submit_failed');
      }

      toast({ title: t('nps.toast.thanks') });
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, 'submitted');
      }
      setVisible(false);
    } catch (error) {
      toast({ title: t('nps.toast.error'), description: (error as Error).message, variant: 'destructive' });
    }
  };

  if (!visible || disabled) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key="nps"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.25 }}
        className="fixed bottom-6 right-6 z-50 w-full max-w-md"
      >
        <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur shadow-xl p-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{t('nps.prompt.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('nps.prompt.subtitle')}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {scoreOptions.map((value) => {
              const active = value === draft.score;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, score: value }))}
                  className={
                    'h-10 w-10 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ' +
                    (active ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background hover:bg-muted')
                  }
                >
                  {value}
                </button>
              );
            })}
          </div>

          <Textarea
            placeholder={t('nps.prompt.followup')}
            value={draft.feedback}
            onChange={(event) => setDraft((prev) => ({ ...prev, feedback: event.target.value }))}
            rows={3}
          />

          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={handleDismiss}>
              {t('nps.prompt.skip')}
            </Button>
            <Button variant="gradient" onClick={handleSubmit} disabled={draft.score === null}>
              {t('nps.prompt.submit')}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
