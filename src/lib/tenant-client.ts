import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

const ORG_SCOPED_TABLES = [
  'clients',
  'documents',
  'engagements',
  'notifications',
  'tasks',
  'activity_log',
  'kam_candidates',
  'kam_drafts',
  'audit_planned_procedures',
  'audit_evidence',
  'estimate_register',
  'going_concern_worksheets',
  'controls',
  'control_walkthroughs',
  'control_tests',
  'itgc_groups',
  'deficiencies',
  'client_background_checks',
  'independence_assessments',
  'acceptance_decisions',
  'approval_queue',
  'audit_report_drafts',
  'tcwg_packs',
  'engagement_archives',
  'pbc_requests',
  'pbc_deliveries',
  'agent_profiles',
  'knowledge_corpora',
  'knowledge_sources',
  'learning_runs',
  'knowledge_events',
  'agent_feedback',
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
