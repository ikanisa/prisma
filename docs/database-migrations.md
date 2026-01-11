# Database Migration Strategy

## Overview

This project uses **Supabase migrations** as the single source of truth for database schema management.

## Migration Location

All migrations are stored in:
```
supabase/migrations/
```

## Running Migrations

### Local Development
```bash
# Start Supabase locally
supabase start

# Apply migrations
supabase db reset

# Create new migration
supabase migration new <migration_name>
```

### Production
Migrations are automatically applied when using Supabase hosted service via the Dashboard or CLI:
```bash
supabase db push --linked
```

## Migration Best Practices

1. **Never edit existing migrations** - Create new migrations for changes
2. **Test locally first** - Use `supabase db reset` to verify
3. **Include RLS policies** - All tables should have appropriate policies
4. **Add to version control** - Commit migration files with code changes

## RLS Policy Testing

RLS policies are tested using pgTAP tests located in:
```
supabase/tests/rls/
```

Run tests with:
```bash
psql $DATABASE_URL -f supabase/tests/rls/rls_policy_tests.sql
```

## Rollback Strategy

For emergency rollbacks, see [Disaster Recovery Runbook](./runbooks/disaster-recovery.md).

---

> [!NOTE]
> This project previously had references to Prisma migrations but now uses only Supabase migrations for schema management. This resolves Audit Blocker #4.
