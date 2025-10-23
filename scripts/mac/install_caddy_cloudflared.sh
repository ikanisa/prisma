#!/usr/bin/env bash
set -euo pipefail

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required to install caddy and cloudflared. Install it from https://brew.sh/ and re-run this script."
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
BREWFILE="${SCRIPT_DIR}/../../infra/mac/Brewfile"

if [[ ! -f "${BREWFILE}" ]]; then
  echo "Unable to find Brewfile at ${BREWFILE}."
  exit 1
fi

echo "Installing caddy and cloudflared via Homebrew bundle..."
brew bundle --file="${BREWFILE}"

echo
cat <<'INSTRUCTIONS'
Installation complete!

Next steps:
  • Copy any required Caddy configuration into place (for example, into /usr/local/etc/caddy/Caddyfile).
  • Reload or start Caddy after updating the configuration (e.g. `sudo brew services restart caddy`).
  • Authenticate the Cloudflare tunnel by running `cloudflared login` and follow the browser prompt.
  • If you need Cloudflared to run automatically, use `cloudflared service install` after login.
INSTRUCTIONS
