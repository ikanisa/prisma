'use client';

import { AgentTaskList } from '@/src/features/agents';
import { DocumentGrid } from '@/src/features/documents';

export default function Dashboard() {
  return (
    <main className="space-y-8 bg-background p-6" aria-labelledby="dashboard-heading">
      <header className="space-y-2">
        <h1 id="dashboard-heading" className="text-2xl font-semibold text-foreground">
          Engagement command centre
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Monitor agent workflows, review recent knowledge captures, and manage outstanding evidence from a single
          workspace backed by the unified query and state layer.
        </p>
      </header>

      <AgentTaskList />

      <DocumentGrid />
    </main>
  );
}
