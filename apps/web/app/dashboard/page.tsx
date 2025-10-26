'use client';

import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { AgentTaskList } from '@/src/features/agents';
import { DocumentGrid } from '@/src/features/documents';

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
