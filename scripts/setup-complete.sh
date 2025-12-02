#!/usr/bin/env bash

# setup-complete.sh
# Automated setup script that does everything possible programmatically
# Some steps require manual GUI interaction (marked below)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║          🚀 COMPLETE DESKTOP DEPLOYMENT SETUP                     ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# STEP 1: Create Demo Apps (AUTOMATED)
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1/6: Creating Demo Apps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -d "dist/mac/AdminPanel.app" ] && [ -d "dist/mac/ClientPortal.app" ]; then
  echo "✓ Demo apps already exist"
else
  ./scripts/create-demo-apps.sh
fi

echo ""

# ============================================================================
# STEP 2: Check for Certificate (MANUAL STEP)
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2/6: Checking for Code Signing Certificate"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

CERT_COUNT=$(security find-identity -v -p codesigning | grep -c "Inhouse Dev Signing" || true)

if [ "$CERT_COUNT" -eq 0 ]; then
  echo "⚠️  NO CERTIFICATE FOUND"
  echo ""
  echo "You need to create a code-signing certificate manually."
  echo "This is a one-time setup that requires GUI interaction."
  echo ""
  echo "═══════════════════════════════════════════════════════════════════"
  echo "MANUAL ACTION REQUIRED:"
  echo "═══════════════════════════════════════════════════════════════════"
  echo ""
  echo "1. Open Keychain Access:"
  echo "   • Press Cmd+Space and type 'Keychain Access'"
  echo "   • Or: Applications → Utilities → Keychain Access"
  echo ""
  echo "2. Create Certificate:"
  echo "   • Menu: Keychain Access → Certificate Assistant → Create a Certificate"
  echo ""
  echo "3. Fill in the form:"
  echo "   • Name: Inhouse Dev Signing"
  echo "   • Identity Type: Self-Signed Root"
  echo "   • Certificate Type: Code Signing"
  echo "   • Check: ☑ Let me override defaults"
  echo "   • Click Continue through dialogs (accept defaults)"
  echo ""
  echo "4. Choose Location:"
  echo "   • Select: login (keychain)"
  echo "   • Click Create"
  echo ""
  echo "5. Trust the Certificate:"
  echo "   • Find 'Inhouse Dev Signing' in Keychain Access"
  echo "   • Double-click it"
  echo "   • Expand 'Trust' section"
  echo "   • Set 'Code Signing' to 'Always Trust'"
  echo "   • Close (enter your Mac password)"
  echo ""
  echo "6. Return here and run this script again:"
  echo "   ./scripts/setup-complete.sh"
  echo ""
  echo "═══════════════════════════════════════════════════════════════════"
  echo ""
  
  # Open Keychain Access for user
  echo "Opening Keychain Access for you..."
  open -a "Keychain Access" 2>/dev/null || true
  
  exit 1
else
  echo "✓ Found certificate: Inhouse Dev Signing"
  security find-identity -v -p codesigning | grep "Inhouse Dev Signing"
fi

echo ""

# ============================================================================
# STEP 3: Sign Apps (AUTOMATED)
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3/6: Signing Apps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

./scripts/sign_all_apps.sh

echo ""

# ============================================================================
# STEP 4: Verify Signatures (AUTOMATED)
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4/6: Verifying Signatures"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Verifying AdminPanel.app..."
codesign --verify --deep --strict --verbose=2 dist/mac/AdminPanel.app 2>&1
echo "✓ AdminPanel signature valid"
echo ""

echo "Verifying ClientPortal.app..."
codesign --verify --deep --strict --verbose=2 dist/mac/ClientPortal.app 2>&1
echo "✓ ClientPortal signature valid"
echo ""

# ============================================================================
# STEP 5: Export Certificate for CI/CD (SEMI-AUTOMATED)
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 5/6: Exporting Certificate for CI/CD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

CERT_FILE="$REPO_ROOT/InhouseDevSigning.p12"
BASE64_FILE="$REPO_ROOT/cert.base64"

if [ -f "$CERT_FILE" ]; then
  echo "✓ Certificate already exported: $CERT_FILE"
else
  echo "⚠️  Certificate needs to be exported"
  echo ""
  echo "═══════════════════════════════════════════════════════════════════"
  echo "MANUAL ACTION REQUIRED:"
  echo "═══════════════════════════════════════════════════════════════════"
  echo ""
  echo "1. In Keychain Access, find 'Inhouse Dev Signing'"
  echo "2. Right-click → Export 'Inhouse Dev Signing...'"
  echo "3. Save as: $CERT_FILE"
  echo "4. Format: Personal Information Exchange (.p12)"
  echo "5. Enter a STRONG password (you'll need it for GitHub)"
  echo "6. Save the password somewhere secure!"
  echo ""
  echo "Opening Keychain Access..."
  open -a "Keychain Access" 2>/dev/null || true
  echo ""
  echo "After exporting, run this script again:"
  echo "  ./scripts/setup-complete.sh"
  echo ""
  echo "═══════════════════════════════════════════════════════════════════"
  echo ""
  exit 1
fi

# Base64 encode the certificate
echo "Creating base64 encoded certificate..."
base64 -i "$CERT_FILE" -o "$BASE64_FILE"
echo "✓ Certificate encoded: $BASE64_FILE"
echo ""

# ============================================================================
# STEP 6: GitHub Secrets Instructions (MANUAL)
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 6/6: Configure GitHub Secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✓ Certificate is ready for GitHub"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "MANUAL ACTION REQUIRED:"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "1. Go to: https://github.com/ikanisa/prisma/settings/secrets/actions"
echo ""
echo "2. Add Secret #1:"
echo "   Name:  MACOS_CERTIFICATE_BASE64"
echo "   Value: Copy from file below ↓"
echo ""
echo "   Run this command to view the value:"
echo "   cat $BASE64_FILE"
echo ""
echo "3. Add Secret #2:"
echo "   Name:  MACOS_CERTIFICATE_PASSWORD"
echo "   Value: [the password you used when exporting]"
echo ""
echo "4. (Optional) Add Secret #3:"
echo "   Name:  MACOS_SIGNING_IDENTITY"
echo "   Value: Inhouse Dev Signing"
echo ""
echo "Opening GitHub Secrets page in browser..."
open "https://github.com/ikanisa/prisma/settings/secrets/actions" 2>/dev/null || true
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ============================================================================
# COMPLETION
# ============================================================================

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║          ✅ SETUP COMPLETE (Local Signing Working!)               ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ COMPLETED:"
echo "  ✓ Demo apps created"
echo "  ✓ Certificate configured"
echo "  ✓ Apps signed"
echo "  ✓ Signatures verified"
echo "  ✓ Certificate exported for CI/CD"
echo ""
echo "⚠️  REMAINING:"
echo "  → Add GitHub Secrets (manual, see instructions above)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST YOUR SIGNED APPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  # Launch Admin Panel (should open without Gatekeeper warning!)"
echo "  open dist/mac/AdminPanel.app"
echo ""
echo "  # Launch Client Portal"
echo "  open dist/mac/ClientPortal.app"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Test signed apps (command above)"
echo "2. Add GitHub Secrets for CI/CD"
echo "3. Push a change to trigger automated builds"
echo ""
echo "Your desktop apps are now production-ready! 🎉"
echo ""
