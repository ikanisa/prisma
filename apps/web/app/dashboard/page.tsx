'use client';

import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';

const AgentTaskList = dynamic(
  () => import('@/src/features/agents').then((mod) => mod.AgentTaskList),
  {
    ssr: false,
    loading: () => <LazySectionFallback title="Agent tasks" />, // fallback will be defined below
  },
);

const DocumentGrid = dynamic(
  () => import('@/src/features/documents').then((mod) => mod.DocumentGrid),
  {
    ssr: false,
    loading: () => <LazySectionFallback title="Documents" />,
  },
);

function LazySectionFallback({ title }: { title: string }) {
  return (
    <section
      className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm"
      aria-busy="true"
      aria-label={`${title} loading`}
    >
      <div className="space-y-3">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
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
