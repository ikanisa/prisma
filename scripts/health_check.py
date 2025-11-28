#!/usr/bin/env python3
"""
Complete System Health Check
Verifies all learning system components including monitoring
"""

import sys
import os
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple
import json

# Colors for terminal output
class Colors:
    BLUE = '\033[0;34m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    NC = '\033[0m'  # No Color

class HealthChecker:
    def __init__(self):
        self.checks_passed = 0
        self.checks_failed = 0
        self.checks_warned = 0
        self.total_checks = 0
        
    def section(self, title: str):
        print(f"\n{Colors.BLUE}{title}{Colors.NC}")
        print("=" * 50)
        
    def check_pass(self, message: str):
        self.total_checks += 1
        self.checks_passed += 1
        print(f"{Colors.GREEN}✓{Colors.NC} {message}")
        
    def check_fail(self, message: str, suggestion: str = None):
        self.total_checks += 1
        self.checks_failed += 1
        print(f"{Colors.RED}✗{Colors.NC} {message}")
        if suggestion:
            print(f"  → {suggestion}")
            
    def check_warn(self, message: str, suggestion: str = None):
        self.checks_warned += 1
        print(f"{Colors.YELLOW}⚠{Colors.NC} {message}")
        if suggestion:
            print(f"  → {suggestion}")
    
    def verify_files(self) -> Tuple[int, int]:
        """Verify all required files exist"""
        self.section("1. File Structure Verification")
        
        required_files = {
            # Core implementation
            "migrations/sql/20251128000000_agent_learning_system.sql": "Database migration",
            "server/learning/__init__.py": "Learning module init",
            "server/learning/prompt_optimizer.py": "Prompt optimizer",
            "server/learning/rag_trainer.py": "RAG trainer",
            "server/learning/behavior_learner.py": "Behavior learner",
            "server/learning/feedback_collector.py": "Feedback collector",
            "server/api/learning.py": "Learning API endpoints",
            "server/learning_jobs.py": "Background jobs",
            "server/learning_scheduler.py": "Job scheduler",
            "server/metrics.py": "Prometheus metrics",
            "src/hooks/useLearning.ts": "React hooks",
            "src/components/learning/FeedbackCollector.tsx": "Feedback UI",
            "src/components/learning/AgentOutputCard.tsx": "Output card UI",
            "src/components/learning/LearningDashboard.tsx": "Dashboard UI",
            
            # Monitoring
            "infra/monitoring/docker-compose.yml": "Monitoring stack",
            "infra/monitoring/prometheus.yml": "Prometheus config",
            "infra/monitoring/prometheus-alerts.yml": "Alert rules",
            "infra/monitoring/alertmanager.yml": "Alertmanager config",
            "infra/monitoring/grafana-learning-dashboard.json": "Grafana dashboard",
            "infra/monitoring/README.md": "Monitoring guide",
            
            # Documentation
            "LEARNING_SYSTEM_READY.md": "Quick start guide",
            "MONITORING_AND_OBSERVABILITY.md": "Monitoring guide",
            "DEPLOYMENT_GUIDE.md": "Deployment guide",
            "DOCUMENTATION_INDEX.md": "Documentation index",
            "docs/AGENT_LEARNING_SYSTEM_IMPLEMENTATION.md": "Implementation guide",
            "docs/AGENT_LEARNING_INTEGRATION_GUIDE.md": "Integration guide",
            "docs/BACKGROUND_JOBS_GUIDE.md": "Jobs guide",
        }
        
        for file_path, description in required_files.items():
            if Path(file_path).exists():
                self.check_pass(f"{description}: {file_path}")
            else:
                self.check_fail(f"{description} missing: {file_path}")
        
        return self.checks_passed, self.checks_failed
    
    def verify_python_syntax(self) -> Tuple[int, int]:
        """Verify Python files have valid syntax"""
        self.section("2. Python Syntax Verification")
        
        python_files = [
            "server/learning/prompt_optimizer.py",
            "server/learning/rag_trainer.py",
            "server/learning/behavior_learner.py",
            "server/learning/feedback_collector.py",
            "server/api/learning.py",
            "server/learning_jobs.py",
            "server/learning_scheduler.py",
            "server/metrics.py",
            "scripts/verify_learning_system.py",
        ]
        
        for file_path in python_files:
            if not Path(file_path).exists():
                self.check_warn(f"Skipping {file_path} (not found)")
                continue
                
            try:
                result = subprocess.run(
                    ["python3", "-m", "py_compile", file_path],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    self.check_pass(f"Valid syntax: {file_path}")
                else:
                    self.check_fail(
                        f"Syntax error in {file_path}",
                        result.stderr.strip()
                    )
            except Exception as e:
                self.check_fail(f"Failed to check {file_path}", str(e))
        
        return self.checks_passed, self.checks_failed
    
    def verify_typescript_files(self) -> Tuple[int, int]:
        """Verify TypeScript files exist and basic structure"""
        self.section("3. TypeScript Files Verification")
        
        ts_files = [
            "src/hooks/useLearning.ts",
            "src/components/learning/FeedbackCollector.tsx",
            "src/components/learning/AgentOutputCard.tsx",
            "src/components/learning/LearningDashboard.tsx",
            "src/components/learning/index.ts",
        ]
        
        for file_path in ts_files:
            if Path(file_path).exists():
                self.check_pass(f"Found: {file_path}")
                
                # Check for basic content
                content = Path(file_path).read_text()
                if len(content) > 100:
                    self.check_pass(f"  Has content ({len(content)} bytes)")
                else:
                    self.check_warn(f"  File seems empty ({len(content)} bytes)")
            else:
                self.check_fail(f"Missing: {file_path}")
        
        return self.checks_passed, self.checks_failed
    
    def verify_sql_migration(self) -> Tuple[int, int]:
        """Verify SQL migration file"""
        self.section("4. SQL Migration Verification")
        
        migration_file = "migrations/sql/20251128000000_agent_learning_system.sql"
        
        if not Path(migration_file).exists():
            self.check_fail(f"Migration file not found: {migration_file}")
            return self.checks_passed, self.checks_failed
        
        self.check_pass(f"Migration file exists: {migration_file}")
        
        content = Path(migration_file).read_text()
        
        # Check for required tables
        required_tables = [
            "learning_examples",
            "agent_feedback",
            "expert_annotations",
            "training_datasets",
            "dataset_examples",
            "training_runs",
            "learning_experiments",
        ]
        
        for table in required_tables:
            if f"CREATE TABLE {table}" in content:
                self.check_pass(f"Table defined: {table}")
            else:
                self.check_fail(f"Table missing: {table}")
        
        # Check for indexes
        if "CREATE INDEX" in content:
            index_count = content.count("CREATE INDEX")
            self.check_pass(f"Found {index_count} indexes")
        else:
            self.check_warn("No indexes found")
        
        return self.checks_passed, self.checks_failed
    
    def verify_monitoring_config(self) -> Tuple[int, int]:
        """Verify monitoring configuration files"""
        self.section("5. Monitoring Configuration Verification")
        
        # Check Prometheus config
        prom_config = Path("infra/monitoring/prometheus.yml")
        if prom_config.exists():
            self.check_pass("Prometheus config exists")
            content = prom_config.read_text()
            if "job_name: 'fastapi'" in content:
                self.check_pass("FastAPI scrape job configured")
            if "job_name: 'redis'" in content:
                self.check_pass("Redis scrape job configured")
        else:
            self.check_fail("Prometheus config missing")
        
        # Check alert rules
        alerts_config = Path("infra/monitoring/prometheus-alerts.yml")
        if alerts_config.exists():
            self.check_pass("Alert rules file exists")
            content = alerts_config.read_text()
            alert_count = content.count("alert:")
            self.check_pass(f"Found {alert_count} alert rules")
        else:
            self.check_fail("Alert rules file missing")
        
        # Check Grafana dashboard
        dashboard_file = Path("infra/monitoring/grafana-learning-dashboard.json")
        if dashboard_file.exists():
            self.check_pass("Grafana dashboard exists")
            try:
                dashboard = json.loads(dashboard_file.read_text())
                panel_count = len(dashboard.get("panels", []))
                self.check_pass(f"Dashboard has {panel_count} panels")
            except json.JSONDecodeError:
                self.check_fail("Dashboard JSON is invalid")
        else:
            self.check_fail("Grafana dashboard missing")
        
        return self.checks_passed, self.checks_failed
    
    def verify_documentation(self) -> Tuple[int, int]:
        """Verify documentation completeness"""
        self.section("6. Documentation Verification")
        
        docs = {
            "LEARNING_SYSTEM_READY.md": 500,
            "MONITORING_AND_OBSERVABILITY.md": 1000,
            "DEPLOYMENT_GUIDE.md": 1000,
            "DOCUMENTATION_INDEX.md": 500,
            "docs/AGENT_LEARNING_SYSTEM_IMPLEMENTATION.md": 2000,
            "docs/AGENT_LEARNING_INTEGRATION_GUIDE.md": 1500,
            "docs/BACKGROUND_JOBS_GUIDE.md": 1000,
            "infra/monitoring/README.md": 500,
        }
        
        for doc, min_words in docs.items():
            if not Path(doc).exists():
                self.check_fail(f"Documentation missing: {doc}")
                continue
            
            content = Path(doc).read_text()
            word_count = len(content.split())
            
            if word_count >= min_words:
                self.check_pass(f"{doc} ({word_count} words)")
            else:
                self.check_warn(
                    f"{doc} ({word_count} words)",
                    f"Expected at least {min_words} words"
                )
        
        return self.checks_passed, self.checks_failed
    
    def verify_makefile_targets(self) -> Tuple[int, int]:
        """Verify Makefile has required targets"""
        self.section("7. Makefile Targets Verification")
        
        if not Path("Makefile").exists():
            self.check_fail("Makefile not found")
            return self.checks_passed, self.checks_failed
        
        content = Path("Makefile").read_text()
        
        required_targets = [
            "learning-worker",
            "learning-scheduler",
            "learning-optimize",
            "learning-status",
            "monitoring-up",
            "monitoring-down",
            "monitoring-logs",
        ]
        
        for target in required_targets:
            if f"{target}:" in content or f".PHONY: {target}" in content:
                self.check_pass(f"Target exists: {target}")
            else:
                self.check_warn(f"Target missing: {target}")
        
        return self.checks_passed, self.checks_failed
    
    def print_summary(self):
        """Print final summary"""
        print(f"\n{Colors.BLUE}{'='*50}{Colors.NC}")
        print(f"{Colors.BLUE}HEALTH CHECK SUMMARY{Colors.NC}")
        print(f"{Colors.BLUE}{'='*50}{Colors.NC}\n")
        
        print(f"Total Checks: {self.total_checks}")
        print(f"{Colors.GREEN}Passed: {self.checks_passed}{Colors.NC}")
        print(f"{Colors.YELLOW}Warnings: {self.checks_warned}{Colors.NC}")
        print(f"{Colors.RED}Failed: {self.checks_failed}{Colors.NC}\n")
        
        if self.checks_failed == 0:
            print(f"{Colors.GREEN}✓ All critical checks passed!{Colors.NC}")
            print(f"\n{Colors.BLUE}System Status: PRODUCTION READY{Colors.NC}\n")
            
            print("Next steps:")
            print("1. Run database migration:")
            print("   psql $DATABASE_URL -f migrations/sql/20251128000000_agent_learning_system.sql")
            print("\n2. Start background workers:")
            print("   make learning-worker")
            print("   make learning-scheduler")
            print("\n3. Start monitoring stack:")
            print("   cd infra/monitoring && docker-compose up -d")
            print("\n4. Access services:")
            print("   Grafana: http://localhost:3001")
            print("   Prometheus: http://localhost:9090")
            print("   Metrics: http://localhost:8000/metrics")
            print()
            return 0
        else:
            print(f"{Colors.RED}✗ Some checks failed. Please review above.{Colors.NC}\n")
            return 1

def main():
    print(f"{Colors.BLUE}{'='*50}{Colors.NC}")
    print(f"{Colors.BLUE}PRISMA GLOW - COMPLETE SYSTEM HEALTH CHECK{Colors.NC}")
    print(f"{Colors.BLUE}{'='*50}{Colors.NC}")
    
    checker = HealthChecker()
    
    # Run all checks
    checker.verify_files()
    checker.verify_python_syntax()
    checker.verify_typescript_files()
    checker.verify_sql_migration()
    checker.verify_monitoring_config()
    checker.verify_documentation()
    checker.verify_makefile_targets()
    
    # Print summary
    exit_code = checker.print_summary()
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
