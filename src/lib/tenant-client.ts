import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

/**
 * IMPORTANT:
 * - Include only tables that have an `org_id` column.
 * - Tables like `soc1_reports`, `soc1_cuecs`, `soc1_residual_risk_notes`, `knowledge_sources`
 *   do NOT have `org_id` and are intentionally excluded from this org-scoped registry.
 */
const ORG_SCOPED_TABLES = [
  // Core domain
  'clients',
  'documents',
  'engagements',
  'controls',
  'materiality_sets',
  'risks',
  'kams',

  // Reconciliation / group audit (with org_id)
  'group_components',
  'group_instructions',
  'component_workpapers',
  'component_reviews',

  // Ops & workflow
  'tasks',
  'notifications',
  'pbc_requests',
  'pbc_items',
  'policies',
  'portal_sessions',
  'errors',
  'idempotency_keys',
  'ingest_jobs',

  // Ledger & accounting
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

  // Agents & knowledge (only those with org_id)
  'agent_profiles',
  'agent_feedback',
  'agent_logs',
  'agent_sessions',
  'knowledge_corpora',
  'knowledge_events',
  'learning_runs',

  // Misc tables with org_id
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

  // Service org registry (has org_id)
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
