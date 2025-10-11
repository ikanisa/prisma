#!/usr/bin/env bash
set -euo pipefail

# Triggers the Prisma migrate workflow for production via GitHub CLI
# Requirements: gh CLI installed and authenticated (gh auth login)

WF_NAME="Supabase Prisma Deploy"
ENVIRONMENT="production"

echo "Triggering GitHub Actions workflow: ${WF_NAME} (environment=${ENVIRONMENT})"
gh workflow run "${WF_NAME}" -f environment=${ENVIRONMENT}

echo "Dispatched. View progress in the Actions tab."

