# Migration Cleanup Guide

> **P3-4 FIX: Documentation for migration squashing**

---

## Current State

- **Total migrations:** 155+
- **Older migrations:** Many small incremental changes
- **Recommendation:** Squash pre-2025 migrations into baseline

---

## Squashing Strategy

### Phase 1: Create Baseline

1. **Identify cutoff date:** All migrations before `20250101` are candidates
2. **Generate current schema:**
   ```bash
   supabase db dump -f schema_baseline.sql --schema=public
   ```
3. **Create baseline migration:**
   ```bash
   mv schema_baseline.sql supabase/migrations/00000000000000_baseline.sql
   ```

### Phase 2: Archive Old Migrations

```bash
# Create archive directory
mkdir -p supabase/migrations_archive

# Move old migrations (keeping them for reference)
mv supabase/migrations/20241* supabase/migrations_archive/
mv supabase/migrations/20250[1-9]* supabase/migrations_archive/
```

### Phase 3: Test on Fresh Database

```bash
# Reset and apply
supabase db reset
supabase db push

# Verify schema matches
supabase db diff --file verify_schema.sql
```

---

## Migrations to Consolidate

### Duplicate/Overlapping Patterns

| Pattern | Count | Action |
|---------|-------|--------|
| `*_enums_consolidation.sql` | 2+ | Merge into single |
| `*_core_functions*.sql` | 3+ | Merge |
| `*_rls*.sql` | 20+ | Keep separate (modular) |
| `*_accounting_kb*.sql` | 5+ | Merge into single |

### Safe to Consolidate

- Enum definitions
- Index creation scripts
- Seed data
- Deprecated feature tables

### Keep Separate

- RLS policies (easier to audit)
- Feature-specific schemas
- Security patches

---

## Rollback Considerations

### Before Squashing

1. Export current schema as reference
2. Document all custom functions
3. Backup RLS policies separately
4. Test on staging first

### Rollback Script Template

```sql
-- Rollback template for migration XXXXXX
-- Run this to undo the migration

BEGIN;

-- Drop new tables
DROP TABLE IF EXISTS new_table CASCADE;

-- Restore old columns
ALTER TABLE existing_table DROP COLUMN IF EXISTS new_column;

-- Restore old functions
DROP FUNCTION IF EXISTS new_function();

COMMIT;
```

---

## CI Integration

Add to CI pipeline:

```yaml
# .github/workflows/migration-check.yml
name: Migration Check

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check migration count
        run: |
          COUNT=$(ls supabase/migrations/*.sql | wc -l)
          if [ $COUNT -gt 200 ]; then
            echo "::warning::Migration count ($COUNT) exceeds threshold. Consider squashing."
          fi
      
      - name: Check for conflicts
        run: |
          # Check for duplicate object names
          grep -h "CREATE TABLE" supabase/migrations/*.sql | \
            sort | uniq -d > /tmp/duplicates.txt
          if [ -s /tmp/duplicates.txt ]; then
            echo "::error::Duplicate table definitions found"
            cat /tmp/duplicates.txt
            exit 1
          fi
```

---

## Timeline

| Phase | Duration | Risk |
|-------|----------|------|
| Planning | 1 day | Low |
| Baseline creation | 2 hours | Low |
| Testing | 1 day | Medium |
| Production rollout | 1 hour | Low |

---

## Related Documents

- `BACKUP_RESTORE.md` - Backup before cleanup
- `RUNBOOK.md` - Operational procedures
