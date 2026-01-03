#!/usr/bin/env python3
"""
Comprehensive database schema analysis for refactoring recommendations
"""
import re
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime

migrations_dir = Path('supabase/migrations')

def analyze_schema():
    """Comprehensive schema analysis"""
    
    tables = defaultdict(lambda: {'files': [], 'columns': set(), 'schema': 'public'})
    functions = defaultdict(lambda: {'files': [], 'signatures': set()})
    enums = defaultdict(lambda: {'files': [], 'values': set()})
    
    # Key patterns
    table_pattern = re.compile(r'CREATE TABLE (?:IF NOT EXISTS )?(?:(\w+)\.)?(\w+)', re.IGNORECASE)
    function_pattern = re.compile(r'CREATE (?:OR REPLACE )?FUNCTION (?:(\w+)\.)?(\w+)\s*\([^)]*\)', re.IGNORECASE)
    enum_pattern = re.compile(r"CREATE TYPE (?:(\w+)\.)?(\w+) AS ENUM\s*\(([^)]+)\)", re.IGNORECASE)
    
    for sql_file in sorted(migrations_dir.glob('*.sql')):
        if sql_file.name == '.keep':
            continue
        
        content = sql_file.read_text()
        
        # Tables
        for match in table_pattern.finditer(content):
            schema = match.group(1) or 'public'
            table_name = match.group(2)
            key = f"{schema}.{table_name}" if schema else table_name
            tables[key]['files'].append(sql_file.name)
            tables[key]['schema'] = schema or 'public'
        
        # Functions
        for match in function_pattern.finditer(content):
            schema = match.group(1) or 'public'
            func_name = match.group(2)
            key = f"{schema}.{func_name}" if schema else func_name
            functions[key]['files'].append(sql_file.name)
            functions[key]['signatures'].add(match.group(0)[:100])
        
        # Enums
        for match in enum_pattern.finditer(content):
            schema = match.group(1) or 'public'
            enum_name = match.group(2)
            enum_values = match.group(3)
            key = f"{schema}.{enum_name}" if schema else enum_name
            enums[key]['files'].append(sql_file.name)
            enums[key]['values'].add(enum_values)
    
    return tables, functions, enums

def identify_issues(tables, functions, enums):
    """Identify consolidation opportunities"""
    
    issues = {
        'duplicate_tables': [],
        'duplicate_functions': [],
        'duplicate_enums': [],
        'schema_inconsistencies': [],
        'naming_inconsistencies': []
    }
    
    # Check for duplicates
    for name, data in tables.items():
        if len(data['files']) > 1:
            issues['duplicate_tables'].append({
                'name': name,
                'files': data['files'],
                'count': len(data['files'])
            })
    
    for name, data in functions.items():
        if len(data['files']) > 1:
            issues['duplicate_functions'].append({
                'name': name,
                'files': data['files'],
                'count': len(data['files'])
            })
    
    for name, data in enums.items():
        if len(data['files']) > 1:
            issues['duplicate_enums'].append({
                'name': name,
                'files': data['files'],
                'values': list(data['values']),
                'count': len(data['files'])
            })
    
    # Check for naming inconsistencies
    user_tables = [name for name in tables.keys() if 'user' in name.lower() or 'profile' in name.lower()]
    org_tables = [name for name in tables.keys() if 'organization' in name.lower() or 'org' in name.lower()]
    
    if len(user_tables) > 1:
        issues['naming_inconsistencies'].append({
            'type': 'user_tables',
            'tables': user_tables
        })
    
    if len(org_tables) > 1:
        issues['naming_inconsistencies'].append({
            'type': 'organization_tables',
            'tables': org_tables
        })
    
    return issues

def generate_report(tables, functions, enums, issues):
    """Generate comprehensive report"""
    
    report = []
    report.append("# Database Schema Refactoring Analysis Report")
    report.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"\nTotal Migration Files Analyzed: {len(list(migrations_dir.glob('*.sql')))}")
    
    report.append(f"\n## Executive Summary")
    report.append(f"\n- **Total Tables**: {len(tables)}")
    report.append(f"- **Total Functions**: {len(functions)}")
    report.append(f"- **Total Enums**: {len(enums)}")
    report.append(f"- **Duplicate Table Definitions**: {len(issues['duplicate_tables'])}")
    report.append(f"- **Duplicate Function Definitions**: {len(issues['duplicate_functions'])}")
    report.append(f"- **Duplicate Enum Definitions**: {len(issues['duplicate_enums'])}")
    
    report.append(f"\n## Critical Issues")
    report.append(f"\n### 1. Duplicate Table Definitions")
    for dup in sorted(issues['duplicate_tables'], key=lambda x: x['count'], reverse=True)[:20]:
        report.append(f"\n#### {dup['name']}")
        report.append(f"- Defined in {dup['count']} migration files:")
        for file in dup['files']:
            report.append(f"  - {file}")
    
    report.append(f"\n### 2. Duplicate Function Definitions")
    for dup in sorted(issues['duplicate_functions'], key=lambda x: x['count'], reverse=True)[:20]:
        report.append(f"\n#### {dup['name']}")
        report.append(f"- Defined in {dup['count']} migration files:")
        for file in dup['files']:
            report.append(f"  - {file}")
    
    report.append(f"\n### 3. Naming Inconsistencies")
    for inc in issues['naming_inconsistencies']:
        report.append(f"\n#### {inc['type']}")
        for table in inc['tables']:
            report.append(f"  - {table}")
    
    return "\n".join(report)

if __name__ == '__main__':
    tables, functions, enums = analyze_schema()
    issues = identify_issues(tables, functions, enums)
    report = generate_report(tables, functions, enums, issues)
    print(report)

