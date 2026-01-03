#!/usr/bin/env python3
"""
Comprehensive migration file fixer for Supabase migrations.
Fixes common SQL syntax errors:
1. CREATE POLICY statements missing ON table_name
2. CREATE TRIGGER statements with syntax issues
3. Invalid DROP ... CASCADE syntax
4. Invalid CREATE TRIGGER syntax (trigger_name.function())
"""

import re
from pathlib import Path
from typing import List, Tuple

def fix_create_policy(content: str) -> Tuple[str, int]:
    """Fix CREATE POLICY statements missing ON table_name."""
    fixes = 0
    
    # Pattern: CREATE POLICY "name" followed by FOR without ON table_name
    # We need to find the DROP POLICY above to get the table name
    lines = content.split('\n')
    result = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        result.append(line)
        
        # Check if this is a DROP POLICY line with table name
        drop_match = re.match(r'DROP POLICY IF EXISTS "([^"]+)" ON ([\w\.]+);', line)
        if drop_match:
            policy_name = drop_match.group(1)
            table_name = drop_match.group(2)
            i += 1
            
            # Check if next non-empty line is CREATE POLICY for same policy
            j = i
            while j < len(lines) and not lines[j].strip():
                result.append(lines[j])
                j += 1
            
            if j < len(lines):
                create_match = re.match(r'CREATE POLICY "([^"]+)"\s*$', lines[j])
                if create_match and create_match.group(1) == policy_name:
                    # Check if next line starts with FOR (missing ON clause)
                    if j + 1 < len(lines) and re.match(r'\s*FOR\s+', lines[j + 1]):
                        # Add ON table_name
                        result.append(f'CREATE POLICY "{policy_name}" ON {table_name}')
                        i = j + 1
                        fixes += 1
                        continue
        
        i += 1
    
    return '\n'.join(result), fixes

def fix_create_trigger(content: str) -> Tuple[str, int]:
    """Fix CREATE TRIGGER statements with syntax issues."""
    fixes = 0
    
    # Fix 1: CREATE TRIGGER name.function() -> CREATE TRIGGER name ON table ...
    content = re.sub(
        r'CREATE TRIGGER (\w+)\.(\w+)\(\)',
        r'CREATE TRIGGER \1\n  ON \2\n  FOR EACH ROW EXECUTE FUNCTION \2()',
        content
    )
    if 'CREATE TRIGGER' in content and 'trigger_name.function()' not in content:
        fixes += content.count('CREATE TRIGGER')
    
    # Fix 2: CREATE TRIGGER without ON table_name (needs BEFORE/AFTER UPDATE)
    lines = content.split('\n')
    result = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        result.append(line)
        
        # Check if this is a DROP TRIGGER line
        drop_match = re.match(r'DROP TRIGGER IF EXISTS (\w+) ON ([\w\.]+);', line)
        if drop_match:
            trigger_name = drop_match.group(1)
            table_name = drop_match.group(2)
            i += 1
            
            # Skip empty lines
            while i < len(lines) and not lines[i].strip():
                result.append(lines[i])
                i += 1
            
            if i < len(lines):
                create_match = re.match(r'CREATE TRIGGER (\w+)\s*$', lines[i])
                if create_match and create_match.group(1) == trigger_name:
                    # Check if next line is ON or FOR EACH ROW (missing timing)
                    if i + 1 < len(lines):
                        next_line = lines[i + 1]
                        if re.match(r'\s*ON\s+', next_line):
                            # Has ON, might be missing BEFORE/AFTER
                            result.append(f'CREATE TRIGGER {trigger_name}')
                            i += 1
                            continue
                        elif re.match(r'\s*FOR EACH ROW', next_line):
                            # Missing ON table_name and timing
                            # For updated_at triggers, use BEFORE UPDATE
                            if 'updated_at' in trigger_name.lower() or 'touch' in trigger_name.lower():
                                result.append(f'CREATE TRIGGER {trigger_name}')
                                result.append(f'  BEFORE UPDATE ON {table_name}')
                            else:
                                result.append(f'CREATE TRIGGER {trigger_name}')
                                result.append(f'  ON {table_name}')
                            fixes += 1
                            i += 1
                            continue
        
        i += 1
    
    return '\n'.join(result), fixes

def fix_drop_cascade(content: str) -> Tuple[str, int]:
    """Remove invalid DROP ... ON table CASCADE syntax."""
    fixes = 0
    
    # Pattern: DROP POLICY/TRIGGER ... ON table_name CASCADE; (invalid)
    # Should be: DROP POLICY/TRIGGER ... ON table_name; (CASCADE not valid for POLICY/TRIGGER)
    patterns = [
        (r'DROP POLICY IF EXISTS "[^"]+" ON ([a-z_]+) CASCADE;', r'DROP POLICY IF EXISTS "\1" ON \1;'),
        (r'DROP TRIGGER IF EXISTS (\w+) ON ([a-z_]+) CASCADE;', r'DROP TRIGGER IF EXISTS \1 ON \2;'),
    ]
    
    for pattern, replacement in patterns:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            fixes += len(re.findall(pattern, content))
            content = new_content
    
    # More specific: DROP POLICY/TRIGGER ... ON table CASCADE (without schema)
    content = re.sub(
        r'DROP (POLICY IF EXISTS "[^"]+"|TRIGGER IF EXISTS \w+) ON ([a-z_]+) CASCADE;',
        r'DROP \1 ON \2;',
        content
    )
    
    return content, fixes

def fix_migration_file(file_path: Path) -> dict:
    """Fix all issues in a migration file."""
    content = file_path.read_text()
    original_content = content
    total_fixes = 0
    fixes_applied = []
    
    # Fix 1: Invalid DROP CASCADE (do this first)
    content, fixes = fix_drop_cascade(content)
    if fixes > 0:
        fixes_applied.append(f"Removed {fixes} invalid DROP CASCADE statements")
        total_fixes += fixes
    
    # Fix 2: CREATE POLICY missing ON
    content, fixes = fix_create_policy(content)
    if fixes > 0:
        fixes_applied.append(f"Fixed {fixes} CREATE POLICY statements")
        total_fixes += fixes
    
    # Fix 3: CREATE TRIGGER syntax
    content, fixes = fix_create_trigger(content)
    if fixes > 0:
        fixes_applied.append(f"Fixed {fixes} CREATE TRIGGER statements")
        total_fixes += fixes
    
    # Fix 4: Invalid CREATE TRIGGER syntax (trigger_name.function())
    before_count = content.count('CREATE TRIGGER')
    content = re.sub(
        r'CREATE TRIGGER (\w+)\.(\w+)\(\)',
        lambda m: f'CREATE TRIGGER {m.group(1)}\n  ON table_name\n  FOR EACH ROW EXECUTE FUNCTION {m.group(2)}()',
        content
    )
    if before_count != content.count('CREATE TRIGGER'):
        fixes_applied.append("Fixed invalid CREATE TRIGGER syntax")
        total_fixes += 1
    
    if content != original_content:
        file_path.write_text(content)
        return {
            'file': file_path.name,
            'fixed': True,
            'fixes': fixes_applied,
            'total': total_fixes
        }
    
    return {
        'file': file_path.name,
        'fixed': False,
        'fixes': [],
        'total': 0
    }

def main():
    migrations_dir = Path('supabase/migrations')
    results = []
    
    for sql_file in sorted(migrations_dir.glob('*.sql')):
        if sql_file.name == '.keep':
            continue
        result = fix_migration_file(sql_file)
        results.append(result)
    
    # Report
    fixed_files = [r for r in results if r['fixed']]
    total_fixes = sum(r['total'] for r in results)
    
    print(f"\n{'='*60}")
    print(f"Migration Fix Summary")
    print(f"{'='*60}")
    print(f"Files scanned: {len(results)}")
    print(f"Files fixed: {len(fixed_files)}")
    print(f"Total fixes applied: {total_fixes}")
    
    if fixed_files:
        print(f"\nFixed files:")
        for result in fixed_files[:20]:  # Show first 20
            print(f"  - {result['file']}: {', '.join(result['fixes'])}")
        if len(fixed_files) > 20:
            print(f"  ... and {len(fixed_files) - 20} more files")

if __name__ == '__main__':
    main()

