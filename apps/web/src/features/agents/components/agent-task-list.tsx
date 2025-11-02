'use client';

import { formatDistanceToNow } from 'date-fns';
import { memo, useCallback, useMemo } from 'react';
import { useAgentTasks } from '../hooks/use-agent-tasks';
import type { AgentTask } from '../services/task-service';
import { logger } from '@/lib/logger';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18nContext } from '@/i18n/I18nProvider';

const PRIORITY_BADGE_CLASS: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-brand/10 text-brand-900',
  low: 'bg-muted text-muted-foreground',
};

const PRIORITY_TRANSLATION_KEYS: Record<'high' | 'medium' | 'low', string> = {
  high: 'agents.tasks.priority.high',
  medium: 'agents.tasks.priority.medium',
  low: 'agents.tasks.priority.low',
};

const LOADING_PLACEHOLDERS = Array.from({ length: 4 });

function AgentTaskListComponent() {
  const { tasks, total, source, isPending } = useAgentTasks();
  const { t } = useI18nContext();

  const formatRelativeDate = useCallback((iso: string | null | undefined, fallback: string) => {
    if (!iso) return fallback;
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('agent_task_list.date_format_failed', { error, iso });
      }
      return fallback;
    }
  }, []);

  const resolvePriorityLabel = useCallback(
    (priority?: string | null) => {
      const fallbackRaw = (priority ?? 'medium').toLowerCase();
      const normalized = fallbackRaw as keyof typeof PRIORITY_TRANSLATION_KEYS;
      const key = PRIORITY_TRANSLATION_KEYS[normalized] ?? PRIORITY_TRANSLATION_KEYS.medium;
      const translated = t(key);
      if (translated === key) {
        return fallbackRaw.charAt(0).toUpperCase() + fallbackRaw.slice(1);
      }
      return translated;
    },
    [t],
  );

  const heading = useMemo(() => t('agents.tasks.title'), [t]);
  const sampleTag = useMemo(() => (source === 'stub' ? ` ${t('common.sampleDataTag')}` : ''), [source, t]);
  const subtitle = useMemo(() => t('agents.tasks.subtitle', { sampleTag }), [sampleTag, t]);
  const totalLabel = useMemo(() => t('agents.tasks.total', { count: String(total) }), [t, total]);

  if (isPending) {
    return (
      <section
        className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm"
        aria-labelledby="agent-tasks-heading"
        aria-busy="true"
      >
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {LOADING_PLACEHOLDERS.map((_, index) => (
            <article key={`agent-task-skeleton-${index}`} className="space-y-4 rounded-lg border border-border/80 bg-background p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
                <Skeleton className="h-5 w-48" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-3 w-32" />
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="agent-tasks-heading" className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="agent-tasks-heading" className="text-lg font-semibold text-foreground">
            {heading}
          </h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground" aria-live="polite">
          {totalLabel}
        </span>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {tasks.map((task: AgentTask) => (
          <article key={task.id} className="flex flex-col justify-between rounded-lg border border-border/80 bg-background p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{task.status}</span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    PRIORITY_BADGE_CLASS[task.priority ?? 'medium'] ?? PRIORITY_BADGE_CLASS.medium
                  }`}
                >
                  {t('agents.tasks.priorityLabel', {
                    priority: resolvePriorityLabel(task.priority),
                  })}
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground">{task.title}</h3>
              <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <dt className="font-medium text-foreground">{t('common.assignee')}</dt>
                  <dd>{task.assignee ?? t('common.unassigned')}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">{t('common.due')}</dt>
                  <dd>{formatRelativeDate(task.dueDate, t('tasks.noDueDate'))}</dd>
                </div>
              </dl>
            </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {t('agents.tasks.updated', {
                  when: formatRelativeDate(task.updatedAt),
                })}
              </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export const AgentTaskList = memo(AgentTaskListComponent);
AgentTaskList.displayName = 'AgentTaskList';
