#!/usr/bin/env python3
"""Fix CREATE TRIGGER statements missing ON table_name and BEFORE/AFTER clauses."""

import re
from pathlib import Path

def fix_triggers_in_file(file_path: Path) -> int:
    """Fix CREATE TRIGGER statements in a file."""
    content = file_path.read_text()
    lines = content.split('\n')
    result = []
    i = 0
    fixes = 0
    last_drop_info = None  # (trigger_name, table_name)
    
    while i < len(lines):
        line = lines[i]
        result.append(line)
        
        # Track DROP TRIGGER statements
        drop_match = re.match(r'DROP TRIGGER IF EXISTS (\w+) ON ([\w\.]+);', line.strip())
        if drop_match:
            last_drop_info = (drop_match.group(1), drop_match.group(2))
            i += 1
            continue
        
        # Check if this is CREATE TRIGGER that might need fixing
        create_match = re.match(r'CREATE TRIGGER (\w+)\s*$', line.strip())
        if create_match and last_drop_info:
            trigger_name = create_match.group(1)
            drop_trigger_name, table_name = last_drop_info
            
            # If trigger names match
            if trigger_name == drop_trigger_name:
                # Look ahead to see what's next
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    
                    # Pattern 1: Next line is "ON function_name" (wrong - should be table_name)
                    wrong_on_match = re.match(r'ON\s+(\w+)\s*$', next_line)
                    if wrong_on_match and 'touch' in wrong_on_match.group(1).lower():
                        # This is wrong - replace with proper syntax
                        result[-1] = f'CREATE TRIGGER {trigger_name}'
                        result.append(f'  BEFORE UPDATE ON {table_name}')
                        fixes += 1
                        i += 1  # Skip the wrong ON line
                        last_drop_info = None
                        continue
                    
                    # Pattern 2: Next line starts with FOR EACH ROW (missing ON table_name)
                    elif re.match(r'FOR EACH ROW', next_line):
                        # Add ON table_name and timing
                        result[-1] = f'CREATE TRIGGER {trigger_name}'
                        if 'updated_at' in trigger_name.lower() or 'touch' in trigger_name.lower():
                            result.append(f'  BEFORE UPDATE ON {table_name}')
                        else:
                            result.append(f'  ON {table_name}')
                        fixes += 1
                        i += 1
                        last_drop_info = None
                        continue
        
        # Reset drop info if we hit unrelated content
        if line.strip() and not line.strip().startswith('--'):
            if not create_match:
                last_drop_info = None
        
        i += 1
    
    if fixes > 0:
        file_path.write_text('\n'.join(result))
    
    return fixes

def main():
    migrations_dir = Path('supabase/migrations')
    total_fixes = 0
    fixed_files = []
    
    for sql_file in sorted(migrations_dir.glob('*.sql')):
        if sql_file.name == '.keep':
            continue
        fixes = fix_triggers_in_file(sql_file)
        if fixes > 0:
            total_fixes += fixes
            fixed_files.append((sql_file.name, fixes))
            print(f"Fixed {fixes} CREATE TRIGGER statements in {sql_file.name}")
    
    print(f"\nTotal: Fixed {total_fixes} CREATE TRIGGER statements across {len(fixed_files)} files")
    return total_fixes, fixed_files

if __name__ == '__main__':
    main()

