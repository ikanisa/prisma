'use client';

import { AsyncBoundary } from '@/src/components/async-boundary';
import { LoadingStack } from '@/src/components/loading-skeleton';
import { AgentTaskList } from '@/src/features/agents';
import { DocumentGrid } from '@/src/features/documents';

const ErrorState = () => (
  <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive" role="alert">
    Something went wrong while loading operational data. Try refreshing the page.
  </div>
);

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

      <AsyncBoundary pendingFallback={<LoadingStack rows={4} />} errorFallback={<ErrorState />}>
        <AgentTaskList />
      </AsyncBoundary>

      <AsyncBoundary pendingFallback={<LoadingStack rows={3} />} errorFallback={<ErrorState />}>
        <DocumentGrid />
      </AsyncBoundary>
    </main>
  );
}
