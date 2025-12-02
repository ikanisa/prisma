#!/bin/bash
set -e

echo "🔨 Building Prisma Glow Desktop App (Development Build)"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Check if Rust/Cargo is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo is not installed. Please install it first:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

echo -e "${BLUE}📦 Installing dependencies...${NC}"
pnpm install

echo -e "${BLUE}🏗️  Building frontend...${NC}"
pnpm run build:desktop-ui

echo -e "${BLUE}🦀 Building Tauri app (debug mode)...${NC}"
cd src-tauri
cargo build
cd ..

echo -e "${BLUE}📱 Creating app bundle...${NC}"
pnpm tauri build --debug

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo -e "${YELLOW}📍 Build location:${NC}"
echo "   macOS: src-tauri/target/debug/bundle/macos/Prisma Glow.app"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "   1. Test the app locally:"
echo "      open 'src-tauri/target/debug/bundle/macos/Prisma Glow.app'"
echo ""
echo "   2. To distribute to team members:"
echo "      - Copy the .app to a shared location"
echo "      - Or create a DMG: pnpm tauri build --debug --bundles dmg"
echo ""
echo -e "${YELLOW}⚠️  First-time users:${NC}"
echo "   Users will need to right-click → Open on first launch"
echo "   See INTERNAL_DEPLOYMENT.md for details"
echo ""
