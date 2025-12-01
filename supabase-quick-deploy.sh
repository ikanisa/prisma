#!/bin/bash
# Supabase Quick Deploy Script
# Automates edge function deployment and secret setup

set -e

PROJECT_REF="rcocfusrqrornukrnkln"
SUPABASE_URL="https://rcocfusrqrornukrnkln.supabase.co"

echo "🚀 Prisma Glow - Supabase Quick Deploy"
echo "======================================"
echo ""
echo "Project: $PROJECT_REF"
echo "URL: $SUPABASE_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi
echo -e "${GREEN}✓ Supabase CLI found${NC}"

if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ curl found${NC}"

echo ""

# Check if already logged in
echo "🔐 Checking Supabase authentication..."
if supabase projects list &> /dev/null; then
    echo -e "${GREEN}✓ Already logged in to Supabase${NC}"
else
    echo -e "${YELLOW}⚠️  Not logged in${NC}"
    echo "Opening browser for authentication..."
    supabase login
fi

echo ""

# Link project
echo "🔗 Linking to project..."
if supabase link --project-ref $PROJECT_REF 2>&1 | grep -q "already linked"; then
    echo -e "${GREEN}✓ Project already linked${NC}"
else
    supabase link --project-ref $PROJECT_REF
    echo -e "${GREEN}✓ Project linked successfully${NC}"
fi

echo ""

# Set secrets
echo "�� Setting up secrets..."
echo ""
echo -e "${YELLOW}REQUIRED:${NC} OpenAI API Key"
echo "Get your key from: https://platform.openai.com/api-keys"
echo ""
read -p "Enter your OpenAI API key (or press Enter to skip): " OPENAI_KEY

if [ -n "$OPENAI_KEY" ]; then
    if supabase secrets set OPENAI_API_KEY="$OPENAI_KEY" --project-ref $PROJECT_REF; then
        echo -e "${GREEN}✓ OpenAI API key set${NC}"
    else
        echo -e "${RED}❌ Failed to set OpenAI API key${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipped OpenAI API key (you can set it later)${NC}"
fi

echo ""

# Optional: Database URL
read -p "Do you want to set DATABASE_URL secret? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Get your database password from: $SUPABASE_URL/settings/database"
    read -p "Enter database password: " DB_PASSWORD
    if [ -n "$DB_PASSWORD" ]; then
        DB_URL="postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres"
        if supabase secrets set DATABASE_URL="$DB_URL" --project-ref $PROJECT_REF; then
            echo -e "${GREEN}✓ Database URL set${NC}"
        else
            echo -e "${RED}❌ Failed to set database URL${NC}"
        fi
    fi
fi

echo ""

# List current secrets
echo "📝 Current secrets:"
supabase secrets list --project-ref $PROJECT_REF

echo ""

# Deploy edge function
echo "🚀 Deploying edge function..."
if supabase functions deploy api --project-ref $PROJECT_REF; then
    echo -e "${GREEN}✓ Edge function deployed successfully${NC}"
else
    echo -e "${RED}❌ Edge function deployment failed${NC}"
    echo "Check logs with: supabase functions logs api --project-ref $PROJECT_REF"
    exit 1
fi

echo ""

# Test deployment
echo "🧪 Testing deployment..."
HEALTH_URL="https://$PROJECT_REF.supabase.co/functions/v1/api/health"
echo "Testing: $HEALTH_URL"

if curl -s "$HEALTH_URL" | grep -q "ok"; then
    echo -e "${GREEN}✓ Health check passed!${NC}"
    echo ""
    curl -s "$HEALTH_URL" | python3 -m json.tool || curl -s "$HEALTH_URL"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "Check logs with: supabase functions logs api --project-ref $PROJECT_REF"
fi

echo ""
echo ""
echo "════════════════════════════════════════"
echo "✅ Deployment Complete!"
echo "════════════════════════════════════════"
echo ""
echo "📍 Your edge function is live at:"
echo "   $SUPABASE_URL/functions/v1/api"
echo ""
echo "Available endpoints:"
echo "  • GET  /api/health     - Health check (no auth)"
echo "  • POST /api/chat       - Chat with AI (auth required)"
echo "  • POST /api/rag        - RAG search (auth required)"
echo "  • POST /api/analytics  - Track events (auth required)"
echo ""
echo "📊 View logs:"
echo "   supabase functions logs api --project-ref $PROJECT_REF"
echo ""
echo "🔧 View secrets:"
echo "   supabase secrets list --project-ref $PROJECT_REF"
echo ""
echo "📖 Dashboard:"
echo "   $SUPABASE_URL"
echo ""
echo "Next steps:"
echo "  1. Update your app's .env files with Supabase credentials"
echo "  2. Test the endpoints from your frontend/backend"
echo "  3. Monitor function logs for any errors"
echo ""
