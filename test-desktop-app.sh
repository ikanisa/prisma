#!/bin/bash

# Desktop App Build & Test Script
# Consolidates Tauri v1.6 (src-tauri) implementation

set -e

echo "========================================="
echo "  Desktop App Build & Test"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Rust/Cargo not installed${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Rust $(rustc --version)${NC}"
echo -e "${GREEN}✅ Cargo $(cargo --version)${NC}"
echo -e "${GREEN}✅ pnpm $(pnpm --version)${NC}"
echo ""

# Build Next.js app first
echo "📦 Building Next.js application..."
cd apps/web
if [ ! -d "out" ]; then
    echo "Building Next.js static export..."
    pnpm build
else
    echo "Next.js build already exists (apps/web/out)"
fi
cd ../..
echo -e "${GREEN}✅ Next.js ready${NC}"
echo ""

# Check Rust compilation
echo "🦀 Checking Rust compilation..."
cd src-tauri
if cargo check --quiet 2>&1 | grep -q "error"; then
    echo -e "${RED}❌ Rust compilation failed${NC}"
    cargo check
    exit 1
fi
echo -e "${GREEN}✅ Rust code compiles${NC}"
cd ..
echo ""

# Check environment
echo "🔐 Checking environment variables..."
if [ -f "apps/web/.env.local" ]; then
    echo -e "${GREEN}✅ .env.local exists${NC}"
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" apps/web/.env.local; then
        echo -e "${GREEN}✅ Supabase URL configured${NC}"
    else
        echo -e "${YELLOW}⚠️  NEXT_PUBLIC_SUPABASE_URL not set${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  apps/web/.env.local not found${NC}"
    echo ""
    echo "Create apps/web/.env.local with:"
    echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo "NEXT_PUBLIC_API_URL=https://api.prisma-glow.com"
fi
echo ""

# Summary
echo "========================================="
echo "  Build Check Complete"
echo "========================================="
echo ""
echo "To run the desktop app:"
echo ""
echo "  Option 1: Development mode (with Next.js hot reload)"
echo "    cd apps/web && pnpm dev"
echo "    # In another terminal:"
echo "    cd src-tauri && cargo run"
echo ""
echo "  Option 2: Production build"
echo "    cd src-tauri && cargo build --release"
echo "    ./target/release/prisma-glow"
echo ""
echo "  Option 3: Using Tauri CLI (if installed)"
echo "    cargo install tauri-cli"
echo "    cargo tauri dev"
echo ""
echo "========================================="
echo ""

# Check if we can launch
echo "🚀 Ready to launch?"
read -p "Launch desktop app now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Launching desktop app..."
    cd src-tauri
    cargo run
fi
