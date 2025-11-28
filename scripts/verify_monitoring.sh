#!/bin/bash

# =============================================================================
# Monitoring System Verification Script
# =============================================================================
# Verifies that all monitoring components are properly configured and running
#
# Usage: ./scripts/verify_monitoring.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PRISMA GLOW - MONITORING VERIFICATION${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Helper functions
check_pass() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}$1${NC}"
    echo "----------------------------------------"
}

# =============================================================================
# 1. FILE STRUCTURE VERIFICATION
# =============================================================================
section "1. Verifying File Structure"

if [ -d "infra/monitoring" ]; then
    check_pass "infra/monitoring/ directory exists"
else
    check_fail "infra/monitoring/ directory missing"
fi

files=(
    "infra/monitoring/docker-compose.yml"
    "infra/monitoring/prometheus.yml"
    "infra/monitoring/prometheus-alerts.yml"
    "infra/monitoring/alertmanager.yml"
    "infra/monitoring/grafana-learning-dashboard.json"
    "infra/monitoring/README.md"
    "server/metrics.py"
    "MONITORING_AND_OBSERVABILITY.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_fail "$file missing"
    fi
done

# =============================================================================
# 2. CONFIGURATION FILE VALIDATION
# =============================================================================
section "2. Validating Configuration Files"

# Check prometheus.yml syntax
if command -v promtool &> /dev/null; then
    if promtool check config infra/monitoring/prometheus.yml &> /dev/null; then
        check_pass "prometheus.yml syntax valid"
    else
        check_fail "prometheus.yml has syntax errors"
    fi
else
    check_warn "promtool not installed, skipping prometheus.yml validation"
fi

# Check prometheus-alerts.yml syntax
if command -v promtool &> /dev/null; then
    if promtool check rules infra/monitoring/prometheus-alerts.yml &> /dev/null; then
        check_pass "prometheus-alerts.yml syntax valid"
    else
        check_fail "prometheus-alerts.yml has syntax errors"
    fi
else
    check_warn "promtool not installed, skipping alert rules validation"
fi

# Check docker-compose.yml syntax
if command -v docker-compose &> /dev/null; then
    if docker-compose -f infra/monitoring/docker-compose.yml config &> /dev/null; then
        check_pass "docker-compose.yml syntax valid"
    else
        check_fail "docker-compose.yml has syntax errors"
    fi
else
    check_warn "docker-compose not installed, skipping docker-compose validation"
fi

# =============================================================================
# 3. PYTHON DEPENDENCIES
# =============================================================================
section "3. Checking Python Dependencies"

if command -v python3 &> /dev/null; then
    if python3 -c "import prometheus_client" 2>/dev/null; then
        check_pass "prometheus_client package installed"
    else
        check_fail "prometheus_client package not installed"
        echo "   Run: pip install prometheus-client"
    fi
else
    check_fail "Python 3 not found"
fi

# =============================================================================
# 4. METRICS ENDPOINT VALIDATION
# =============================================================================
section "4. Validating Metrics Implementation"

if [ -f "server/metrics.py" ]; then
    # Check for required metrics
    metrics=(
        "learning_feedback_total"
        "learning_examples_total"
        "learning_training_runs_total"
        "learning_experiment_total"
        "learning_prompt_optimizations_total"
    )
    
    for metric in "${metrics[@]}"; do
        if grep -q "$metric" server/metrics.py; then
            check_pass "Metric '$metric' defined"
        else
            check_fail "Metric '$metric' not found"
        fi
    done
fi

# =============================================================================
# 5. ALERT RULES VALIDATION
# =============================================================================
section "5. Validating Alert Rules"

if [ -f "infra/monitoring/prometheus-alerts.yml" ]; then
    alert_count=$(grep -c "alert:" infra/monitoring/prometheus-alerts.yml || true)
    if [ "$alert_count" -ge 10 ]; then
        check_pass "Found $alert_count alert rules (expected: 16)"
    else
        check_warn "Found only $alert_count alert rules (expected: 16)"
    fi
    
    # Check for critical alerts
    critical_alerts=(
        "LearningSystemDown"
        "HighFeedbackErrorRate"
        "TrainingJobStuck"
    )
    
    for alert in "${critical_alerts[@]}"; do
        if grep -q "$alert" infra/monitoring/prometheus-alerts.yml; then
            check_pass "Critical alert '$alert' configured"
        else
            check_fail "Critical alert '$alert' missing"
        fi
    done
fi

# =============================================================================
# 6. DOCKER SERVICES CHECK
# =============================================================================
section "6. Checking Docker Services"

if command -v docker &> /dev/null; then
    # Check if monitoring stack is running
    if docker ps | grep -q "prometheus"; then
        check_pass "Prometheus container running"
    else
        check_warn "Prometheus container not running (start with: cd infra/monitoring && docker-compose up -d)"
    fi
    
    if docker ps | grep -q "grafana"; then
        check_pass "Grafana container running"
    else
        check_warn "Grafana container not running (start with: cd infra/monitoring && docker-compose up -d)"
    fi
    
    if docker ps | grep -q "alertmanager"; then
        check_pass "Alertmanager container running"
    else
        check_warn "Alertmanager container not running (start with: cd infra/monitoring && docker-compose up -d)"
    fi
else
    check_warn "Docker not installed, skipping container checks"
fi

# =============================================================================
# 7. ENDPOINT CONNECTIVITY CHECK
# =============================================================================
section "7. Checking Service Endpoints"

if command -v curl &> /dev/null; then
    # Check Prometheus
    if curl -f -s http://localhost:9090/-/healthy &> /dev/null; then
        check_pass "Prometheus endpoint accessible (http://localhost:9090)"
    else
        check_warn "Prometheus endpoint not accessible (may not be running)"
    fi
    
    # Check Grafana
    if curl -f -s http://localhost:3001/api/health &> /dev/null; then
        check_pass "Grafana endpoint accessible (http://localhost:3001)"
    else
        check_warn "Grafana endpoint not accessible (may not be running)"
    fi
    
    # Check Alertmanager
    if curl -f -s http://localhost:9093/-/healthy &> /dev/null; then
        check_pass "Alertmanager endpoint accessible (http://localhost:9093)"
    else
        check_warn "Alertmanager endpoint not accessible (may not be running)"
    fi
    
    # Check FastAPI metrics endpoint
    if curl -f -s http://localhost:8000/metrics &> /dev/null; then
        check_pass "FastAPI metrics endpoint accessible (http://localhost:8000/metrics)"
    else
        check_warn "FastAPI metrics endpoint not accessible (may not be running)"
    fi
else
    check_warn "curl not installed, skipping endpoint checks"
fi

# =============================================================================
# 8. DOCUMENTATION CHECK
# =============================================================================
section "8. Verifying Documentation"

docs=(
    "MONITORING_AND_OBSERVABILITY.md"
    "infra/monitoring/README.md"
    "DEPLOYMENT_GUIDE.md"
    "DOCUMENTATION_INDEX.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        word_count=$(wc -w < "$doc")
        if [ "$word_count" -gt 100 ]; then
            check_pass "$doc ($word_count words)"
        else
            check_fail "$doc seems incomplete ($word_count words)"
        fi
    else
        check_fail "$doc missing"
    fi
done

# =============================================================================
# 9. MAKEFILE TARGETS CHECK
# =============================================================================
section "9. Checking Makefile Targets"

if [ -f "Makefile" ]; then
    make_targets=(
        "monitoring-up"
        "monitoring-down"
        "monitoring-logs"
        "monitoring-status"
    )
    
    for target in "${make_targets[@]}"; do
        if grep -q "^$target:" Makefile; then
            check_pass "Makefile target '$target' exists"
        else
            check_warn "Makefile target '$target' not found"
        fi
    done
else
    check_fail "Makefile not found"
fi

# =============================================================================
# 10. GRAFANA DASHBOARD VALIDATION
# =============================================================================
section "10. Validating Grafana Dashboard"

if [ -f "infra/monitoring/grafana-learning-dashboard.json" ]; then
    # Check if it's valid JSON
    if command -v jq &> /dev/null; then
        if jq empty infra/monitoring/grafana-learning-dashboard.json 2>/dev/null; then
            check_pass "Dashboard JSON is valid"
            
            # Count panels
            panel_count=$(jq '.panels | length' infra/monitoring/grafana-learning-dashboard.json)
            if [ "$panel_count" -ge 10 ]; then
                check_pass "Dashboard has $panel_count panels (expected: 11)"
            else
                check_warn "Dashboard has only $panel_count panels (expected: 11)"
            fi
        else
            check_fail "Dashboard JSON is invalid"
        fi
    else
        check_warn "jq not installed, skipping JSON validation"
    fi
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}VERIFICATION SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Monitoring system is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start monitoring stack: cd infra/monitoring && docker-compose up -d"
    echo "2. Access Grafana: http://localhost:3001 (admin/admin)"
    echo "3. Access Prometheus: http://localhost:9090"
    echo "4. Import dashboard from grafana-learning-dashboard.json"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the output above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "1. Install missing dependencies: pip install -r server/requirements.txt"
    echo "2. Start monitoring stack: cd infra/monitoring && docker-compose up -d"
    echo "3. Check configuration files for syntax errors"
    echo ""
    exit 1
fi
