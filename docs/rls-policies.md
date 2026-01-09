# Prisma Core — RLS Policies Documentation

> **Version:** 1.0.0  
> **Date:** 2026-01-09

---

## Overview

Prisma Core uses **Row Level Security (RLS)** to ensure strict tenant isolation. Every firm-owned table restricts data access by `firm_id` via the `firm_memberships` table.

---

## Core Principle

```
User → firm_memberships → firm_id → [all firm-owned tables]
```

A user can only access data for firms where they have a membership.

---

## Table Categories

### 1. Public Read Tables

| Table | Policy | Description |
|-------|--------|-------------|
| `jurisdictions` | SELECT for all authenticated | Master list (RW, MT, CA only) |
| `jurisdiction_rulesets` | SELECT for all authenticated | Tax/compliance rules |
| `playbooks` | SELECT for all authenticated | Engagement playbooks |
| `task_templates` | SELECT for all authenticated | Task templates |
| `doc_request_templates` | SELECT for all authenticated | Document request templates |

### 2. Firm-Owned Tables (Direct)

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `firms` | Members only | N/A | ADMIN only | N/A |
| `firm_memberships` | Members + own | ADMIN only | ADMIN only | ADMIN only |
| `clients` | Members | Members | Members | ADMIN/MANAGER |
| `engagements` | Members | ADMIN/MANAGER | Members | ADMIN only |

### 3. Engagement-Owned Tables (Indirect via firm)

| Table | Access Path | SELECT | INSERT | UPDATE | DELETE |
|-------|-------------|--------|--------|--------|--------|
| `tasks` | engagement → firm | Members | Members | Members | ADMIN/MANAGER |
| `documents` | engagement → firm | Members | Members | N/A | ADMIN/MANAGER |
| `workpapers` | engagement → firm | Members | Members | Members | N/A |
| `issues` | engagement → firm | Members | Members | Members | N/A |
| `agent_runs` | engagement → firm | Members | Members | N/A | N/A |

### 4. Nested Tables (Multiple joins)

| Table | Access Path |
|-------|-------------|
| `extractions` | document → engagement → firm |
| `agent_events` | agent_run → engagement → firm |
| `approvals` | resource → engagement → firm (varies by resource_type) |

---

## Policy Details

### firms

```sql
-- Users can only see firms they're members of
CREATE POLICY "firms_select_member" ON firms FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM firm_memberships
        WHERE firm_memberships.firm_id = firms.id
        AND firm_memberships.user_id = auth.uid()
    ));

-- Only ADMINs can update firm settings
CREATE POLICY "firms_update_admin" ON firms FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM firm_memberships
        WHERE firm_memberships.firm_id = firms.id
        AND firm_memberships.user_id = auth.uid()
        AND firm_memberships.role = 'ADMIN'
    ));
```

### clients

```sql
-- Firm members can view clients
CREATE POLICY "clients_select_firm" ON clients FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM firm_memberships
        WHERE firm_memberships.firm_id = clients.firm_id
        AND firm_memberships.user_id = auth.uid()
    ));

-- Firm members can create clients
CREATE POLICY "clients_insert_firm" ON clients FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM firm_memberships
        WHERE firm_memberships.firm_id = clients.firm_id
        AND firm_memberships.user_id = auth.uid()
    ));

-- Only ADMIN/MANAGER can delete clients
CREATE POLICY "clients_delete_admin" ON clients FOR DELETE
    USING (... AND role IN ('ADMIN', 'MANAGER'));
```

### engagements

```sql
-- Only ADMIN/MANAGER can create engagements
CREATE POLICY "engagements_insert_manager" ON engagements FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM firm_memberships
        WHERE firm_memberships.firm_id = engagements.firm_id
        AND firm_memberships.user_id = auth.uid()
        AND firm_memberships.role IN ('ADMIN', 'MANAGER')
    ));
```

### tasks (via engagement)

```sql
-- Access via engagement's firm
CREATE POLICY "tasks_select_firm" ON tasks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM engagements e
        JOIN firm_memberships fm ON fm.firm_id = e.firm_id
        WHERE e.id = tasks.engagement_id
        AND fm.user_id = auth.uid()
    ));
```

---

## Role-Based Access Matrix

| Role | Firms | Memberships | Clients | Engagements | Tasks | Workpapers |
|------|-------|-------------|---------|-------------|-------|------------|
| ADMIN | View, Update | Full CRUD | Full CRUD | Full CRUD | Full CRUD | Full CRUD |
| MANAGER | View | View | CRUD | Create, Update | CRUD | CRUD |
| STAFF | View | View | View, Update | View, Update | CRUD | CRUD |

---

## Database Triggers

### Financial Institution Blocking

```sql
-- Trigger: enforce_fi_ineligibility
-- Effect: Sets eligibility_status = 'ineligible' when is_financial_institution = TRUE
CREATE TRIGGER trigger_enforce_fi_ineligibility
    BEFORE INSERT OR UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION enforce_fi_ineligibility();
```

### Engagement Eligibility Check

```sql
-- Trigger: check_client_eligibility
-- Effect: Prevents engagement creation for ineligible clients
CREATE TRIGGER trigger_check_client_eligibility
    BEFORE INSERT ON engagements
    FOR EACH ROW
    EXECUTE FUNCTION check_client_eligibility();
```

---

## Helper Functions

### is_member_of_firm

```sql
-- Check if user is member of a specific firm
SELECT is_member_of_firm(auth.uid(), 'firm-uuid-here');
-- Returns: BOOLEAN
```

### get_user_firm_ids

```sql
-- Get all firm IDs for a user
SELECT get_user_firm_ids(auth.uid());
-- Returns: UUID[]
```

### check_client_eligibility_status

```sql
-- Check if a client is eligible for engagements
SELECT * FROM check_client_eligibility_status('client-uuid-here');
-- Returns: (client_id, eligible, reason)
```

---

## Service Role Bypass

The Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses all RLS policies. This is used by the API server for:

- Agent runs
- Background jobs
- Admin operations
- Seeding data

> [!CAUTION]
> Never expose the service role key to the client. Use only on the server.

---

## Testing RLS

### Test User Isolation

```sql
-- As User A (member of Firm 1)
SELECT * FROM clients;  -- Should only see Firm 1 clients

-- As User B (member of Firm 2)
SELECT * FROM clients;  -- Should only see Firm 2 clients
```

### Test Financial Institution Blocking

```sql
-- Create financial institution client
INSERT INTO clients (firm_id, name, jurisdiction, client_segment, is_financial_institution)
VALUES ('firm-id', 'Test Bank', 'RW', 'medium', TRUE);

-- Check eligibility was set to ineligible
SELECT eligibility_status FROM clients WHERE name = 'Test Bank';
-- Expected: 'ineligible'

-- Try to create engagement (should fail)
INSERT INTO engagements (client_id, firm_id, type, period_start, period_end)
VALUES ('client-id', 'firm-id', 'audit', '2025-01-01', '2025-12-31');
-- Expected: ERROR: Cannot create engagement for ineligible client
```

---

## Performance Considerations

1. **Indexing**: All `firm_id` and `user_id` columns are indexed
2. **Join paths**: Policies use efficient join paths (e.g., `engagement → firm`)
3. **No recursive policies**: Policies don't call other policies

---

## Migration Files

| File | Description |
|------|-------------|
| `20260109000000_prisma_core_schema.sql` | Core schema with enums and triggers |
| `20260109000001_prisma_core_rls.sql` | All RLS policies |

---

## Related Documentation

- [Refactor Contract](./refactor-contract.md) — Scope and exclusions
- [Definition of Done](./definition-of-done.md) — Acceptance criteria
- [Architecture](./architecture.md) — System architecture
