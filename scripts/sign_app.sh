#!/usr/bin/env bash

# sign_app.sh
# Signs a single macOS .app bundle with the specified identity.
# Usage: ./scripts/sign_app.sh /path/to/App.app "Signing Identity" [/path/to/entitlements.plist]

set -euo pipefail

# Check arguments
if [ $# -lt 2 ]; then
  echo "ERROR: Missing required arguments."
  echo ""
  echo "Usage: $0 <app-bundle-path> <signing-identity> [entitlements-file]"
  echo ""
  echo "Example:"
  echo "  $0 ./dist/mac/AdminPanel.app \"Inhouse Dev Signing\""
  echo "  $0 ./dist/mac/AdminPanel.app \"Developer ID Application: Company (TEAM)\" ./entitlements.plist"
  echo ""
  exit 1
fi

APP_PATH="$1"
IDENTITY="$2"
ENTITLEMENTS="${3:-}"

# Validate app bundle exists
if [ ! -d "$APP_PATH" ]; then
  echo "ERROR: App bundle not found: $APP_PATH"
  exit 1
fi

echo "========================================="
echo "Signing App Bundle"
echo "========================================="
echo "App:       $APP_PATH"
echo "Identity:  $IDENTITY"
echo "Entitlements: ${ENTITLEMENTS:-None}"
echo ""

# Build codesign command
CODESIGN_ARGS=(
  --force
  --deep
  --options runtime
  --sign "$IDENTITY"
  --timestamp
)

# Add entitlements if provided
if [ -n "$ENTITLEMENTS" ]; then
  if [ ! -f "$ENTITLEMENTS" ]; then
    echo "ERROR: Entitlements file not found: $ENTITLEMENTS"
    exit 1
  fi
  CODESIGN_ARGS+=(--entitlements "$ENTITLEMENTS")
fi

# Sign the app
echo "Running codesign..."
if codesign "${CODESIGN_ARGS[@]}" "$APP_PATH"; then
  echo "✓ Code signing completed successfully"
else
  echo "✗ Code signing FAILED"
  exit 1
fi

echo ""
echo "========================================="
echo "Verifying Signature"
echo "========================================="

# Verify signature
echo "Running codesign --verify..."
if codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>&1; then
  echo "✓ Signature verification PASSED"
else
  echo "✗ Signature verification FAILED"
  exit 1
fi

echo ""
echo "========================================="
echo "Gatekeeper Assessment"
echo "========================================="

# Assess with Gatekeeper
echo "Running spctl --assess..."
if spctl --assess --verbose=4 --type execute "$APP_PATH" 2>&1; then
  echo "✓ Gatekeeper assessment PASSED"
else
  EXIT_CODE=$?
  echo "⚠ Gatekeeper assessment returned code: $EXIT_CODE"
  echo ""
  echo "This is EXPECTED for self-signed certificates (internal use)."
  echo "Internal users will need to right-click → Open on first launch."
  echo ""
  echo "If using an Apple Developer ID certificate, this should pass."
fi

echo ""
echo "========================================="
echo "SUCCESS"
echo "========================================="
echo "App signed: $APP_PATH"
echo "Identity: $IDENTITY"
echo ""
