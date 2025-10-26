import type { Database } from '@prisma-glow/platform/supabase/types';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

type DatabaseTable = keyof Database['public']['Tables'];
type SupabaseSelectResult = {
  maybeSingle(): Promise<unknown>;
  [key: string]: unknown;
};

type SupabaseTableOperations = {
  select(columns?: string): { eq(column: string, value: string): SupabaseSelectResult };
  insert(values: Record<string, unknown>): unknown;
  update(values: Record<string, unknown>): { eq(column: string, value: string): unknown };
  delete(): { eq(column: string, value: string): unknown };
};

const ORG_SCOPED_TABLES = [
  'clients',
  'documents',
  'engagements',
  'controls',
  'materiality_sets',
  'risks',
  'kams',
  'group_components',
  'group_instructions',
  'component_workpapers',
  'component_reviews',
  'tasks',
  'notifications',
  'pbc_requests',
  'pbc_items',
  'policies',
  'portal_sessions',
  'errors',
  'idempotency_keys',
  'ingest_jobs',
  'accounting',
  'journal_entries',
  'journal_lines',
  'chart_of_accounts',
  'transactions',
  'vendors',
  'vendor_category_mappings',
  'tax',
  'vat_rules',
  'vat_returns',
  'vies_checks',
  'agent_profiles',
  'agent_feedback',
  'agent_logs',
  'agent_sessions',
  'knowledge_corpora',
  'knowledge_events',
  'learning_runs',
  'activity_log',
  'acceptance_decisions',
  'categories',
  'chunks',
  'client_background_checks',
  'cit_computations',
  'independence_assessments',
  'approval_queue',
  'members',
  'memberships',
  'misstatements',
  'samples',
  'tests',
  'workpapers',
  'service_orgs',
] as const;

export type OrgScopedTable = (typeof ORG_SCOPED_TABLES)[number];

export class TenantClient {
  constructor(private readonly orgId: string) {}

  private from<TableName extends OrgScopedTable>(table: TableName): SupabaseTableOperations {
    if (!ORG_SCOPED_TABLES.includes(table)) {
      throw new Error(`Table ${table as string} is not registered as org-scoped.`);
    }
    return supabase.from(table as DatabaseTable) as unknown as SupabaseTableOperations;
  }

  select<TableName extends OrgScopedTable>(table: TableName, columns = '*'): SupabaseSelectResult {
    return this.from(table).select(columns).eq('org_id', this.orgId);
  }

  selectSingle<TableName extends OrgScopedTable>(table: TableName, columns = '*'): Promise<unknown> {
    return this.from(table).select(columns).eq('org_id', this.orgId).maybeSingle();
  }

  insert<TableName extends OrgScopedTable>(table: TableName, values: Record<string, unknown>): unknown {
    return this.from(table).insert({ ...values, org_id: this.orgId });
  }

  update<TableName extends OrgScopedTable>(table: TableName, values: Record<string, unknown>): unknown {
    return this.from(table).update(values).eq('org_id', this.orgId);
  }

  delete<TableName extends OrgScopedTable>(table: TableName): unknown {
    return this.from(table).delete().eq('org_id', this.orgId);
  }
}

export function createTenantClient(orgId: string) {
  if (!isSupabaseConfigured) {
    return {
      select: async () => ({ data: [], error: new Error('Supabase is not configured'), status: 400 }),
      selectSingle: async () => ({ data: null, error: new Error('Supabase is not configured'), status: 400 }),
      insert: async () => ({ data: null, error: new Error('Supabase is not configured'), status: 400 }),
      update: async () => ({ data: null, error: new Error('Supabase is not configured'), status: 400 }),
      delete: async () => ({ data: null, error: new Error('Supabase is not configured'), status: 400 }),
    } as unknown as TenantClient;
  }

  return new TenantClient(orgId);
}
