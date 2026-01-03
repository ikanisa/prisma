#!/usr/bin/env python3
"""
Table Dependency Analyzer
Maps table dependencies and identifies critical tables
"""
import re
from pathlib import Path
from collections import defaultdict

migrations_dir = Path('supabase/migrations')

def analyze_table_dependencies():
    """Analyze table dependencies and foreign key relationships"""
    
    tables = {}
    foreign_keys = []
    table_columns = defaultdict(lambda: {'columns': set(), 'foreign_keys': []})
    
    # Patterns
    table_pattern = re.compile(r'CREATE TABLE (?:IF NOT EXISTS )?(?:(\w+)\.)?(\w+)\s*\(', re.IGNORECASE | re.MULTILINE)
    fk_pattern = re.compile(r'(\w+)\s+[^,)]+?\s+REFERENCES (?:(\w+)\.)?(\w+)\((\w+)\)', re.IGNORECASE)
    fk_alter_pattern = re.compile(r'ALTER TABLE (?:(\w+)\.)?(\w+).*ADD.*FOREIGN KEY.*REFERENCES (?:(\w+)\.)?(\w+)', re.IGNORECASE | re.MULTILINE)
    column_pattern = re.compile(r'^\s+(\w+)\s+', re.MULTILINE)
    
    for sql_file in sorted(migrations_dir.glob('*.sql')):
        if sql_file.name == '.keep':
            continue
        
        content = sql_file.read_text()
        
        # Find tables
        for match in table_pattern.finditer(content):
            schema = match.group(1) or 'public'
            table_name = match.group(2)
            key = f"{schema}.{table_name}"
            tables[key] = sql_file.name
        
        # Find foreign keys in CREATE TABLE
        table_start = 0
        for table_match in table_pattern.finditer(content):
            table_schema = table_match.group(1) or 'public'
            table_name = table_match.group(2)
            table_key = f"{table_schema}.{table_name}"
            
            # Find the table block
            table_block_start = table_match.end()
            # Find matching closing parenthesis
            paren_count = 1
            i = table_block_start
            while i < len(content) and paren_count > 0:
                if content[i] == '(':
                    paren_count += 1
                elif content[i] == ')':
                    paren_count -= 1
                i += 1
            table_block_end = i
            
            table_block = content[table_block_start:table_block_end]
            
            # Find foreign keys in this block
            for fk_match in fk_pattern.finditer(table_block):
                col_name = fk_match.group(1)
                ref_schema = fk_match.group(2) or 'public'
                ref_table = fk_match.group(3)
                ref_col = fk_match.group(4)
                ref_key = f"{ref_schema}.{ref_table}"
                
                foreign_keys.append({
                    'from_table': table_key,
                    'from_column': col_name,
                    'to_table': ref_key,
                    'to_column': ref_col,
                    'file': sql_file.name
                })
                
                table_columns[table_key]['foreign_keys'].append({
                    'column': col_name,
                    'references': ref_key,
                    'ref_column': ref_col
                })
            
            # Extract columns
            for col_match in column_pattern.finditer(table_block):
                col_name = col_match.group(1)
                if col_name.upper() not in ['CONSTRAINT', 'PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'CREATE']:
                    table_columns[table_key]['columns'].add(col_name)
    
    return tables, foreign_keys, table_columns

def build_dependency_graph(tables, foreign_keys):
    """Build dependency graph"""
    graph = defaultdict(set)
    reverse_graph = defaultdict(set)
    
    for fk in foreign_keys:
        from_table = fk['from_table']
        to_table = fk['to_table']
        graph[from_table].add(to_table)
        reverse_graph[to_table].add(from_table)
    
    return graph, reverse_graph

def find_critical_tables(reverse_graph, all_tables):
    """Find tables that many other tables depend on"""
    dependency_counts = {}
    for table in all_tables:
        count = len(reverse_graph.get(table, set()))
        dependency_counts[table] = count
    
    return sorted(dependency_counts.items(), key=lambda x: x[1], reverse=True)

def generate_dependency_report(tables, foreign_keys, table_columns, graph, reverse_graph):
    """Generate dependency report"""
    
    report = []
    report.append("# Table Dependency Analysis Report")
    report.append(f"\n**Generated:** 2025-01-03")
    report.append(f"\n**Total Tables:** {len(tables)}")
    report.append(f"\n**Total Foreign Keys:** {len(foreign_keys)}")
    
    # Critical Tables (most depended upon)
    critical_tables = find_critical_tables(reverse_graph, tables.keys())
    
    report.append(f"\n## Critical Tables (Most Referenced)\n")
    report.append(f"\nThese tables are referenced by many other tables and should be consolidated first.\n")
    for table, count in critical_tables[:20]:
        report.append(f"\n### `{table}`")
        report.append(f"- **Referenced By:** {count} table(s)")
        if table in reverse_graph:
            report.append(f"- **Dependents:**")
            for dep in sorted(reverse_graph[table])[:10]:
                report.append(f"  - `{dep}`")
        if table in graph:
            report.append(f"- **Depends On:**")
            for dep in sorted(graph[table]):
                report.append(f"  - `{dep}`")
        if table in table_columns:
            report.append(f"- **Columns:** {len(table_columns[table]['columns'])}")
            report.append(f"- **Foreign Keys:** {len(table_columns[table]['foreign_keys'])}")
    
    # User-related tables analysis
    report.append(f"\n## User Management Tables Analysis\n")
    user_tables = [t for t in tables.keys() if 'user' in t.lower() or 'profile' in t.lower() or 'member' in t.lower()]
    report.append(f"\nFound {len(user_tables)} user-related tables:\n")
    for table in sorted(user_tables):
        report.append(f"\n### `{table}`")
        report.append(f"- **Defined In:** `{tables[table]}`")
        if table in reverse_graph:
            report.append(f"- **Referenced By:** {len(reverse_graph[table])} table(s)")
            for dep in sorted(reverse_graph[table])[:5]:
                report.append(f"  - `{dep}`")
        if table in table_columns:
            cols = sorted(table_columns[table]['columns'])
            report.append(f"- **Columns:** {len(cols)}")
            report.append(f"- **Key Columns:** {', '.join(cols[:10])}")
    
    # Organization-related tables
    report.append(f"\n## Organization Tables Analysis\n")
    org_tables = [t for t in tables.keys() if 'organization' in t.lower() or 'org' in t.lower()]
    report.append(f"\nFound {len(org_tables)} organization-related tables:\n")
    for table in sorted(org_tables):
        report.append(f"\n### `{table}`")
        report.append(f"- **Defined In:** `{tables[table]}`")
        if table in reverse_graph:
            report.append(f"- **Referenced By:** {len(reverse_graph[table])} table(s)")
    
    # Foreign Key Summary
    report.append(f"\n## Foreign Key Relationships\n")
    report.append(f"\nTotal: {len(foreign_keys)} relationships\n")
    
    # Group by referenced table
    ref_counts = defaultdict(int)
    for fk in foreign_keys:
        ref_counts[fk['to_table']] += 1
    
    report.append(f"\n### Most Referenced Tables\n")
    for ref_table, count in sorted(ref_counts.items(), key=lambda x: x[1], reverse=True)[:15]:
        report.append(f"- `{ref_table}`: {count} reference(s)")
    
    return "\n".join(report)

if __name__ == '__main__':
    print("Analyzing table dependencies...")
    tables, foreign_keys, table_columns = analyze_table_dependencies()
    graph, reverse_graph = build_dependency_graph(tables, foreign_keys)
    report = generate_dependency_report(tables, foreign_keys, table_columns, graph, reverse_graph)
    
    output_file = Path('TABLE_DEPENDENCY_ANALYSIS.md')
    output_file.write_text(report)
    print(f"✅ Analysis complete! Report written to {output_file}")
    print(f"\nFound:")
    print(f"  - Tables: {len(tables)}")
    print(f"  - Foreign Keys: {len(foreign_keys)}")
    print(f"  - Dependency relationships: {len(graph)}")

