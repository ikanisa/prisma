#!/bin/bash

# easyMO Project Setup Script
set -e

echo "🚀 Setting up easyMO project infrastructure..."

# Create necessary directories
mkdir -p {scripts,tests/integration,tests/e2e,tests/unit,.github/workflows}

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install workspace dependencies
echo "📦 Installing workspace dependencies..."
npm install --workspaces

# Set up git hooks (if needed)
if [ ! -f .git/hooks/pre-commit ]; then
  echo "🔧 Setting up git hooks..."
  cp scripts/pre-commit .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
fi

# Create .env files from examples
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📝 Created .env from example - please configure your environment variables"
fi

if [ ! -f supabase/functions/.env ]; then
  cp supabase/functions/.env.example supabase/functions/.env
  echo "📝 Created supabase functions .env from example"
fi

echo "✅ Setup complete! Next steps:"
echo "  1. Configure environment variables in .env files"
echo "  2. Run 'npm test' to verify setup"
echo "  3. Run 'npm run dev' to start development"