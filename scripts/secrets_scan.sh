#!/usr/bin/env bash
set -euo pipefail

gitleaks detect --no-git --config .gitleaks.toml "$@"
