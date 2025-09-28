# Policy Test Configuration

The pgTAP suite in `scripts/test_policies.sql` requires access to a Supabase staging database with
pgTAP installed. The GitHub Actions workflow is configured to read the connection string from the
`STAGING_DATABASE_URL` secret. Locally you can run the same suite with:

```bash
STAGING_DATABASE_URL="postgres://user:pass@host:5432/db" \
  psql "$STAGING_DATABASE_URL" -f scripts/test_policies.sql
```

If the secret is missing the CI job fails immediately with a helpful message so we never merge
without exercising the policies against staging.
