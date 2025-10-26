import { AgentTaskList } from '@/src/features/agents';

// eslint-disable-next-line react-refresh/only-export-components -- Next.js metadata export required
export const metadata = {
  title: 'Agent tasks overview',
};

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

      <AgentTaskList />
    </main>
  );
}
