#!/bin/bash

# easyMO Deployment Script
set -e

echo "🚀 Starting easyMO deployment..."

# Build all packages
echo "📦 Building packages..."
npm run build --workspaces

# Run tests before deployment
echo "🧪 Running tests..."
npm test

# Deploy edge functions
echo "📡 Deploying edge functions..."
cd packages/edge-functions
npm run deploy
cd ../..

# Deploy main application (if configured)
if [ ! -z "$DEPLOYMENT_URL" ]; then
  echo "🌐 Deploying main application..."
  npm run build
  # Add your deployment command here
fi

echo "✅ Deployment complete!"