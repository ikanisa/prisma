#!/usr/bin/env python3
"""
Extract and categorize all endpoints from server/main.py
"""
import re
from pathlib import Path
from collections import defaultdict

def extract_endpoints(file_path):
    """Extract all endpoints with line numbers and metadata"""
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    endpoints = []
    
    # Pattern to match @app.METHOD("path")
    pattern = r'@app\.(get|post|patch|delete|put)\("([^"]+)"'
    
    for i, line in enumerate(lines, 1):
        match = re.search(pattern, line)
        if match:
            method = match.group(1).upper()
            path = match.group(2)
            
            # Try to find function name on next line
            func_name = ""
            if i < len(lines):
                func_match = re.search(r'(?:async )?def (\w+)\(', lines[i])
                if func_match:
                    func_name = func_match.group(1)
            
            # Categorize endpoint
            category = categorize_endpoint(path)
            
            endpoints.append({
                'line': i,
                'method': method,
                'path': path,
                'function': func_name,
                'category': category,
                'status': 'pending'
            })
    
    return endpoints

def categorize_endpoint(path):
    """Categorize endpoint by path"""
    # Check for already migrated endpoints
    if '/agents' in path or '/agent/' in path:
        return 'agents'  # Already migrated
    elif '/executions' in path or '/execution/' in path:
        return 'executions'  # Already migrated
    elif '/learning' in path:
        return 'learning'  # Already migrated
    elif '/analytics' in path:
        return 'analytics'  # Already migrated
    elif '/gemini' in path or '/chat' in path:
        return 'gemini_chat'  # Already migrated
    
    # Categorize remaining endpoints
    elif '/iam' in path or '/admin/impersonation' in path:
        return 'auth'
    elif '/ada' in path:
        return 'documents'  # ADA is document automation
    elif '/controls' in path or '/admin/auditlog' in path:
        return 'workflows'
    elif '/admin/org' in path:
        return 'organizations'
    elif path in ['/health', '/readiness', '/live', '/status']:
        return 'health'
    elif '/v1/security' in path:
        return 'security'
    else:
        return 'unknown'

def main():
    file_path = Path(__file__).parent.parent / 'server' / 'main.py'
    endpoints = extract_endpoints(file_path)
    
    # Generate CSV
    print("Line,Method,Path,Function,Category,Status")
    for ep in endpoints:
        print(f"{ep['line']},{ep['method']},{ep['path']},{ep['function']},{ep['category']},{ep['status']}")
    
    print("\n")
    print("=" * 80)
    print("ENDPOINT CATEGORIZATION SUMMARY")
    print("=" * 80)
    print()
    
    # Group by category
    categories = defaultdict(list)
    for ep in endpoints:
        categories[ep['category']].append(ep)
    
    # Already migrated
    migrated = ['agents', 'executions', 'learning', 'analytics', 'gemini_chat']
    migrated_count = sum(len(categories[cat]) for cat in migrated)
    
    print(f"✅ ALREADY MIGRATED ({migrated_count} endpoints):")
    for cat in sorted(migrated):
        if cat in categories:
            print(f"   - {cat:20s}: {len(categories[cat]):3d} endpoints (server/api/{cat}.py)")
    
    print()
    print(f"⏳ TO BE MIGRATED ({len(endpoints) - migrated_count} endpoints):")
    
    for cat in sorted(set(categories.keys()) - set(migrated)):
        count = len(categories[cat])
        status = "✅ Migrated" if cat in migrated else "⏳ Pending"
        print(f"   - {cat:20s}: {count:3d} endpoints  {status}")
        
    print()
    print("=" * 80)
    print(f"TOTAL ENDPOINTS: {len(endpoints)}")
    print(f"Already Migrated: {migrated_count}")
    print(f"Remaining: {len(endpoints) - migrated_count}")
    print("=" * 80)
    
    # Show examples for each category
    print("\nEXAMPLES BY CATEGORY:")
    print("=" * 80)
    for cat in sorted(categories.keys()):
        if cat not in migrated:  # Only show pending ones
            print(f"\n{cat.upper()}:")
            for ep in categories[cat][:3]:  # Show first 3 examples
                print(f"  {ep['method']:6s} {ep['path']}")
            if len(categories[cat]) > 3:
                print(f"  ... and {len(categories[cat]) - 3} more")

if __name__ == "__main__":
    main()
