#!/usr/bin/env bash

# list_identities.sh
# Lists all available code-signing identities on this Mac.
# Highlights identities valid for "Code Signing" and shows how to set SIGNING_IDENTITY.

set -euo pipefail

echo "========================================="
echo "Available Code Signing Identities"
echo "========================================="
echo ""

# List all code-signing identities
security find-identity -v -p codesigning

echo ""
echo "========================================="
echo "Notes"
echo "========================================="
echo ""
echo "Valid identities show '(CSSMERR_TP_CERT_EXPIRED)' if expired."
echo "Look for identities without errors for active signing."
echo ""
echo "Example identity names you might see:"
echo "  - 'Inhouse Dev Signing' (self-signed internal certificate)"
echo "  - 'Developer ID Application: My Company Name (TEAMID)' (Apple Developer ID)"
echo ""
echo "To use an identity in signing scripts, set the SIGNING_IDENTITY environment variable:"
echo ""
echo "  export SIGNING_IDENTITY=\"Inhouse Dev Signing\""
echo "  # OR for Apple Developer ID:"
echo "  export SIGNING_IDENTITY=\"Developer ID Application: My Company Name (TEAMID)\""
echo ""
echo "Then run ./scripts/sign_all_apps.sh"
echo ""
