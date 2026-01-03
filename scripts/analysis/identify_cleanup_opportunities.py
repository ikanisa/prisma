#!/usr/bin/env python3
"""
Identify Cleanup Opportunities
Finds safe-to-remove duplicate definitions after consolidation migrations
"""
import re
from pathlib import Path
from collections import defaultdict

migrations_dir = Path('supabase/migrations')

def analyze_cleanup_opportunities():
    """Identify safe cleanup opportunities"""
    
    # Consolidation migrations
    consolidation_migrations = {
        '20250103000000_core_functions_consolidation.sql': 'functions',
        '20250103000001_enums_consolidation.sql': 'enums'
    }
    
    functions = defaultdict(list)
    enums = defaultdict(list)
    tables = defaultdict(list)
    
    # Patterns
    function_pattern = re.compile(r'CREATE (?:OR REPLACE )?FUNCTION (?:(\w+)\.)?(\w+)\s*\(', re.IGNORECASE)
    enum_pattern = re.compile(r"CREATE TYPE (?:(\w+)\.)?(\w+) AS ENUM", re.IGNORECASE)
    table_pattern = re.compile(r'CREATE TABLE (?:IF NOT EXISTS )?(?:(\w+)\.)?(\w+)', re.IGNORECASE)
    
    # Core functions that are now consolidated
    consolidated_functions = {
        'is_member_of', 'has_min_role', 'touch_updated_at', 'handle_updated_at',
        'handle_new_user', 'current_user_id', 'update_updated_at_column'
    }
    
    # Core enums that are now consolidated
    consolidated_enums = {
        'org_role', 'role_level', 'engagement_status', 'severity_level',
        'reconciliation_type', 'reconciliation_item_category'
    }
    
    for sql_file in sorted(migrations_dir.glob('*.sql')):
        if sql_file.name == '.keep':
            continue
        
        content = sql_file.read_text()
        file_name = sql_file.name
        
        # Skip consolidation migrations themselves
        if file_name in consolidation_migrations:
            continue
        
        # Functions
        for match in function_pattern.finditer(content):
            schema = match.group(1) or 'public'
            func_name = match.group(2)
            key = f"{schema}.{func_name}"
            
            if func_name.lower() in consolidated_functions or func_name in consolidated_functions:
                functions[key].append(file_name)
        
        # Enums
        for match in enum_pattern.finditer(content):
            schema = match.group(1) or 'public'
            enum_name = match.group(2)
            key = f"{schema}.{enum_name}"
            
            if enum_name.lower() in consolidated_enums or enum_name in consolidated_enums:
                enums[key].append(file_name)
        
        # Tables (for future analysis)
        for match in table_pattern.finditer(content):
            schema = match.group(1) or 'public'
            table_name = match.group(2)
            key = f"{schema}.{table_name}"
            tables[key].append(file_name)
    
    return functions, enums, tables

def generate_cleanup_report(functions, enums, tables):
    """Generate cleanup recommendations"""
    
    report = []
    report.append("# Cleanup Opportunities Report")
    report.append("\n**Generated:** 2025-01-03")
    report.append("\n**Purpose:** Identify duplicate definitions that can be removed after consolidation migrations")
    
    report.append("\n## Summary\n")
    report.append(f"- **Functions to Clean Up:** {len([f for f, files in functions.items() if files])}")
    report.append(f"- **Enums to Clean Up:** {len([e for e, files in enums.items() if files])}")
    
    report.append("\n## Functions Safe to Remove\n")
    report.append("\n⚠️ **IMPORTANT:** Only remove these AFTER applying consolidation migrations:")
    report.append("- `20250103000000_core_functions_consolidation.sql`")
    report.append("\nThese functions are now defined in the consolidation migration.\n")
    
    for func_key, files in sorted(functions.items()):
        if files:
            report.append(f"\n### `{func_key}`")
            report.append(f"**Defined in {len(files)} older migration(s):**")
            for f in sorted(files):
                report.append(f"- `{f}`")
            report.append(f"\n**Action:** Remove CREATE FUNCTION statement from above files")
            report.append(f"(Function is now in `20250103000000_core_functions_consolidation.sql`)")
    
    report.append("\n## Enums Safe to Remove\n")
    report.append("\n⚠️ **IMPORTANT:** Only remove these AFTER applying consolidation migrations:")
    report.append("- `20250103000001_enums_consolidation.sql`")
    report.append("\nThese enums are now defined in the consolidation migration.\n")
    
    for enum_key, files in sorted(enums.items()):
        if files:
            report.append(f"\n### `{enum_key}`")
            report.append(f"**Defined in {len(files)} older migration(s):**")
            for f in sorted(files):
                report.append(f"- `{f}`")
            report.append(f"\n**Action:** Remove CREATE TYPE statement from above files")
            report.append(f"(Enum is now in `20250103000001_enums_consolidation.sql`)")
    
    report.append("\n## Cleanup Strategy\n")
    report.append("\n### Option 1: Migration Repair (Recommended)\n")
    report.append("Use Supabase migration repair to mark migrations as reverted:\n")
    report.append("```bash")
    report.append("# Mark specific migrations as reverted (after consolidation)")
    report.append("supabase migration repair --status reverted <migration_name>")
    report.append("```")
    
    report.append("\n### Option 2: Manual Cleanup\n")
    report.append("Manually remove duplicate CREATE statements from older migrations.\n")
    report.append("⚠️ **Warning:** This requires careful review and testing.\n")
    
    report.append("\n### Option 3: Create New Cleanup Migration\n")
    report.append("Create a new migration that removes old definitions:\n")
    report.append("```sql")
    report.append("-- This approach is NOT recommended for functions/enums")
    report.append("-- as they may already be in use")
    report.append("```")
    
    report.append("\n## Recommended Approach\n")
    report.append("\n1. **Apply Consolidation Migrations First**")
    report.append("   - Ensure `20250103000000_core_functions_consolidation.sql` is applied")
    report.append("   - Ensure `20250103000001_enums_consolidation.sql` is applied")
    
    report.append("\n2. **Verify Functions/Enums Work**")
    report.append("   - Test application functionality")
    report.append("   - Verify RLS policies still work")
    
    report.append("\n3. **Use Migration Repair (Safest)**")
    report.append("   - Mark old migrations as reverted")
    report.append("   - This removes them from active migration history")
    report.append("   - No code changes needed")
    
    report.append("\n4. **Alternative: Leave As-Is**")
    report.append("   - CREATE OR REPLACE functions are idempotent")
    report.append("   - DO blocks with exception handling are idempotent")
    report.append("   - Duplicate definitions don't cause issues")
    report.append("   - Cleanup is optional for code clarity")
    
    return "\n".join(report)

if __name__ == '__main__':
    print("Identifying cleanup opportunities...")
    functions, enums, tables = analyze_cleanup_opportunities()
    report = generate_cleanup_report(functions, enums, tables)
    
    output_file = Path('CLEANUP_OPPORTUNITIES_REPORT.md')
    output_file.write_text(report)
    print(f"✅ Analysis complete! Report written to {output_file}")
    
    func_count = sum(len(files) for files in functions.values() if files)
    enum_count = sum(len(files) for files in enums.values() if files)
    print(f"\nFound:")
    print(f"  - Functions to clean up: {func_count} instances")
    print(f"  - Enums to clean up: {enum_count} instances")

