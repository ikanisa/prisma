'use client';

import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Skeleton } from '@/components/ui/skeleton';

const AgentTaskList = dynamic(() => import('@/src/features/agents').then((mod) => mod.AgentTaskList), {
  ssr: false,
  loading: () => <AgentTaskListFallback />,
});

const DocumentGrid = dynamic(() => import('@/src/features/documents').then((mod) => mod.DocumentGrid), {
  ssr: false,
  loading: () => <DocumentGridFallback />,
});

function AgentTaskListFallback() {
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
        {[...Array(2)].map((_, index) => (
          <article key={`agent-task-fallback-${index}`} className="space-y-3 rounded-lg border border-border/80 bg-background p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </article>
        ))}
      </div>
    </section>
  );
}

function DocumentGridFallback() {
  return (
    <section
      className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm"
      aria-labelledby="documents-heading"
      aria-busy="true"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, index) => (
          <article key={`document-grid-fallback-${index}`} className="space-y-3 rounded-lg border border-border/80 bg-background p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-24" />
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Engagement control"
        title="Engagement command centre"
        description="Monitor agent workflows, review recent knowledge captures, and manage outstanding evidence from a single workspace backed by the unified query and state layer."
      />

      <AgentTaskList />

      <DocumentGrid />
    </PageShell>
  );
}
