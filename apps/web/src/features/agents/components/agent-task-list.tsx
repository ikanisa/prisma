'use client';

import { formatDistanceToNow } from 'date-fns';
import { useAgentTasks } from '../hooks/use-agent-tasks';
import { logger } from '@/lib/logger';

const formatRelativeDate = (iso?: string | null) => {
  if (!iso) return 'No due date';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('agent_task_list.date_format_failed', { error, iso });
    }
    return 'No due date';
  }
};

const priorityBadgeClass: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-brand/10 text-brand-900',
  low: 'bg-muted text-muted-foreground',
};

export function AgentTaskList() {
  const { tasks, total, source } = useAgentTasks();

  return (
    <section aria-labelledby="agent-tasks-heading" className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="agent-tasks-heading" className="text-lg font-semibold text-foreground">
            In-flight agent tasks
          </h2>
          <p className="text-sm text-muted-foreground">
            Pulled from the unified workflow API {source === 'stub' ? '(sample data)' : ''}.
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground" aria-live="polite">
          {total} total
        </span>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {tasks.map((task) => (
          <article key={task.id} className="flex flex-col justify-between rounded-lg border border-border/80 bg-background p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{task.status}</span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${priorityBadgeClass[task.priority ?? 'medium'] ?? priorityBadgeClass.medium}`}
                >
                  {task.priority ?? 'medium'} priority
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground">{task.title}</h3>
              <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <dt className="font-medium text-foreground">Assignee</dt>
                  <dd>{task.assignee ?? 'Unassigned'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Due</dt>
                  <dd>{formatRelativeDate(task.dueDate)}</dd>
                </div>
              </dl>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Updated {formatRelativeDate(task.updatedAt)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
