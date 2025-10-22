export interface FeatureRoute {
  route: string;
  feature: string;
  component: string;
  description?: string;
}

export const featureRoutes: FeatureRoute[] = [
  {
    route: '/agent/orchestrator',
    feature: 'agents:orchestrator',
    component: '@/src/features/agents/orchestrator/AgentOrchestratorPage',
    description: 'Interactive console for planning, launching, and supervising multi-agent orchestration sessions.',
  },
  {
    route: '/agent/domain-tools',
    feature: 'agents:domain-tools',
    component: '@/app/agent/domain-tools/page',
    description: 'Toolkit for exploring domain agent capabilities, retrieval catalogues, and MCP utilities.',
  },
  {
    route: '/agent-chat',
    feature: 'agents:chat',
    component: '@/app/agent-chat/page',
    description: 'Conversation workspace for interacting with MCP agents and reviewing transcripts.',
  },
  {
    route: '/dashboard',
    feature: 'core:dashboard',
    component: '@/app/dashboard/page',
    description: 'Landing view for finance, audit, and compliance modules with navigation into domain-specific workspaces.',
  },
];
