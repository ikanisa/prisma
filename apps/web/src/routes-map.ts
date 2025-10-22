export interface RouteMapEntry {
  path: string;
  file: string;
  featureArea: string;
  description: string;
}

export const ROUTE_MAP: RouteMapEntry[] = [
  { path: '/', file: 'app/page.tsx', featureArea: 'marketing', description: 'Public landing page entry point.' },
  { path: '/dashboard', file: 'app/dashboard/page.tsx', featureArea: 'workspace', description: 'Operational control tower dashboard.' },
  { path: '/agent-chat', file: 'app/agent-chat/page.tsx', featureArea: 'agents', description: 'Realtime agent orchestration console.' },
  { path: '/agent/approvals', file: 'app/agent/approvals/page.tsx', featureArea: 'agents', description: 'Tool approvals and governance.' },
  { path: '/agent/tasks', file: 'app/agent/tasks/page.tsx', featureArea: 'agents', description: 'Unified agent task telemetry rendered with React Query + Zustand.' },
  { path: '/agent/orchestrator', file: 'app/agent/orchestrator/page.tsx', featureArea: 'agents', description: 'Low-level orchestrator session viewer.' },
  { path: '/audit/controls', file: 'app/audit/controls/page.tsx', featureArea: 'audit', description: 'Controls library and walkthrough automation.' },
  { path: '/audit/other-info', file: 'app/audit/other-info/page.tsx', featureArea: 'audit', description: 'Other information readiness workspace.' },
  { path: '/accounting', file: 'app/accounting/page.tsx', featureArea: 'accounting', description: 'Accounting control room modules and close workspace.' },
  { path: '/client-portal', file: 'app/client-portal/page.tsx', featureArea: 'client-portal', description: 'Client portal entry point.' },
  { path: '/style-guide', file: 'app/style-guide/page.tsx', featureArea: 'design-system', description: 'Design tokens and component usage reference.' },
];

export type RouteMap = typeof ROUTE_MAP;
