#!/usr/bin/env bash

# sign_all_apps.sh
# Signs both the Admin Panel and Client/Staff Portal macOS apps.
# Uses SIGNING_IDENTITY environment variable or defaults to "Inhouse Dev Signing".

set -euo pipefail

# ========================================
# Configuration
# ========================================

# App bundle paths - UPDATE THESE to match your actual build output
ADMIN_APP_PATH="./dist/mac/AdminPanel.app"
CLIENT_APP_PATH="./dist/mac/ClientPortal.app"

# Signing identity
# Use environment variable if set, otherwise default to internal self-signed cert
# To switch to Apple Developer ID, either:
#   1. Set environment variable: export SIGNING_IDENTITY="Developer ID Application: Company (TEAM)"
#   2. Or change the default below to: DEFAULT_IDENTITY="Developer ID Application: Company (TEAM)"
DEFAULT_IDENTITY="Inhouse Dev Signing"
IDENTITY="${SIGNING_IDENTITY:-$DEFAULT_IDENTITY}"

# Optional: path to entitlements file (leave empty if not using)
ENTITLEMENTS_FILE=""

# ========================================
# Pre-flight checks
# ========================================

echo "========================================="
echo "Sign All Apps"
echo "========================================="
echo "Identity: $IDENTITY"
echo "Admin app: $ADMIN_APP_PATH"
echo "Client app: $CLIENT_APP_PATH"
echo ""

# Check that sign_app.sh exists
SIGN_SCRIPT="./scripts/sign_app.sh"
if [ ! -f "$SIGN_SCRIPT" ]; then
  echo "ERROR: Sign script not found: $SIGN_SCRIPT"
  exit 1
fi

# Make sure sign_app.sh is executable
chmod +x "$SIGN_SCRIPT"

# ========================================
# Sign Admin Panel App
# ========================================

echo "========================================="
echo "1/2: Signing Admin Panel App"
echo "========================================="

if [ -d "$ADMIN_APP_PATH" ]; then
  if [ -n "$ENTITLEMENTS_FILE" ]; then
    "$SIGN_SCRIPT" "$ADMIN_APP_PATH" "$IDENTITY" "$ENTITLEMENTS_FILE"
  else
    "$SIGN_SCRIPT" "$ADMIN_APP_PATH" "$IDENTITY"
  fi
  echo "✓ Admin Panel signed successfully"
else
  echo "⚠ WARNING: Admin Panel app not found at: $ADMIN_APP_PATH"
  echo "Skipping Admin Panel signing."
fi

echo ""

# ========================================
# Sign Client/Staff Portal App
# ========================================

echo "========================================="
echo "2/2: Signing Client/Staff Portal App"
echo "========================================="

if [ -d "$CLIENT_APP_PATH" ]; then
  if [ -n "$ENTITLEMENTS_FILE" ]; then
    "$SIGN_SCRIPT" "$CLIENT_APP_PATH" "$IDENTITY" "$ENTITLEMENTS_FILE"
  else
    "$SIGN_SCRIPT" "$CLIENT_APP_PATH" "$IDENTITY"
  fi
  echo "✓ Client/Staff Portal signed successfully"
else
  echo "⚠ WARNING: Client/Staff Portal app not found at: $CLIENT_APP_PATH"
  echo "Skipping Client/Staff Portal signing."
fi

echo ""

# ========================================
# Summary
# ========================================

echo "========================================="
echo "ALL APPS SIGNED SUCCESSFULLY"
echo "========================================="
echo ""
echo "Apps signed with identity: $IDENTITY"
echo ""
echo "Admin Panel: $ADMIN_APP_PATH"
echo "Client Portal: $CLIENT_APP_PATH"
echo ""
echo "Both apps are ready for distribution to internal users."
echo ""
