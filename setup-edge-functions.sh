#!/bin/bash
# Supabase Edge Functions and Secrets Setup Guide
# This script documents the manual steps needed to deploy edge functions and set secrets

set -e

PROJECT_REF="rcocfusrqrornukrnkln"
SUPABASE_URL="https://rcocfusrqrornukrnkln.supabase.co"

echo "🚀 Supabase Edge Functions & Secrets Setup"
echo "==========================================="
echo ""
echo "⚠️  IMPORTANT: This requires project owner or admin access"
echo ""
echo "Project: $PROJECT_REF"
echo "URL: $SUPABASE_URL"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "📋 Step 1: Login to Supabase CLI"
echo "================================"
echo ""
echo "Run this command:"
echo "  supabase login"
echo ""
echo "This will open a browser to authenticate with your Supabase account."
echo "Press Enter when you've completed login..."
read -r

echo ""
echo "📋 Step 2: Link to Your Project"
echo "================================"
echo ""
echo "Run this command:"
echo "  supabase link --project-ref $PROJECT_REF"
echo ""
echo "Press Enter when you've linked the project..."
read -r

echo ""
echo "📋 Step 3: Set Required Secrets"
echo "================================"
echo ""
echo "The edge function requires these secrets:"
echo ""
echo "1. OPENAI_API_KEY (Required for AI features)"
echo "   Get from: https://platform.openai.com/api-keys"
echo ""
echo "Run these commands:"
echo ""
echo "  supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here --project-ref $PROJECT_REF"
echo ""
echo "Optional secrets for additional features:"
echo ""
echo "  supabase secrets set DATABASE_URL=postgresql://postgres:[PASSWORD]@db.$PROJECT_REF.supabase.co:5432/postgres --project-ref $PROJECT_REF"
echo "  supabase secrets set REDIS_URL=redis://your-redis-url --project-ref $PROJECT_REF"
echo "  supabase secrets set SENTRY_DSN=your-sentry-dsn --project-ref $PROJECT_REF"
echo ""
echo "Press Enter when you've set the secrets..."
read -r

echo ""
echo "📋 Step 4: Deploy Edge Function"
echo "================================"
echo ""
echo "Run this command to deploy the 'api' edge function:"
echo ""
echo "  supabase functions deploy api --project-ref $PROJECT_REF"
echo ""
echo "This will deploy: supabase/functions/api/index.ts"
echo ""
echo "Press Enter when deployment is complete..."
read -r

echo ""
echo "📋 Step 5: Verify Deployment"
echo "=============================="
echo ""
echo "Test the edge function health endpoint:"
echo ""
echo "  curl https://$PROJECT_REF.supabase.co/functions/v1/api/health"
echo ""
echo "Expected response: {\"status\":\"ok\",\"timestamp\":\"...\"}"
echo ""

echo ""
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "Your edge function should now be deployed at:"
echo "  https://$PROJECT_REF.supabase.co/functions/v1/api"
echo ""
echo "Available endpoints:"
echo "  - GET  /api/health     - Health check (no auth required)"
echo "  - POST /api/chat       - Chat with AI (requires auth)"
echo "  - POST /api/rag        - RAG search (requires auth)"
echo "  - POST /api/analytics  - Track analytics (requires auth)"
echo ""
echo "Next steps:"
echo "1. Test the endpoints with your frontend"
echo "2. Monitor function logs in Supabase Dashboard"
echo "3. Set up custom domains if needed"
echo ""
