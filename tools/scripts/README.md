# Tools Scripts

This directory contains utility scripts for the project.

## auto-fix-client-secrets.mjs

Automatically fixes scanner hits in client-facing directories by replacing server-only environment variable references with safe placeholders.

### Usage

```bash
# Run via npm script
npm run fix:client-secrets

# Or run directly
node tools/scripts/auto-fix-client-secrets.mjs
```

### What it does

- Scans client-facing directories (`apps/web`, `apps/admin`, `packages`, `public`)
- Identifies references to server-only secrets (like `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, etc.)
- Replaces `process.env.KEY` with a safe placeholder and adds a comment pointing to server helper
- Replaces bare key references in `.env` files with placeholders
- Exits with code 3 if changes were made (useful for CI automation)

The script is intentionally conservative and only replaces exact token matches, leaving surrounding code intact.
