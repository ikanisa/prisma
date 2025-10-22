import { AsyncBoundary } from '@/src/components/async-boundary';
import { LoadingStack } from '@/src/components/loading-skeleton';
import { AgentTaskList } from '@/src/features/agents';

export const metadata = {
  title: 'Agent tasks overview',
};

const ErrorState = () => (
  <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive" role="alert">
    Unable to load tasks from the workflow API.
  </div>
);

export default function AgentTasksPage() {
  return (
    <main className="space-y-6 bg-background p-6" aria-labelledby="agent-tasks-heading">
      <header className="space-y-2">
        <h1 id="agent-tasks-heading" className="text-2xl font-semibold text-foreground">
          Agent task intelligence
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          View the latest agent-created tasks with live status, assignee and due-date signals sourced from the unified API
          client.
        </p>
      </header>

      <AsyncBoundary pendingFallback={<LoadingStack rows={5} />} errorFallback={<ErrorState />}>
        <AgentTaskList />
      </AsyncBoundary>
    </main>
  );
}
