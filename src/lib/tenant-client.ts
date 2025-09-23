import { supabase } from '@/integrations/supabase/client';

const ORG_SCOPED_TABLES = [
  'clients',
  'documents',
  'engagements',
  'group_components',
  'group_instructions',
  'component_workpapers',
  'component_reviews',
  'notifications',
  'tasks',
  'activity_log',
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
  return new TenantClient(orgId);
}
