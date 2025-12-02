#!/usr/bin/env bash

# create-demo-apps.sh
# Creates demo .app bundles for testing the signing scripts
# This allows you to test the signing workflow without building full Tauri apps

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${REPO_ROOT}/dist/mac"

echo "========================================="
echo "Creating Demo Desktop Apps"
echo "========================================="
echo ""
echo "This creates minimal .app bundles for testing"
echo "the code signing process."
echo ""

# Create dist directory
mkdir -p "$DIST_DIR"

# ========================================
# Create Admin Panel Demo App
# ========================================

echo "Creating AdminPanel.app..."

ADMIN_APP="$DIST_DIR/AdminPanel.app"
mkdir -p "$ADMIN_APP/Contents/MacOS"
mkdir -p "$ADMIN_APP/Contents/Resources"

# Create Info.plist
cat > "$ADMIN_APP/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>AdminPanel</string>
    <key>CFBundleIdentifier</key>
    <string>com.prismaglow.admin</string>
    <key>CFBundleName</key>
    <string>Prisma Glow Admin Panel</string>
    <key>CFBundleDisplayName</key>
    <string>Prisma Glow - Admin Panel</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# Create executable
cat > "$ADMIN_APP/Contents/MacOS/AdminPanel" << 'EOF'
#!/bin/bash
osascript -e 'display dialog "Prisma Glow Admin Panel\n\nThis is a demo app for testing code signing.\n\nVersion: 1.0.0" buttons {"OK"} default button "OK" with icon note with title "Admin Panel"'
EOF

chmod +x "$ADMIN_APP/Contents/MacOS/AdminPanel"

echo "✓ AdminPanel.app created"

# ========================================
# Create Client Portal Demo App
# ========================================

echo "Creating ClientPortal.app..."

CLIENT_APP="$DIST_DIR/ClientPortal.app"
mkdir -p "$CLIENT_APP/Contents/MacOS"
mkdir -p "$CLIENT_APP/Contents/Resources"

# Create Info.plist
cat > "$CLIENT_APP/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>ClientPortal</string>
    <key>CFBundleIdentifier</key>
    <string>com.prismaglow.client</string>
    <key>CFBundleName</key>
    <string>Prisma Glow Client Portal</string>
    <key>CFBundleDisplayName</key>
    <string>Prisma Glow - Client Portal</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# Create executable
cat > "$CLIENT_APP/Contents/MacOS/ClientPortal" << 'EOF'
#!/bin/bash
osascript -e 'display dialog "Prisma Glow Client Portal\n\nThis is a demo app for testing code signing.\n\nVersion: 1.0.0" buttons {"OK"} default button "OK" with icon note with title "Client Portal"'
EOF

chmod +x "$CLIENT_APP/Contents/MacOS/ClientPortal"

echo "✓ ClientPortal.app created"

echo ""
echo "========================================="
echo "DEMO APPS CREATED"
echo "========================================="
echo ""
echo "Created demo apps:"
echo "  Admin Panel:   $ADMIN_APP"
echo "  Client Portal: $CLIENT_APP"
echo ""
echo "These are minimal macOS apps that display a dialog when launched."
echo "Use them to test the code signing workflow:"
echo ""
echo "  1. Test signing: ./scripts/sign_all_apps.sh"
echo "  2. Test launch:  open $ADMIN_APP"
echo ""
echo "Note: These are demo apps. For production builds, use:"
echo "      ./scripts/build-desktop-apps.sh"
echo ""
