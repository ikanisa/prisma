#!/usr/bin/env python3
"""
Create Cleanup Migration Script
Generates SQL statements for cleaning up duplicate definitions
"""
from pathlib import Path
from collections import defaultdict
import re

migrations_dir = Path('supabase/migrations')

def find_cleanup_targets():
    """Find functions and enums that can be cleaned up"""
    
    # Consolidation migrations
    consolidation_migrations = {
        '20250103000000_core_functions_consolidation.sql': {
            'type': 'functions',
            'functions': ['is_member_of', 'has_min_role', 'touch_updated_at', 
                         'handle_updated_at', 'handle_new_user', 'current_user_id',
                         'update_updated_at_column']
        },
        '20250103000001_enums_consolidation.sql': {
            'type': 'enums',
            'enums': ['org_role', 'role_level', 'engagement_status', 
                     'severity_level', 'reconciliation_type', 'reconciliation_item_category']
        }
    }
    
    cleanup_needed = {
        'functions': defaultdict(list),
        'enums': defaultdict(list)
    }
    
    # Patterns
    function_pattern = re.compile(r'CREATE (?:OR REPLACE )?FUNCTION (?:(\w+)\.)?(\w+)\s*\(', re.IGNORECASE)
    enum_pattern = re.compile(r"CREATE TYPE (?:(\w+)\.)?(\w+) AS ENUM", re.IGNORECASE)
    
    for sql_file in sorted(migrations_dir.glob('*.sql')):
        if sql_file.name == '.keep':
            continue
        
        file_name = sql_file.name
        
        # Skip consolidation migrations themselves
        if file_name in consolidation_migrations:
            continue
        
        content = sql_file.read_text()
        
        # Check functions
        for match in function_pattern.finditer(content):
            schema = match.group(1) or 'public'
            func_name = match.group(2)
            
            # Check if this is a consolidated function
            if file_name == '20250103000000_core_functions_consolidation.sql':
                continue
            
            if func_name.lower() in consolidation_migrations['20250103000000_core_functions_consolidation.sql']['functions']:
                key = f"{schema}.{func_name}"
                cleanup_needed['functions'][key].append(file_name)
        
        # Check enums
        for match in enum_pattern.finditer(content):
            schema = match.group(1) or 'public'
            enum_name = match.group(2)
            
            if file_name == '20250103000001_enums_consolidation.sql':
                continue
            
            if enum_name.lower() in consolidation_migrations['20250103000001_enums_consolidation.sql']['enums']:
                key = f"{schema}.{enum_name}"
                cleanup_needed['enums'][key].append(file_name)
    
    return cleanup_needed

def generate_cleanup_documentation(cleanup_needed):
    """Generate cleanup documentation"""
    
    doc = []
    doc.append("# Migration Cleanup Documentation")
    doc.append("\n**Generated:** 2025-01-03")
    doc.append("\n**Purpose:** Document cleanup strategies for duplicate definitions")
    
    doc.append("\n## Cleanup Strategy\n")
    doc.append("\nAfter applying consolidation migrations (Phase 1 & 2), duplicate")
    doc.append("function and enum definitions can be safely ignored or removed.")
    doc.append("\n### Option 1: Leave As-Is (Recommended)\n")
    doc.append("\nSince `CREATE OR REPLACE FUNCTION` and `DO $$ BEGIN ... EXCEPTION`")
    doc.append("blocks are idempotent, duplicate definitions don't cause issues.")
    doc.append("The consolidation migrations will override older definitions.")
    doc.append("\n**Pros:**")
    doc.append("- No code changes needed")
    doc.append("- No risk of breaking migrations")
    doc.append("- Historical migration files remain intact")
    doc.append("\n**Cons:**")
    doc.append("- Code clarity (duplicate definitions visible)")
    doc.append("- Migration files larger than necessary")
    
    doc.append("\n### Option 2: Migration Repair (Safe)\n")
    doc.append("\nUse Supabase migration repair to mark migrations as reverted:")
    doc.append("\n```bash")
    doc.append("# Mark old migrations as reverted (they're superseded by consolidation)")
    doc.append("supabase migration repair --status reverted <migration_name>")
    doc.append("```")
    doc.append("\n**Pros:**")
    doc.append("- Clean migration history")
    doc.append("- No code changes to migration files")
    doc.append("- Official Supabase approach")
    doc.append("\n**Cons:**")
    doc.append("- Requires understanding which migrations to mark")
    doc.append("- Migration history changes")
    
    doc.append("\n### Option 3: Manual Cleanup (Not Recommended)\n")
    doc.append("\nManually remove duplicate CREATE statements from migration files.")
    doc.append("\n**Pros:**")
    doc.append("- Cleanest code")
    doc.append("\n**Cons:**")
    doc.append("- High risk of errors")
    doc.append("- Requires careful review")
    doc.append("- Historical changes")
    doc.append("- Not recommended for production")
    
    doc.append("\n## Functions That Can Be Cleaned Up\n")
    doc.append("\nThese functions are now defined in `20250103000000_core_functions_consolidation.sql`:\n")
    
    for func_key, files in sorted(cleanup_needed['functions'].items()):
        if files:
            doc.append(f"\n### `{func_key}`")
            doc.append(f"\nDefined in {len(files)} older migration(s):")
            for f in sorted(files):
                doc.append(f"- `{f}`")
            doc.append(f"\n**Action:** Function is now consolidated. Older definitions are safe to ignore.")
    
    doc.append("\n## Enums That Can Be Cleaned Up\n")
    doc.append("\nThese enums are now defined in `20250103000001_enums_consolidation.sql`:\n")
    
    for enum_key, files in sorted(cleanup_needed['enums'].items()):
        if files:
            doc.append(f"\n### `{enum_key}`")
            doc.append(f"\nDefined in {len(files)} older migration(s):")
            for f in sorted(files):
                doc.append(f"- `{f}`")
            doc.append(f"\n**Action:** Enum is now consolidated. Older definitions are safe to ignore.")
    
    doc.append("\n## Recommended Approach\n")
    doc.append("\n**For Now:** Leave migrations as-is (Option 1)")
    doc.append("\n- Consolidation migrations override older definitions")
    doc.append("- No risk of breaking changes")
    doc.append("- Historical migration files remain intact")
    doc.append("\n**Future Consideration:** Migration repair (Option 2)")
    doc.append("\n- After consolidation migrations are proven stable")
    doc.append("- Can clean up migration history")
    doc.append("- Use Supabase's official repair tool")
    
    return "\n".join(doc)

if __name__ == '__main__':
    print("Analyzing cleanup opportunities...")
    cleanup_needed = find_cleanup_targets()
    doc = generate_cleanup_documentation(cleanup_needed)
    
    output_file = Path('MIGRATION_CLEANUP_DOCUMENTATION.md')
    output_file.write_text(doc)
    print(f"✅ Cleanup documentation generated! Written to {output_file}")
    
    func_count = sum(len(files) for files in cleanup_needed['functions'].values())
    enum_count = sum(len(files) for files in cleanup_needed['enums'].values())
    print(f"\nFound:")
    print(f"  - Functions: {func_count} duplicate instances")
    print(f"  - Enums: {enum_count} duplicate instances")

