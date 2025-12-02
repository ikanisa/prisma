#!/usr/bin/env bash

# build-real-tauri-apps.sh  
# Builds REAL Tauri desktop apps with persistent UI

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_APP_DIR="$REPO_ROOT/desktop-app"
DIST_DIR="$REPO_ROOT/dist/mac"

echo "╔═════════════════════════════════════════════════════════════════╗"
echo "║   Building REAL Tauri Desktop Apps with Persistent UI          ║"
echo "╚═════════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v cargo &> /dev/null; then
  echo "❌ Rust not found!"
  echo ""
  echo "Install Rust:"
  echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  echo ""
  exit 1
fi

echo "✓ Rust: $(rustc --version)"

if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm not found!"
  echo "Install: npm install -g pnpm@9.12.3"
  exit 1
fi

echo "✓ pnpm: $(pnpm --version)"
echo ""

# Create dist directory
mkdir -p "$DIST_DIR"

# Install dependencies
cd "$DESKTOP_APP_DIR"
echo "Installing dependencies..."
pnpm install --silent 2>/dev/null || pnpm install

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "BUILDING: Admin Panel App"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configure for Admin Panel
cat > src-tauri/tauri.conf.json << 'EOF'
{
  "$schema": "https://schema.tauri.app/config/2.0",
  "productName": "Prisma Glow - Admin Panel",
  "version": "1.0.0",
  "identifier": "com.prismaglow.admin",
  "build": {
    "beforeDevCommand": "",
    "beforeBuildCommand": "",
    "frontendDist": ".."
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "Prisma Glow - Admin Panel",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "center": true,
        "url": "index.html"
      }
    ],
    "security": {
      "csp": "default-src 'self' 'unsafe-inline' 'unsafe-eval'"
    }
  }
}
EOF

# Build Admin Panel
echo "Building..."
pnpm run build

# Copy to dist
if [ -d "src-tauri/target/release/bundle/macos" ]; then
  APP=$(find src-tauri/target/release/bundle/macos -name "*.app" -type d | head -1)
  if [ -n "$APP" ]; then
    rm -rf "$DIST_DIR/AdminPanel.app"
    cp -R "$APP" "$DIST_DIR/AdminPanel.app"
    echo "✓ Created: $DIST_DIR/AdminPanel.app"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "BUILDING: Client Portal App"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configure for Client Portal
cat > src-tauri/tauri.conf.json << 'EOF'
{
  "$schema": "https://schema.tauri.app/config/2.0",
  "productName": "Prisma Glow - Client Portal",
  "version": "1.0.0",
  "identifier": "com.prismaglow.client",
  "build": {
    "beforeDevCommand": "",
    "beforeBuildCommand": "",
    "frontendDist": ".."
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "Prisma Glow - Client Portal",
        "width": 1000,
        "height": 700,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "center": true,
        "url": "client-portal.html"
      }
    ],
    "security": {
      "csp": "default-src 'self' 'unsafe-inline' 'unsafe-eval'"
    }
  }
}
EOF

# Build Client Portal
echo "Building..."
pnpm run build

# Copy to dist
if [ -d "src-tauri/target/release/bundle/macos" ]; then
  APP=$(find src-tauri/target/release/bundle/macos -name "*.app" -type d | head -1)
  if [ -n "$APP" ]; then
    rm -rf "$DIST_DIR/ClientPortal.app"
    cp -R "$APP" "$DIST_DIR/ClientPortal.app"
    echo "✓ Created: $DIST_DIR/ClientPortal.app"
  fi
fi

echo ""
echo "╔═════════════════════════════════════════════════════════════════╗"
echo "║                    BUILD COMPLETE!                              ║"
echo "╚═════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Admin Panel:    dist/mac/AdminPanel.app"
echo "✅ Client Portal:  dist/mac/ClientPortal.app"
echo ""
echo "Next steps:"
echo "  1. Sign:  ./scripts/sign_all_apps.sh"
echo "  2. Test:  open dist/mac/AdminPanel.app"
echo ""
