#!/usr/bin/env bash
set -euo pipefail

# Try to guess SUPABASE_URL from config (you can override at the prompt)
PROJECT_REF="$(awk -F\" '/project_ref/ {print $2}' supabase/config.toml 2>/dev/null || true)"
DEFAULT_URL=""
if [ -n "${PROJECT_REF:-}" ]; then
  DEFAULT_URL="https://${PROJECT_REF}.supabase.co"
fi

echo "I will create supabase/.env for the wa-webhook."
echo

read -p "SUPABASE_URL [${DEFAULT_URL:-paste full https URL}]: " SUPABASE_URL
SUPABASE_URL="${SUPABASE_URL:-$DEFAULT_URL}"
if [ -z "$SUPABASE_URL" ]; then
  echo "SUPABASE_URL is required" >&2; exit 1
fi

read -s -p "SUPABASE_SERVICE_ROLE_KEY (paste Service Role key): " SERVICE_KEY; echo
if [ -z "$SERVICE_KEY" ]; then
  echo "Service Role key is required" >&2; exit 1
fi

read -p "WA_PHONE_ID (WhatsApp Phone Number ID): " WA_PHONE_ID
if [ -z "$WA_PHONE_ID" ]; then
  echo "WA_PHONE_ID is required" >&2; exit 1
fi

read -s -p "WA_TOKEN (WhatsApp Permanent Access Token): " WA_TOKEN; echo
if [ -z "$WA_TOKEN" ]; then
  echo "WA_TOKEN is required" >&2; exit 1
fi

read -p "WA_VERIFY_TOKEN (the string you set in Meta webhook verify): " WA_VERIFY_TOKEN
# Optional during local dev (leave blank to skip signature checks in our code paths that allow it)
read -p "WA_APP_SECRET (Meta App Secret; leave blank for local dev): " WA_APP_SECRET
# Optional
read -p "OPENAI_API_KEY (for Insurance OCR; leave blank if not testing OCR): " OPENAI_API_KEY

cat > supabase/.env <<EOT
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
WA_PHONE_ID=${WA_PHONE_ID}
WA_TOKEN=${WA_TOKEN}
WA_VERIFY_TOKEN=${WA_VERIFY_TOKEN}
WA_APP_SECRET=${WA_APP_SECRET}
OPENAI_API_KEY=${OPENAI_API_KEY}
EOT

chmod 600 supabase/.env
echo
echo "✅ Wrote supabase/.env"
echo "   -> $(wc -l < supabase/.env) lines"
echo "   (permissions set to 600)"
