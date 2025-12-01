import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export interface AgentToolRecord {
  id: string;
  organizationId: string | null;
  name: string;
  slug: string;
  description: string;
  category: string;
  implementationType: string;
  implementationConfig?: Record<string, unknown> | null;
  requiredPermissions?: unknown;
  rateLimit?: number | null;
  costPerCall?: number | null;
  isDestructive: boolean;
  requiresConfirmation: boolean;
  auditLevel?: string | null;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
  usage_count?: number;
  avg_latency_ms?: number;
}

type AgentToolRow = Database['public']['Tables']['agent_tools']['Row'];

const friendlyId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

const mapAgentToolRow = (row: AgentToolRow): AgentToolRecord => ({
  id: row?.id ?? friendlyId(),
  organizationId: (row as any)?.organization_id ?? null,
  name: row?.name ?? '',
  slug: row?.slug ?? '',
  description: row?.description ?? '',
  category: row?.category ?? 'general',
  implementationType: row?.implementation_type ?? 'function',
  implementationConfig: (row as any)?.implementation_config ?? null,
  requiredPermissions: (row as any)?.required_permissions ?? [],
  rateLimit: (row as any)?.rate_limit ?? null,
  costPerCall: (row as any)?.cost_per_call ?? null,
  isDestructive: Boolean(row?.is_destructive),
  requiresConfirmation: Boolean(row?.requires_confirmation),
  auditLevel: (row as any)?.audit_level ?? null,
  status: row?.status ?? 'active',
  createdAt: row?.created_at ?? new Date().toISOString(),
  updatedAt: row?.updated_at ?? null,
  usage_count: (row as any)?.usage_count ?? 0,
  avg_latency_ms: (row as any)?.avg_latency_ms ?? null,
});

const MOCK_AGENT_TOOLS: AgentToolRecord[] = [
  {
    id: '1',
    organizationId: 'mock-org',
    name: 'Web Search',
    slug: 'web-search',
    description: 'Search the web for information using various search engines',
    category: 'Search',
    implementationType: 'api_call',
    implementationConfig: { provider: 'google' },
    isDestructive: false,
    requiresConfirmation: false,
    status: 'active',
    createdAt: '2024-01-15T00:00:00Z',
    usage_count: 1250,
    avg_latency_ms: 450,
  },
  {
    id: '2',
    organizationId: 'mock-org',
    name: 'Document Analysis',
    slug: 'document-analysis',
    description: 'Analyze and extract information from uploaded documents',
    category: 'Analysis',
    implementationType: 'function',
    implementationConfig: { model: 'gpt-4o' },
    isDestructive: false,
    requiresConfirmation: false,
    status: 'active',
    createdAt: '2024-01-20T00:00:00Z',
    usage_count: 890,
    avg_latency_ms: 1200,
  },
  {
    id: '3',
    organizationId: 'mock-org',
    name: 'Email Sender',
    slug: 'email-sender',
    description: 'Send emails to specified recipients',
    category: 'Communication',
    implementationType: 'api_call',
    implementationConfig: { provider: 'sendgrid' },
    isDestructive: true,
    requiresConfirmation: true,
    status: 'active',
    createdAt: '2024-02-01T00:00:00Z',
    usage_count: 340,
    avg_latency_ms: 200,
  },
  {
    id: '4',
    organizationId: 'mock-org',
    name: 'Task Creator',
    slug: 'task-creator',
    description: 'Create tasks and assign them to team members',
    category: 'Productivity',
    implementationType: 'database_query',
    implementationConfig: { table: 'tasks' },
    isDestructive: false,
    requiresConfirmation: false,
    status: 'active',
    createdAt: '2024-02-10T00:00:00Z',
    usage_count: 567,
    avg_latency_ms: 150,
  },
  {
    id: '5',
    organizationId: 'mock-org',
    name: 'Calculator',
    slug: 'calculator',
    description: 'Perform mathematical calculations',
    category: 'Utility',
    implementationType: 'function',
    isDestructive: false,
    requiresConfirmation: false,
    status: 'active',
    createdAt: '2024-01-10T00:00:00Z',
    usage_count: 2100,
    avg_latency_ms: 50,
  },
];

export async function getAgentTools(orgId?: string | null): Promise<AgentToolRecord[]> {
  if (!isSupabaseConfigured) {
    return MOCK_AGENT_TOOLS;
  }

  let query = supabase.from('agent_tools').select('*');

  if (orgId) {
    query = query.eq('organization_id', orgId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapAgentToolRow);
}

export { MOCK_AGENT_TOOLS };
