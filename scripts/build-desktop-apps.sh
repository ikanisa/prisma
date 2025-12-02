#!/usr/bin/env bash

# build-desktop-apps.sh
# Builds both macOS desktop apps (Admin Panel and Client/Staff Portal) using Tauri

set -euo pipefail

# ========================================
# Configuration
# ========================================

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_APP_DIR="${REPO_ROOT}/desktop-app"
DIST_DIR="${REPO_ROOT}/dist/mac"

# Build modes: release (default) or debug
BUILD_MODE="${BUILD_MODE:-release}"

# App configurations
declare -A APPS=(
  ["admin"]="Admin Panel"
  ["client"]="Client Portal"
)

# ========================================
# Pre-flight checks
# ========================================

echo "========================================="
echo "Building Desktop Apps for macOS"
echo "========================================="
echo "Mode: $BUILD_MODE"
echo "Distribution: $DIST_DIR"
echo ""

# Check for required tools
command -v pnpm >/dev/null 2>&1 || { echo "ERROR: pnpm not found. Install with: npm install -g pnpm"; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "ERROR: Rust/Cargo not found. Install from: https://rustup.rs/"; exit 1; }

# Check desktop-app directory exists
if [ ! -d "$DESKTOP_APP_DIR" ]; then
  echo "ERROR: Desktop app directory not found: $DESKTOP_APP_DIR"
  exit 1
fi

# Create dist directory
mkdir -p "$DIST_DIR"

# ========================================
# Install dependencies
# ========================================

echo "Installing dependencies..."
cd "$DESKTOP_APP_DIR"

if ! pnpm install --frozen-lockfile; then
  echo "WARNING: pnpm install failed with frozen lockfile, retrying without..."
  pnpm install
fi

echo ""

# ========================================
# Build Admin Panel App
# ========================================

echo "========================================="
echo "1/2: Building Admin Panel App"
echo "========================================="

# Update tauri.conf.json for Admin Panel
cat > src-tauri/tauri.conf.json.tmp << 'EOF'
{
  "$schema": "https://schema.tauri.app/config/2.0",
  "productName": "Prisma Glow Admin Panel",
  "version": "1.0.0",
  "identifier": "com.prismaglow.admin",
  "build": {
    "beforeDevCommand": "cd .. && pnpm dev",
    "beforeBuildCommand": "cd .. && pnpm build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "Prisma Glow - Admin Panel",
        "width": 1400,
        "height": 900,
        "minWidth": 1024,
        "minHeight": 768,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "center": true
      }
    ],
    "security": {
      "csp": "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:* https://api.prismaglow.com; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "publisher": "Prisma Glow",
    "copyright": "Copyright © 2025 Prisma Glow",
    "category": "BusinessApp",
    "shortDescription": "Admin Panel - AI-powered operations suite",
    "longDescription": "Prisma Glow Admin Panel for managing accounting, tax, and audit operations with agent orchestration.",
    "resources": [],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    },
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "10.15",
      "entitlements": null,
      "exceptionDomain": ""
    }
  },
  "plugins": {
    "shell": {
      "open": true
    },
    "dialog": {
      "all": true,
      "ask": true,
      "confirm": true,
      "message": true,
      "open": true,
      "save": true
    },
    "fs": {
      "scope": [
        "$APPDATA/*",
        "$DOWNLOAD/*",
        "$DOCUMENT/*",
        "$DESKTOP/*"
      ]
    }
  }
}
EOF

# Backup original config
cp src-tauri/tauri.conf.json src-tauri/tauri.conf.json.backup
cp src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json

# Build
if [ "$BUILD_MODE" = "debug" ]; then
  pnpm run build:debug
else
  pnpm run build
fi

# Find and copy the built app
ADMIN_APP=$(find src-tauri/target/release/bundle/macos -name "*.app" -type d 2>/dev/null | head -1)
if [ -z "$ADMIN_APP" ] && [ "$BUILD_MODE" = "debug" ]; then
  ADMIN_APP=$(find src-tauri/target/debug/bundle/macos -name "*.app" -type d 2>/dev/null | head -1)
fi

if [ -n "$ADMIN_APP" ]; then
  cp -R "$ADMIN_APP" "$DIST_DIR/AdminPanel.app"
  echo "✓ Admin Panel built: $DIST_DIR/AdminPanel.app"
else
  echo "✗ ERROR: Admin Panel .app not found"
  exit 1
fi

echo ""

# ========================================
# Build Client/Staff Portal App
# ========================================

echo "========================================="
echo "2/2: Building Client/Staff Portal App"
echo "========================================="

# Update tauri.conf.json for Client Portal
cat > src-tauri/tauri.conf.json.tmp << 'EOF'
{
  "$schema": "https://schema.tauri.app/config/2.0",
  "productName": "Prisma Glow Client Portal",
  "version": "1.0.0",
  "identifier": "com.prismaglow.client",
  "build": {
    "beforeDevCommand": "cd .. && pnpm dev",
    "beforeBuildCommand": "cd .. && pnpm build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "Prisma Glow - Client Portal",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "center": true
      }
    ],
    "security": {
      "csp": "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:* https://api.prismaglow.com; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "publisher": "Prisma Glow",
    "copyright": "Copyright © 2025 Prisma Glow",
    "category": "BusinessApp",
    "shortDescription": "Client Portal - AI-powered operations suite",
    "longDescription": "Prisma Glow Client Portal for accessing accounting, tax, and audit services.",
    "resources": [],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    },
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "10.15",
      "entitlements": null,
      "exceptionDomain": ""
    }
  },
  "plugins": {
    "shell": {
      "open": true
    },
    "dialog": {
      "all": true,
      "ask": true,
      "confirm": true,
      "message": true,
      "open": true,
      "save": true
    },
    "fs": {
      "scope": [
        "$APPDATA/*",
        "$DOWNLOAD/*",
        "$DOCUMENT/*",
        "$DESKTOP/*"
      ]
    }
  }
}
EOF

cp src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json

# Clean previous build artifacts
rm -rf src-tauri/target/release/bundle src-tauri/target/debug/bundle

# Build
if [ "$BUILD_MODE" = "debug" ]; then
  pnpm run build:debug
else
  pnpm run build
fi

# Find and copy the built app
CLIENT_APP=$(find src-tauri/target/release/bundle/macos -name "*.app" -type d 2>/dev/null | head -1)
if [ -z "$CLIENT_APP" ] && [ "$BUILD_MODE" = "debug" ]; then
  CLIENT_APP=$(find src-tauri/target/debug/bundle/macos -name "*.app" -type d 2>/dev/null | head -1)
fi

if [ -n "$CLIENT_APP" ]; then
  cp -R "$CLIENT_APP" "$DIST_DIR/ClientPortal.app"
  echo "✓ Client Portal built: $DIST_DIR/ClientPortal.app"
else
  echo "✗ ERROR: Client Portal .app not found"
  exit 1
fi

# Restore original config
mv src-tauri/tauri.conf.json.backup src-tauri/tauri.conf.json
rm -f src-tauri/tauri.conf.json.tmp

echo ""

# ========================================
# Summary
# ========================================

echo "========================================="
echo "BUILD COMPLETE"
echo "========================================="
echo ""
echo "Built apps:"
echo "  Admin Panel:  $DIST_DIR/AdminPanel.app"
echo "  Client Portal: $DIST_DIR/ClientPortal.app"
echo ""
echo "Next steps:"
echo "  1. Sign apps: ./scripts/sign_all_apps.sh"
echo "  2. Test apps: open $DIST_DIR/AdminPanel.app"
echo "  3. Distribute signed apps to internal users"
echo ""
