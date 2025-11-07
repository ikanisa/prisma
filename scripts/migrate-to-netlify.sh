#!/bin/bash
set -euo pipefail

echo "🚀 Starting migration to Netlify + Supabase architecture..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Backup existing data
echo -e "${YELLOW}📦 Step 1: Backing up current configuration...${NC}"
if [ -d ".vercel" ]; then
  echo "  ➜ Vercel configuration found, creating backup..."
  mv .vercel .vercel.backup 2>/dev/null || true
  echo -e "${GREEN}  ✓ Backup created: .vercel.backup${NC}"
fi

# Step 2: Remove old infrastructure
echo -e "${YELLOW}🧹 Step 2: Removing old deployment infrastructure...${NC}"

# Remove Vercel-specific files
echo "  ➜ Removing Vercel configuration..."
rm -f vercel.json .vercelignore 2>/dev/null || true

# Remove Cloudflare tunnel configs
echo "  ➜ Removing Cloudflare tunnel configuration..."
rm -rf infra/cloudflared 2>/dev/null || true
rm -f scripts/mac/install_cloudflared.sh scripts/mac/install_caddy_cloudflared.sh 2>/dev/null || true

# Remove deployment scripts
echo "  ➜ Removing old deployment scripts..."
rm -rf scripts/deploy 2>/dev/null || true

# Remove documentation
echo "  ➜ Removing outdated documentation..."
rm -f docs/local-caddy-cloudflare-tunnel.md 2>/dev/null || true

echo -e "${GREEN}  ✓ Old infrastructure removed${NC}"

# Step 3: Update dependencies
echo -e "${YELLOW}📚 Step 3: Installing dependencies...${NC}"
if command -v pnpm &> /dev/null; then
  pnpm install --frozen-lockfile
  echo -e "${GREEN}  ✓ Dependencies installed${NC}"
else
  echo -e "${RED}  ✗ pnpm not found. Please install pnpm: npm install -g pnpm@9.12.3${NC}"
  exit 1
fi

# Step 4: Validate configuration
echo -e "${YELLOW}🔍 Step 4: Validating configuration...${NC}"

# Check for netlify.toml
if [ -f "netlify.toml" ]; then
  echo -e "${GREEN}  ✓ netlify.toml found${NC}"
else
  echo -e "${RED}  ✗ netlify.toml not found${NC}"
  exit 1
fi

# Check for required environment variables
echo "  ➜ Checking for required environment variables..."
REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo -e "${YELLOW}  ⚠ $var not set (required for deployment)${NC}"
  else
    echo -e "${GREEN}  ✓ $var is set${NC}"
  fi
done

# Step 5: Run build validation
echo -e "${YELLOW}🔨 Step 5: Running build validation...${NC}"
echo "  ➜ Running typecheck..."
pnpm run typecheck
echo -e "${GREEN}  ✓ Typecheck passed${NC}"

echo "  ➜ Running linter..."
pnpm run lint || echo -e "${YELLOW}  ⚠ Lint issues found (non-blocking)${NC}"

echo "  ➜ Running tests..."
pnpm run test || echo -e "${YELLOW}  ⚠ Test failures found (review required)${NC}"

# Step 6: Database migration check
echo -e "${YELLOW}💾 Step 6: Checking database migrations...${NC}"
if [ -d "supabase/migrations" ]; then
  MIGRATION_COUNT=$(find supabase/migrations -name "*.sql" | wc -l)
  echo -e "${GREEN}  ✓ Found $MIGRATION_COUNT migration(s)${NC}"
  echo "  ➜ Remember to apply migrations to Supabase before deploying"
else
  echo -e "${YELLOW}  ⚠ No migrations directory found${NC}"
fi

# Step 7: Summary
echo ""
echo -e "${GREEN}✅ Migration preparation complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Set up your Netlify project:"
echo "     - Create a new site at https://app.netlify.com"
echo "     - Link this repository"
echo "     - Set build command: pnpm run build:netlify"
echo "     - Set publish directory: dist"
echo ""
echo "  2. Configure environment variables in Netlify:"
echo "     - NEXT_PUBLIC_SUPABASE_URL"
echo "     - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "     - SUPABASE_SERVICE_ROLE_KEY"
echo "     - SUPABASE_PROJECT_ID"
echo ""
echo "  3. Set up Supabase:"
echo "     - Create project at https://app.supabase.com"
echo "     - Apply database migrations"
echo "     - Deploy Edge Functions (if any)"
echo "     - Configure RLS policies"
echo ""
echo "  4. Configure GitHub Actions secrets:"
echo "     - NETLIFY_AUTH_TOKEN"
echo "     - NETLIFY_SITE_ID"
echo "     - NETLIFY_STAGING_SITE_ID (optional)"
echo ""
echo "  5. Test deployment:"
echo "     - Push to main branch to trigger deployment"
echo "     - Verify PWA functionality"
echo "     - Test offline capabilities"
echo ""
echo -e "${YELLOW}📖 For detailed instructions, see docs/deployment/netlify-supabase.md${NC}"
