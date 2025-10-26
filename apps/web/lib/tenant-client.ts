import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

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

  private from(table: OrgScopedTable) {
    if (!ORG_SCOPED_TABLES.includes(table)) {
      throw new Error(`Table ${table as string} is not registered as org-scoped.`);
    }
    return supabase.from(table as any) as any;
  }

  select(table: OrgScopedTable, columns = '*') {
    return this.from(table).select(columns).eq('org_id', this.orgId);
  }

  selectSingle(table: OrgScopedTable, columns = '*') {
    return this.from(table).select(columns).eq('org_id', this.orgId).maybeSingle();
  }

  insert(table: OrgScopedTable, values: Record<string, unknown>) {
    return this.from(table).insert({ ...values, org_id: this.orgId });
  }

  update(table: OrgScopedTable, values: Record<string, unknown>) {
    return this.from(table).update(values).eq('org_id', this.orgId);
  }

  delete(table: OrgScopedTable) {
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
