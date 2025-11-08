#!/bin/bash

echo "🧹 Starting complete cleanup of Vercel/Cloudflare code..."

# Files to remove
FILES_TO_DELETE=(
  "vercel.json"
  ".vercelignore"
  "wrangler.toml"
  "cloudflare.json"
  "_worker.js"
  "middleware.ts"
  "middleware.js"
  ".github/workflows/deploy-vercel.yml"
  ".github/workflows/deploy-cloudflare.yml"
  "api/vercel.js"
  "next.config.mjs"
)

# Directories to remove
DIRS_TO_DELETE=(
  ".vercel"
  ".wrangler"
  "workers"
  "functions"
  "edge-functions"
  "api"
)

# Remove files
for file in "${FILES_TO_DELETE[@]}"; do
  find . -name "$file" -type f -delete -print
done

# Remove directories
for dir in "${DIRS_TO_DELETE[@]}"; do
  find . -name "$dir" -type d -exec rm -rf {} + 2>/dev/null || true
done

# Remove provider-specific imports from code
echo "📝 Cleaning code references..."

# Remove Vercel imports
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -exec sed -i.bak \
  -e '/import.*from.*@vercel/d' \
  -e '/import.*from.*vercel/d' \
  -e '/export.*config.*runtime.*edge/d' \
  -e '/export.*config.*runtime.*nodejs/d' \
  {} \; 2>/dev/null || true

# Remove Cloudflare imports
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -exec sed -i.bak \
  -e '/import.*from.*@cloudflare/d' \
  -e '/import.*from.*wrangler/d' \
  -e '/Miniflare/d' \
  {} \; 2>/dev/null || true

# Clean up backup files
find . -name "*.bak" -type f -delete

# Clean environment files
echo "🔐 Cleaning environment variables..."
for env_file in .env .env.local .env.production .env.development; do
  if [ -f "$env_file" ]; then
    sed -i.bak '/VERCEL_/d; /KV_/d; /EDGE_CONFIG/d; /CLOUDFLARE_/d; /CF_/d; /UPSTASH_/d' "$env_file"
    rm -f "${env_file}.bak"
  fi
done

echo "✅ File cleanup complete!"
