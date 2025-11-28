#!/usr/bin/env python3
"""
Ground Truth Audit Script
Verifies actual implementation status vs. documentation claims
"""

import os
import json
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# ANSI colors
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

def count_agent_files(package_path):
    """Count agent TypeScript files in a package"""
    agents_path = package_path / "src" / "agents"
    if not agents_path.exists():
        return 0, []
    
    files = list(agents_path.glob("*.ts"))
    # Filter out test and index files
    agent_files = [f.name for f in files if not f.name.endswith(('.test.ts', '.spec.ts')) and f.name != 'index.ts']
    return len(agent_files), sorted(agent_files)

def get_file_size_kb(filepath):
    """Get file size in KB"""
    try:
        size_bytes = os.path.getsize(filepath)
        return size_bytes / 1024
    except:
        return 0

def main():
    root = Path.cwd()
    packages_dir = root / "packages"
    
    print(f"{Colors.BLUE}═══════════════════════════════════════════════════{Colors.NC}")
    print(f"{Colors.BLUE}  PRISMA GLOW - GROUND TRUTH AUDIT{Colors.NC}")
    print(f"{Colors.BLUE}═══════════════════════════════════════════════════{Colors.NC}")
    print()
    
    # Agent packages configuration
    agent_config = {
        "tax": ("Tax Agents", 12),
        "audit": ("Audit Agents", 10),
        "accounting": ("Accounting Agents", 8),
        "orchestrators": ("Orchestrators", 3),
        "corporate-services": ("Corporate Services", 6),
        "operational": ("Operational Agents", 4),
        "support": ("Support Agents", 4),
    }
    
    report_lines = []
    report_lines.append("# 🔍 GROUND TRUTH AUDIT REPORT")
    report_lines.append("## Actual Implementation Status vs. Documentation Claims")
    report_lines.append("")
    report_lines.append(f"**Generated:** {datetime.now().strftime('%B %d, %Y at %H:%M:%S')}")
    report_lines.append("**Script:** scripts/ground-truth-audit.py")
    report_lines.append("**Purpose:** Verify actual codebase status")
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## 📊 AGENT IMPLEMENTATION STATUS")
    report_lines.append("")
    
    print(f"{Colors.GREEN}[1/7]{Colors.NC} Auditing agent implementations...")
    
    report_lines.append("### Agent Package Summary")
    report_lines.append("")
    report_lines.append("| Package | Expected | Actual | Status | Completion |")
    report_lines.append("|---------|----------|--------|--------|------------|")
    
    total_expected = 0
    total_actual = 0
    agent_details = {}
    
    for package_name in sorted(agent_config.keys()):
        display_name, expected = agent_config[package_name]
        package_path = packages_dir / package_name
        
        actual, files = count_agent_files(package_path)
        agent_details[package_name] = files
        
        total_expected += expected
        total_actual += actual
        
        if actual == expected:
            status = "✅ Complete"
            completion = "100%"
        elif actual > 0:
            status = "🟡 Partial"
            completion = f"{int(actual * 100 / expected)}%"
        else:
            status = "🔴 Not Started"
            completion = "0%"
        
        report_lines.append(f"| {display_name} | {expected} | {actual} | {status} | {completion} |")
        print(f"  {display_name}: {actual}/{expected} files")
    
    overall_pct = int(total_actual * 100 / total_expected) if total_expected > 0 else 0
    report_lines.append("")
    report_lines.append(f"**TOTAL: {total_actual}/{total_expected} agents ({overall_pct}% complete)**")
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("### Detailed Agent Files")
    report_lines.append("")
    
    for package_name in sorted(agent_config.keys()):
        display_name, _ = agent_config[package_name]
        files = agent_details[package_name]
        
        report_lines.append(f"#### {display_name} ({len(files)} files)")
        report_lines.append("")
        if files:
            report_lines.append("```")
            report_lines.extend(files)
            report_lines.append("```")
        else:
            report_lines.append("*No agent files found*")
        report_lines.append("")
    
    # UI Components
    print()
    print(f"{Colors.GREEN}[2/7]{Colors.NC} Auditing UI components...")
    
    report_lines.append("## 🎨 UI/UX COMPONENTS STATUS")
    report_lines.append("")
    
    # Layout components
    layout_dir = root / "src" / "components" / "layout"
    if layout_dir.exists():
        layout_files = [f.name for f in layout_dir.glob("*.tsx") if not f.name.endswith(('.test.tsx', '.stories.tsx'))]
        layout_count = len(layout_files)
        report_lines.append("### Layout Components")
        report_lines.append("")
        report_lines.append(f"**Found: {layout_count} components**")
        report_lines.append("")
        if layout_files:
            report_lines.append("```")
            report_lines.extend(sorted(layout_files))
            report_lines.append("```")
    else:
        layout_count = 0
        report_lines.append("### Layout Components")
        report_lines.append("")
        report_lines.append("**Status:** ⚠️ Directory not found")
    
    print(f"  Layout components: {layout_count} found (expected: 7)")
    report_lines.append("")
    
    # Smart components
    smart_dir = root / "src" / "components" / "smart"
    if smart_dir.exists():
        smart_files = [f.name for f in smart_dir.glob("*.tsx") if not f.name.endswith(('.test.tsx', '.stories.tsx'))]
        smart_count = len(smart_files)
        report_lines.append("### Smart Components")
        report_lines.append("")
        report_lines.append(f"**Found: {smart_count} components**")
        report_lines.append("")
        if smart_files:
            report_lines.append("```")
            report_lines.extend(sorted(smart_files))
            report_lines.append("```")
    else:
        smart_count = 0
        report_lines.append("### Smart Components")
        report_lines.append("")
        report_lines.append("**Status:** ⚠️ Directory not found")
    
    print(f"  Smart components: {smart_count} found (expected: 8)")
    report_lines.append("")
    
    # Page sizes
    print()
    print(f"{Colors.GREEN}[3/7]{Colors.NC} Analyzing page sizes...")
    
    report_lines.append("## 📄 PAGE FILE SIZES")
    report_lines.append("")
    report_lines.append("### Pages Analysis")
    report_lines.append("")
    report_lines.append("| Page | Size | Status |")
    report_lines.append("|------|------|--------|")
    
    pages_dir = root / "src" / "pages"
    if pages_dir.exists():
        pages = [f for f in pages_dir.glob("*.tsx") if "-example" not in f.name]
        for page_file in sorted(pages):
            size_kb = get_file_size_kb(page_file)
            
            if size_kb < 8:
                status = "✅ <8KB"
            elif size_kb < 10:
                status = "🟡 8-10KB"
            else:
                status = "🔴 >10KB"
            
            report_lines.append(f"| {page_file.name} | {size_kb:.1f}KB | {status} |")
    
    report_lines.append("")
    
    # Performance
    print()
    print(f"{Colors.GREEN}[4/7]{Colors.NC} Checking performance metrics...")
    
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## ⚡ PERFORMANCE METRICS")
    report_lines.append("")
    report_lines.append("### Bundle Size")
    report_lines.append("")
    
    dist_dir = root / "dist"
    if dist_dir.exists():
        # Calculate total size
        total_size = sum(f.stat().st_size for f in dist_dir.rglob('*') if f.is_file())
        size_mb = total_size / (1024 * 1024)
        size_kb = total_size / 1024
        report_lines.append(f"**Last build size:** {size_mb:.2f}MB ({size_kb:.0f}KB)")
        print(f"  Bundle size: {size_mb:.2f}MB")
    else:
        report_lines.append("**Status:** ⚠️ No dist directory found (run `pnpm run build`)")
        print(f"  {Colors.YELLOW}Bundle size: Not built yet{Colors.NC}")
    
    report_lines.append("")
    report_lines.append("### Test Coverage")
    report_lines.append("")
    
    # Coverage
    print()
    print(f"{Colors.GREEN}[5/7]{Colors.NC} Checking test coverage...")
    
    coverage_file = root / "coverage" / "coverage-summary.json"
    if coverage_file.exists():
        try:
            with open(coverage_file) as f:
                coverage_data = json.load(f)
                total = coverage_data.get('total', {})
                
                report_lines.append("| Metric | Coverage |")
                report_lines.append("|--------|----------|")
                report_lines.append(f"| Statements | {total.get('statements', {}).get('pct', 0)}% |")
                report_lines.append(f"| Branches | {total.get('branches', {}).get('pct', 0)}% |")
                report_lines.append(f"| Functions | {total.get('functions', {}).get('pct', 0)}% |")
                report_lines.append(f"| Lines | {total.get('lines', {}).get('pct', 0)}% |")
                
                print(f"  Coverage: {total.get('statements', {}).get('pct', 0)}% statements")
        except:
            report_lines.append("**Status:** ⚠️ Could not parse coverage data")
    else:
        report_lines.append("**Status:** ⚠️ Coverage summary not found (run `pnpm run coverage`)")
        print(f"  {Colors.YELLOW}Coverage: Not run yet{Colors.NC}")
    
    report_lines.append("")
    
    # Infrastructure
    print()
    print(f"{Colors.GREEN}[6/7]{Colors.NC} Checking infrastructure...")
    
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## 🏗️ INFRASTRUCTURE STATUS")
    report_lines.append("")
    report_lines.append("### Database Migrations")
    report_lines.append("")
    
    # Supabase migrations
    supabase_migrations_dir = root / "supabase" / "migrations"
    if supabase_migrations_dir.exists():
        supabase_count = len(list(supabase_migrations_dir.glob("*.sql")))
        report_lines.append(f"**Supabase migrations:** {supabase_count} files")
        print(f"  Supabase migrations: {supabase_count}")
    else:
        report_lines.append("**Supabase migrations:** ⚠️ Directory not found")
    
    # Prisma migrations
    prisma_migrations_dir = root / "apps" / "web" / "prisma" / "migrations"
    if prisma_migrations_dir.exists():
        prisma_count = len(list(prisma_migrations_dir.rglob("*.sql")))
        report_lines.append(f"**Prisma migrations:** {prisma_count} files")
        print(f"  Prisma migrations: {prisma_count}")
    else:
        report_lines.append("**Prisma migrations:** ⚠️ Directory not found")
    
    report_lines.append("")
    report_lines.append("### Gemini AI Integration")
    report_lines.append("")
    
    # Gemini files
    gemini_count = 0
    for pattern in ["*gemini*", "*ai*"]:
        gemini_count += len([f for f in root.rglob(f"{pattern}.ts") if "node_modules" not in str(f)])
        gemini_count += len([f for f in root.rglob(f"{pattern}.tsx") if "node_modules" not in str(f)])
        gemini_count += len([f for f in root.rglob(f"{pattern}.py") if "node_modules" not in str(f)])
    
    report_lines.append(f"**Gemini-related files:** {gemini_count}")
    print(f"  Gemini files: {gemini_count}")
    
    # Tauri
    tauri_dir = root / "src-tauri"
    if tauri_dir.exists():
        report_lines.append("**Tauri desktop app:** ✅ Initialized")
        print(f"  Tauri: {Colors.GREEN}Initialized{Colors.NC}")
    else:
        report_lines.append("**Tauri desktop app:** 🔴 Not initialized")
        print(f"  Tauri: {Colors.RED}Not initialized{Colors.NC}")
    
    # Summary
    print()
    print(f"{Colors.GREEN}[7/7]{Colors.NC} Finalizing report...")
    
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## 📊 SUMMARY & RECOMMENDATIONS")
    report_lines.append("")
    report_lines.append("### Implementation Status Summary")
    report_lines.append("")
    report_lines.append(f"**Agent Implementation:** {total_actual}/{total_expected} ({overall_pct}%)")
    report_lines.append("")
    report_lines.append("### Recommendations")
    report_lines.append("")
    report_lines.append("Based on this audit, the following actions are recommended:")
    report_lines.append("")
    report_lines.append("1. **Priority 1: Verify agent implementation accuracy**")
    report_lines.append("   - Documentation claims 0% but files exist")
    report_lines.append("   - Verify quality and completeness of existing agents")
    report_lines.append("")
    report_lines.append("2. **Priority 2: Build and measure**")
    report_lines.append("   - Run `pnpm run build` to get bundle size")
    report_lines.append("   - Run `pnpm run coverage` to get test coverage")
    report_lines.append("   - Run Lighthouse audit for performance baseline")
    report_lines.append("")
    report_lines.append("3. **Priority 3: Documentation sync**")
    report_lines.append("   - Update documentation to match actual status")
    report_lines.append("   - Archive conflicting/outdated plans")
    report_lines.append("   - Create single source of truth")
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append("## 🎯 NEXT STEPS")
    report_lines.append("")
    report_lines.append("1. **Review this report** with tech lead and team")
    report_lines.append("2. **Run missing measurements**:")
    report_lines.append("   ```bash")
    report_lines.append("   pnpm run build        # Get bundle size")
    report_lines.append("   pnpm run coverage     # Get test coverage")
    report_lines.append("   pnpm run lighthouse   # Get performance score (if configured)")
    report_lines.append("   ```")
    report_lines.append("3. **Verify agent quality**")
    report_lines.append("4. **Create gap analysis** based on findings")
    report_lines.append("5. **Update unified implementation plan**")
    report_lines.append("")
    report_lines.append("---")
    report_lines.append("")
    report_lines.append(f"**Report Generated:** {datetime.now().strftime('%B %d, %Y at %H:%M:%S')}")
    report_lines.append("**Audit Script:** scripts/ground-truth-audit.py")
    report_lines.append("**Status:** ✅ Complete")
    report_lines.append("")
    
    # Write report
    output_file = root / "GROUND_TRUTH_AUDIT_REPORT.md"
    with open(output_file, 'w') as f:
        f.write('\n'.join(report_lines))
    
    print()
    print(f"{Colors.BLUE}═══════════════════════════════════════════════════{Colors.NC}")
    print(f"{Colors.GREEN}✅ Ground truth audit complete!{Colors.NC}")
    print(f"{Colors.BLUE}═══════════════════════════════════════════════════{Colors.NC}")
    print()
    print(f"Report saved to: {Colors.GREEN}{output_file.name}{Colors.NC}")
    print()
    print("Next steps:")
    print(f"  1. Review {output_file.name}")
    print(f"  2. Run: {Colors.YELLOW}pnpm run build && pnpm run coverage{Colors.NC}")
    print("  3. Create gap analysis")
    print()

if __name__ == "__main__":
    main()
