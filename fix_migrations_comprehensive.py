#!/usr/bin/env python3
"""
Comprehensive migration file fixer - improved version
Fixes CREATE POLICY statements missing ON clauses by analyzing DROP POLICY statements above them.
"""

import re
from pathlib import Path

def fix_create_policy_with_drop_context(content: str) -> tuple:
    """Fix CREATE POLICY statements by looking at preceding DROP POLICY for table name."""
    lines = content.split('\n')
    result = []
    i = 0
    fixes = 0
    last_drop_info = None  # (policy_name, table_name)
    
    while i < len(lines):
        line = lines[i]
        
        # Track DROP POLICY statements
        drop_match = re.match(r'DROP POLICY IF EXISTS "([^"]+)" ON ([\w\.]+);', line.strip())
        if drop_match:
            last_drop_info = (drop_match.group(1), drop_match.group(2))
            result.append(line)
            i += 1
            continue
        
        # Check if this is CREATE POLICY that might need fixing
        create_match = re.match(r'CREATE POLICY "([^"]+)"\s*$', line.strip())
        if create_match and last_drop_info:
            policy_name = create_match.group(1)
            drop_policy_name, table_name = last_drop_info
            
            # If policy names match and next line starts with FOR, we need to add ON
            if policy_name == drop_policy_name and i + 1 < len(lines):
                next_line = lines[i + 1]
                if re.match(r'\s*FOR\s+', next_line):
                    # Add ON table_name
                    result.append(f'CREATE POLICY "{policy_name}" ON {table_name}')
                    fixes += 1
                    i += 1
                    last_drop_info = None  # Reset
                    continue
        
        # Reset drop info if we hit a comment or blank line (might be unrelated)
        if line.strip() and not line.strip().startswith('--'):
            if not create_match:
                last_drop_info = None
        
        result.append(line)
        i += 1
    
    return '\n'.join(result), fixes

def fix_all_migration_files():
    """Fix all migration files with CREATE POLICY issues."""
    migrations_dir = Path('supabase/migrations')
    total_fixes = 0
    fixed_files = []
    
    # Files known to have CREATE POLICY issues from the scan
    files_to_fix = [
        '001_initial_schema.sql',
        '20250829090000_5ea29147-38dc-4b92-9f17-7dc59a6c4647.sql',
        '20250902094731_.sql',
        '20250902094733_6d37821e-f5a7-4a21-8a7c-ff8c208c2d2a.sql',
        '20250921090001_backfill_core_tables.sql',
        '20250925221000_idempotency_keys_patch.sql',
        '20251018133000_phase1_rls_hardening.sql',
        '20251111090000_audit_ctrl1_ada1_rec1.sql',
        '20251115122000_web_fetch_cache.sql',
        '20251128000000_comprehensive_rls_policies.sql',
        '20251215120000_notification_dispatch_queue_system_settings_rls.sql',
        '20260201000000_comprehensive_agent_portal.sql',
        '20260201170000_specialist_agent_executions.sql',
    ]
    
    for filename in files_to_fix:
        file_path = migrations_dir / filename
        if file_path.exists():
            content = file_path.read_text()
            new_content, fixes = fix_create_policy_with_drop_context(content)
            if fixes > 0:
                file_path.write_text(new_content)
                total_fixes += fixes
                fixed_files.append((filename, fixes))
                print(f"Fixed {fixes} CREATE POLICY statements in {filename}")
    
    print(f"\nTotal: Fixed {total_fixes} CREATE POLICY statements across {len(fixed_files)} files")
    return total_fixes, fixed_files

if __name__ == '__main__':
    fix_all_migration_files()

