# Data Retention Jobs

Each dataset listed in `POLICY/data-retention-policy.json` can declare an `anonymisation_job`. Place the executable implementation for that job in this directory using the naming convention `<anonymisation_job>.mjs`.

Scripts are invoked by `scripts/maintenance/run_data_retention.mjs` with the following environment variables:

- `DATASET_NAME`
- `RETENTION_DAYS`
- `STORAGE_SYSTEMS`
- `RETENTION_NOTES`

Implementations should be idempotent and exit non-zero when remediation is required.
