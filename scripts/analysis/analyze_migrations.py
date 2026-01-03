#!/usr/bin/env python3
"""
Migration Analysis Script
Analyzes migration dependencies, table references, and identifies cleanup opportunities
"""
import re
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import json

migrations_dir = Path('supabase/migrations')

def analyze_migrations():
    """Comprehensive migration analysis"""
    
    migrations = []
    tables = defaultdict(lambda: {'first_seen': None, 'files': [], 'dependencies': set()})
    functions = defaultdict(lambda: {'first_seen': None, 'files': []})
    enums = defaultdict(lambda: {'first_seen': None, 'files': []})
    foreign_keys = []
    
    # Patterns
    table_pattern = re.compile(r'CREATE TABLE (?:IF NOT EXISTS )?(?:(\w+)\.)?(\w+)', re.IGNORECASE)
    function_pattern = re.compile(r'CREATE (?:OR REPLACE )?FUNCTION (?:(\w+)\.)?(\w+)\s*\(', re.IGNORECASE)
    enum_pattern = re.compile(r"CREATE TYPE (?:(\w+)\.)?(\w+) AS ENUM", re.IGNORECASE)
    fk_pattern = re.compile(r'REFERENCES (?:(\w+)\.)?(\w+)\((\w+)\)', re.IGNORECASE)
    alter_fk_pattern = re.compile(r'ALTER TABLE.*ADD.*FOREIGN KEY.*REFERENCES (?:(\w+)\.)?(\w+)', re.IGNORECASE)
    
    # Process all migrations
    for sql_file in sorted(migrations_dir.glob('*.sql')):
        if sql_file.name == '.keep':
            continue
        
        content = sql_file.read_text()
        migrations.append(sql_file.name)
        
        # Tables
        for match in table_pattern.finditer(content):
            schema = match.group(1) or 'public'
            table_name = match.group(2)
            key = f"{schema}.{table_name}"
            if not tables[key]['first_seen']:
                tables[key]['first_seen'] = sql_file.name
            tables[key]['files'].append(sql_file.name)
        
        # Functions
        for match in function_pattern.finditer(content):
            schema = match.group(1) or 'public'
            func_name = match.group(2)
            key = f"{schema}.{func_name}"
            if not functions[key]['first_seen']:
                functions[key]['first_seen'] = sql_file.name
            functions[key]['files'].append(sql_file.name)
        
        # Enums
        for match in enum_pattern.finditer(content):
            schema = match.group(1) or 'public'
            enum_name = match.group(2)
            key = f"{schema}.{enum_name}"
            if not enums[key]['first_seen']:
                enums[key]['first_seen'] = sql_file.name
            enums[key]['files'].append(sql_file.name)
        
        # Foreign keys (in CREATE TABLE)
        for match in fk_pattern.finditer(content):
            ref_schema = match.group(1) or 'public'
            ref_table = match.group(2)
            ref_col = match.group(3)
            foreign_keys.append({
                'file': sql_file.name,
                'ref_table': f"{ref_schema}.{ref_table}",
                'ref_column': ref_col
            })
        
        # Foreign keys (in ALTER TABLE)
        for match in alter_fk_pattern.finditer(content):
            ref_schema = match.group(1) or 'public'
            ref_table = match.group(2)
            foreign_keys.append({
                'file': sql_file.name,
                'ref_table': f"{ref_schema}.{ref_table}",
                'ref_column': 'id'
            })
    
    return migrations, tables, functions, enums, foreign_keys

def build_dependency_graph(tables, foreign_keys):
    """Build dependency graph for tables"""
    dependencies = defaultdict(set)
    dependents = defaultdict(set)
    
    for fk in foreign_keys:
        ref_table = fk['ref_table']
        # Find which table contains this FK
        for table_key in tables.keys():
            if ref_table in table_key or table_key in ref_table:
                # This is a dependency
                dependencies[table_key].add(ref_table)
                dependents[ref_table].add(table_key)
    
    return dependencies, dependents

def generate_report(migrations, tables, functions, enums, foreign_keys, dependencies, dependents):
    """Generate comprehensive analysis report"""
    
    report = []
    report.append("# Migration Analysis Report")
    report.append(f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"\n**Total Migrations:** {len(migrations)}")
    
    # Statistics
    duplicate_tables = {k: v for k, v in tables.items() if len(v['files']) > 1}
    duplicate_functions = {k: v for k, v in functions.items() if len(v['files']) > 1}
    duplicate_enums = {k: v for k, v in enums.items() if len(v['files']) > 1}
    
    report.append(f"\n## Executive Summary\n")
    report.append(f"- **Total Tables:** {len(tables)}")
    report.append(f"- **Duplicate Table Definitions:** {len(duplicate_tables)}")
    report.append(f"- **Total Functions:** {len(functions)}")
    report.append(f"- **Duplicate Function Definitions:** {len(duplicate_functions)}")
    report.append(f"- **Total Enums:** {len(enums)}")
    report.append(f"- **Duplicate Enum Definitions:** {len(duplicate_enums)}")
    report.append(f"- **Foreign Key Relationships:** {len(foreign_keys)}")
    
    # Table Analysis
    report.append(f"\n## Table Analysis\n")
    report.append(f"\n### All Tables ({len(tables)} total)\n")
    for table_key in sorted(tables.keys()):
        data = tables[table_key]
        report.append(f"\n#### `{table_key}`")
        report.append(f"- **First Seen:** `{data['first_seen']}`")
        report.append(f"- **Defined In:** {len(data['files'])} file(s)")
        if len(data['files']) > 1:
            report.append(f"- **⚠️ DUPLICATE** - Defined in multiple files:")
            for f in data['files']:
                report.append(f"  - `{f}`")
        if table_key in dependencies:
            report.append(f"- **Dependencies:** {', '.join(sorted(dependencies[table_key]))}")
        if table_key in dependents:
            report.append(f"- **Dependents:** {', '.join(sorted(dependents[table_key]))}")
    
    # Function Analysis
    report.append(f"\n## Function Analysis\n")
    report.append(f"\n### All Functions ({len(functions)} total)\n")
    for func_key in sorted(functions.keys()):
        data = functions[func_key]
        report.append(f"\n#### `{func_key}`")
        report.append(f"- **First Seen:** `{data['first_seen']}`")
        report.append(f"- **Defined In:** {len(data['files'])} file(s)")
        if len(data['files']) > 1:
            report.append(f"- **⚠️ DUPLICATE** - Defined in multiple files:")
            for f in data['files']:
                report.append(f"  - `{f}`")
    
    # Enum Analysis
    report.append(f"\n## Enum Analysis\n")
    report.append(f"\n### All Enums ({len(enums)} total)\n")
    for enum_key in sorted(enums.keys()):
        data = enums[enum_key]
        report.append(f"\n#### `{enum_key}`")
        report.append(f"- **First Seen:** `{data['first_seen']}`")
        report.append(f"- **Defined In:** {len(data['files'])} file(s)")
        if len(data['files']) > 1:
            report.append(f"- **⚠️ DUPLICATE** - Defined in multiple files:")
            for f in data['files']:
                report.append(f"  - `{f}`")
    
    # Dependency Graph
    report.append(f"\n## Dependency Graph\n")
    report.append(f"\n### Tables with Dependencies\n")
    for table_key in sorted(dependencies.keys()):
        deps = dependencies[table_key]
        if deps:
            report.append(f"\n- `{table_key}` depends on:")
            for dep in sorted(deps):
                report.append(f"  - `{dep}`")
    
    report.append(f"\n### Tables with Dependents\n")
    for table_key in sorted(dependents.keys()):
        deps = dependents[table_key]
        if deps:
            report.append(f"\n- `{table_key}` is referenced by:")
            for dep in sorted(deps):
                report.append(f"  - `{dep}`")
    
    # Cleanup Recommendations
    report.append(f"\n## Cleanup Recommendations\n")
    report.append(f"\n### Safe to Remove (After Consolidation Migrations Applied)\n")
    report.append(f"\nThese duplicate definitions can be removed from older migrations")
    report.append(f"once the consolidation migrations (20250103000000, 20250103000001) are applied.\n")
    
    report.append(f"\n#### Functions (Use 20250103000000_core_functions_consolidation.sql instead)\n")
    for func_key, data in sorted(duplicate_functions.items()):
        if data['first_seen'] != '20250103000000_core_functions_consolidation.sql':
            report.append(f"\n- `{func_key}` - Remove from {len(data['files'])} file(s):")
            for f in data['files']:
                if f != '20250103000000_core_functions_consolidation.sql':
                    report.append(f"  - `{f}`")
    
    report.append(f"\n#### Enums (Use 20250103000001_enums_consolidation.sql instead)\n")
    for enum_key, data in sorted(duplicate_enums.items()):
        if data['first_seen'] != '20250103000001_enums_consolidation.sql':
            report.append(f"\n- `{enum_key}` - Remove from {len(data['files'])} file(s):")
            for f in data['files']:
                if f != '20250103000001_enums_consolidation.sql':
                    report.append(f"  - `{f}`")
    
    return "\n".join(report)

if __name__ == '__main__':
    print("Analyzing migrations...")
    migrations, tables, functions, enums, foreign_keys = analyze_migrations()
    dependencies, dependents = build_dependency_graph(tables, foreign_keys)
    report = generate_report(migrations, tables, functions, enums, foreign_keys, dependencies, dependents)
    
    # Write report
    output_file = Path('MIGRATION_ANALYSIS_REPORT.md')
    output_file.write_text(report)
    print(f"✅ Analysis complete! Report written to {output_file}")
    print(f"\nSummary:")
    print(f"  - Migrations: {len(migrations)}")
    print(f"  - Tables: {len(tables)}")
    print(f"  - Functions: {len(functions)}")
    print(f"  - Enums: {len(enums)}")
    print(f"  - Foreign Keys: {len(foreign_keys)}")

