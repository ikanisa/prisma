#!/bin/bash
set -e

echo "╔═══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                               ║"
echo "║                     Testing Auto-Classification API                          ║"
echo "║                                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="http://localhost:3001/api/v1"

echo "⏳ Building gateway..."
pnpm --filter @prisma-glow/gateway build --silent

echo ""
echo "🚀 Starting gateway server..."
pnpm --filter @prisma-glow/gateway start &
GATEWAY_PID=$!

echo "   Gateway PID: $GATEWAY_PID"
echo "   Waiting 5 seconds for server to start..."
sleep 5

# Check if gateway is running
if ! kill -0 $GATEWAY_PID 2>/dev/null; then
    echo -e "${RED}✗ Gateway failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Gateway is running${NC}"
echo ""

# Function to test endpoint
test_endpoint() {
    local method=$1
    local path=$2
    local data=$3
    local description=$4
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test: $description"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Request: $method $path"
    
    if [ -n "$data" ]; then
        echo "Data: $data"
        response=$(curl -s -X $method "${API_BASE}${path}" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X $method "${API_BASE}${path}")
    fi
    
    echo "Response:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
}

# Test 1: Health check (if exists)
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "Health Checks"
echo "═══════════════════════════════════════════════════════════════════════════════"
curl -s http://localhost:3001/health 2>/dev/null | jq '.' || echo "No /health endpoint"
echo ""

# Test 2: Create web source with auto-classification
test_endpoint "POST" "/web-sources" \
    '{"name":"IFRS Foundation","base_url":"https://ifrs.org","status":"ACTIVE"}' \
    "Create IFRS source (should auto-classify as IFRS/GLOBAL)"

test_endpoint "POST" "/web-sources" \
    '{"name":"Rwanda Revenue Authority","base_url":"https://rra.gov.rw","status":"ACTIVE"}' \
    "Create RRA source (should auto-classify as TAX/RW)"

test_endpoint "POST" "/web-sources" \
    '{"name":"Malta CFR","base_url":"https://cfr.gov.mt","status":"ACTIVE"}' \
    "Create CFR source (should auto-classify as TAX/MT)"

# Test 3: List web sources
test_endpoint "GET" "/web-sources" "" \
    "List all web sources"

# Test 4: Filter by category
test_endpoint "GET" "/web-sources?category=TAX" "" \
    "Filter sources by category=TAX"

# Test 5: Filter by jurisdiction
test_endpoint "GET" "/web-sources?jurisdiction=RW" "" \
    "Filter sources by jurisdiction=RW"

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "Cleanup"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "Stopping gateway (PID: $GATEWAY_PID)..."
kill $GATEWAY_PID 2>/dev/null || true
echo ""
echo "✅ API endpoint tests complete!"
echo ""
echo "NOTE: Some tests may fail if DATABASE_URL is not configured."
echo "The classification logic itself is working (verified in test-classification.ts)"
