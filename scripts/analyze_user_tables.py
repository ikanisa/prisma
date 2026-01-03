#!/usr/bin/env python3
"""
User Table Analysis Script
Analyzes all user-related tables to plan consolidation
"""
import re
from pathlib import Path
from collections import defaultdict

migrations_dir = Path('supabase/migrations')

def analyze_user_tables():
    """Analyze user table structures"""
    
    user_tables = {
        'profiles': {},
        'users': {},
        'app_users': {},
        'memberships': {},
        'members': {}
    }
    
    table_pattern = re.compile(r'CREATE TABLE (?:IF NOT EXISTS )?(?:(\w+)\.)?(\w+)\s*\(', re.IGNORECASE | re.MULTILINE)
    column_pattern = re.compile(r'^\s+(\w+)\s+([^,\(\)]+?)(?:,|\))', re.MULTILINE)
    
    for sql_file in sorted(migrations_dir.glob('*.sql')):
        if sql_file.name == '.keep':
            continue
        
        content = sql_file.read_text()
        
        # Find user-related tables
        for table_match in table_pattern.finditer(content):
            schema = table_match.group(1) or 'public'
            table_name = table_match.group(2).lower()
            
            if table_name not in ['profiles', 'users', 'app_users', 'memberships', 'members']:
                continue
            
            key = f"{schema}.{table_name}"
            if key not in user_tables.get(table_name, {}):
                user_tables[table_name][key] = {
                    'file': sql_file.name,
                    'schema': schema,
                    'columns': {},
                    'raw_definition': ''
                }
            
            # Extract table definition
            table_start = table_match.end()
            # Find matching closing parenthesis
            paren_count = 1
            i = table_start
            while i < len(content) and paren_count > 0:
                if content[i] == '(':
                    paren_count += 1
                elif content[i] == ')':
                    paren_count -= 1
                i += 1
            table_block = content[table_start:i-1]
            
            user_tables[table_name][key]['raw_definition'] = table_block
            
            # Extract columns
            for col_match in column_pattern.finditer(table_block):
                col_name = col_match.group(1).strip()
                col_type = col_match.group(2).strip()
                
                # Skip constraint keywords
                if col_name.upper() in ['CONSTRAINT', 'PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK']:
                    continue
                
                user_tables[table_name][key]['columns'][col_name] = col_type
    
    return user_tables

def generate_user_table_report(user_tables):
    """Generate analysis report"""
    
    report = []
    report.append("# User Table Analysis Report")
    report.append("\n**Generated:** 2025-01-03")
    report.append("\n**Purpose:** Analyze user-related tables for consolidation planning")
    
    report.append("\n## Current User Tables\n")
    
    for table_name in ['profiles', 'users', 'app_users']:
        if table_name in user_tables and user_tables[table_name]:
            report.append(f"\n### {table_name.upper()}\n")
            for key, data in user_tables[table_name].items():
                report.append(f"\n#### `{key}`")
                report.append(f"- **Defined In:** `{data['file']}`")
                report.append(f"- **Schema:** `{data['schema']}`")
                report.append(f"- **Columns:** {len(data['columns'])}")
                report.append(f"\n**Column Definitions:**")
                for col_name, col_type in sorted(data['columns'].items()):
                    report.append(f"  - `{col_name}`: `{col_type}`")
                report.append(f"\n**Raw Definition (first 500 chars):**")
                report.append(f"```sql")
                report.append(data['raw_definition'][:500])
                report.append("```")
    
    report.append("\n## Membership Tables\n")
    
    for table_name in ['memberships', 'members']:
        if table_name in user_tables and user_tables[table_name]:
            report.append(f"\n### {table_name.upper()}\n")
            for key, data in user_tables[table_name].items():
                report.append(f"\n#### `{key}`")
                report.append(f"- **Defined In:** `{data['file']}`")
                report.append(f"- **Schema:** `{data['schema']}`")
                report.append(f"- **Columns:** {len(data['columns'])}")
                report.append(f"\n**Column Definitions:**")
                for col_name, col_type in sorted(data['columns'].items()):
                    report.append(f"  - `{col_name}`: `{col_type}`")
    
    report.append("\n## Consolidation Strategy\n")
    report.append("\n### Target Schema\n")
    report.append("\n**Consolidated User Table: `public.users`**\n")
    report.append("```sql")
    report.append("CREATE TABLE public.users (")
    report.append("  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,")
    report.append("  email TEXT UNIQUE NOT NULL,")
    report.append("  name TEXT,")
    report.append("  full_name TEXT,")
    report.append("  avatar_url TEXT,")
    report.append("  is_system_admin BOOLEAN DEFAULT false,")
    report.append("  role TEXT,")
    report.append("  metadata JSONB DEFAULT '{}'::jsonb,")
    report.append("  created_at TIMESTAMPTZ DEFAULT now(),")
    report.append("  updated_at TIMESTAMPTZ DEFAULT now()")
    report.append(");")
    report.append("```")
    
    report.append("\n**Consolidated Membership Table: `public.memberships`**\n")
    report.append("```sql")
    report.append("CREATE TABLE public.memberships (")
    report.append("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),")
    report.append("  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,")
    report.append("  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,")
    report.append("  role public.org_role NOT NULL DEFAULT 'EMPLOYEE',")
    report.append("  created_at TIMESTAMPTZ DEFAULT now(),")
    report.append("  updated_at TIMESTAMPTZ DEFAULT now(),")
    report.append("  UNIQUE(org_id, user_id)")
    report.append(");")
    report.append("```")
    
    return "\n".join(report)

if __name__ == '__main__':
    print("Analyzing user tables...")
    user_tables = analyze_user_tables()
    report = generate_user_table_report(user_tables)
    
    output_file = Path('USER_TABLE_ANALYSIS.md')
    output_file.write_text(report)
    print(f"✅ Analysis complete! Report written to {output_file}")
    
    for table_name in ['profiles', 'users', 'app_users', 'memberships', 'members']:
        if table_name in user_tables:
            count = len(user_tables[table_name])
            print(f"  - {table_name}: {count} definition(s)")

