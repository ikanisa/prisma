# AAT Database Layer - Setup & Operations

## Overview

This document describes the AAT (Autonomous Audit · Accounting · Tax) production-grade database schema implemented in Supabase Postgres with pgvector support.

## Schema Structure

The database implements a multi-tenant architecture with strict row-level security (RLS) based on organization membership. Key components:

- **Core tenancy**: Organizations, app_users, members with role-based access
- **RAG & AI**: Documents, chunks with vector embeddings, agent sessions/logs
- **Audit (ISA/ISQM)**: Engagements, risks, controls, tests, materiality, KAMs
- **Accounting (IFRS)**: Chart of accounts, transactions, journal entries, vendors
- **Tax**: VAT rules, returns, VIES checks, CIT computations
- **Portal/PBC**: Client portal sessions and PBC request management

## Deployment Instructions

### Step 1: Apply Core Schema
Open the Supabase SQL Editor and run the migrations in order:

1. **Bootstrap Schema** (`0001_aat_bootstrap.sql`):
   ```sql
   -- Paste the entire content of 0001_aat_bootstrap.sql
   ```
   This creates all extensions, types, tables, indexes, RLS policies, and helper functions.

2. **Demo Data** (`0002_aat_seed_demo.sql`):
   ```sql
   -- Paste the entire content of 0002_aat_seed_demo.sql
   ```
   This seeds a demo organization with sample data.

3. **Storage Buckets** (`0003_storage_buckets.sql`) [Optional]:
   ```sql
   -- Paste the entire content of 0003_storage_buckets.sql
   ```
   This creates storage buckets for file uploads with org-scoped RLS.

### Step 2: Link Real Auth User

After running the migrations, you need to link a real authenticated user:

1. Create a user via Supabase Auth (either through your app or the Supabase dashboard)
2. Copy the user's UUID from `auth.users`
3. Update and re-run this block in the SQL editor:

```sql
do $$
declare
  v_org uuid;
  v_user uuid := 'YOUR_REAL_USER_UUID_HERE'::uuid; -- Replace with actual UUID
begin
  select id into v_org from organizations where slug='demo';
  
  insert into app_users(user_id,email,full_name)
  values (v_user,'your-email@example.com','Your Name') 
  on conflict (user_id) do nothing;
  
  insert into members(org_id,user_id,role) 
  values (v_org,v_user,'admin')
  on conflict (org_id,user_id) do nothing;
  
  raise notice 'User % linked to org demo as admin', v_user;
end $$;
```

## API Key Management

To create API keys for programmatic access:

```sql
-- Create an API key (only org admins can do this)
select * from app.create_api_key('demo','Gateway API Key','{}'::jsonb);
```

**Important**: The plaintext key is only shown once. Store it securely. The database only stores a SHA-256 hash.

## Testing & Verification

### Verify Schema Deployment
```sql
-- Check table counts
select 'orgs' as t, count(*) from organizations where slug='demo';
select 'coa' as t, count(*) from chart_of_accounts where org_id=(select id from organizations where slug='demo');
select 'vendors' as t, count(*) from vendors where org_id=(select id from organizations where slug='demo');
select 'transactions' as t, count(*) from transactions where org_id=(select id from organizations where slug='demo');
select 'vat_rules' as t, count(*) from vat_rules where org_id=(select id from organizations where slug='demo');
select 'documents' as t, count(*) from documents where org_id=(select id from organizations where slug='demo');
```

### Test RLS Policies
```sql
-- Test org membership function
select app.is_org_member((select id from organizations where slug='demo'), 'staff');

-- Test role permissions
select app.is_org_admin((select id from organizations where slug='demo'));
```

### Test RAG Components
```sql
-- Check vector index exists
select indexname from pg_indexes where tablename = 'chunks' and indexdef like '%ivfflat%';

-- Test chunk content hashing
select id, content_hash from chunks limit 5;
```

## Common Operations

### Add New Organization
```sql
insert into organizations(slug, name, plan) 
values ('new-org', 'New Organization', 'professional');
```

### Add User to Organization
```sql
insert into members(org_id, user_id, role)
select org.id, 'USER_UUID'::uuid, 'staff'::org_role
from organizations org where org.slug = 'new-org';
```

### Embed Documents (External Process)
The schema includes placeholders for embeddings. Your RAG ingestion service should:
1. Insert documents via the `documents` table
2. Chunk content and insert into `chunks` table
3. Generate embeddings and update the `embedding` column
4. Update `last_embedded_at` timestamp

## Security Considerations

1. **RLS Enforcement**: All tables have RLS enabled. Policies enforce org-scoped access.
2. **API Keys**: Only SHA-256 hashes stored, never plaintext.
3. **Role Hierarchy**: admin > manager > staff > client
4. **Service Role**: Use with caution - bypasses RLS entirely.

## Storage Organization

If using storage buckets, organize files as:
```
aat-intake/org/{org_id}/documents/
aat-intake/org/{org_id}/uploads/
aat-exports/org/{org_id}/reports/
```

## Troubleshooting

### Vector Index Issues
If the vector index creation fails:
```sql
-- Manually create with appropriate list count
create index idx_chunks_vec on chunks 
using ivfflat (embedding vector_cosine_ops) 
with (lists=100);
```

### RLS Policy Debugging
```sql
-- Check if user has org membership
select m.*, u.email 
from members m 
join app_users u on u.user_id = m.user_id 
where m.user_id = auth.uid();
```

### Performance Tuning
For large datasets, consider:
- Increasing vector index lists parameter
- Adding additional indexes on frequently queried columns
- Partitioning large tables by org_id

## Maintenance

1. **Backup**: Regular pg_dump backups of the entire database
2. **Vector Index**: Rebuild periodically for optimal performance
3. **Cleanup**: Remove expired portal_sessions and old agent_logs
4. **Monitoring**: Track chunk embedding completion rates

## Next Steps

After deployment:
1. Connect your RAG ingestion service to populate embeddings
2. Implement agent routing using the session/log tables
3. Build client portal using PBC request/item tables
4. Set up automated VAT return generation
5. Configure audit workflow management