# Customer-managed key rotation runbook

This runbook covers end-to-end rotation of customer-managed encryption keys (CMEKs) used by the
Prisma platform across Supabase/PostgreSQL, object storage, and background job queues. The
Terraform configuration under `infra/terraform` provisions identical key sets for AWS KMS and
Google Cloud KMS; rotation follows the same high-level flow on each provider.

## Key inventory

| Service | AWS alias | AWS secret name | GCP crypto key | Secret Manager ID |
| --- | --- | --- | --- | --- |
| Supabase/PostgreSQL | `alias/<alias_prefix>-supabase` | `<prefix>/supabase` | `<key_ring>-supabase-cmek` | `<prefix>-supabase` |
| Object storage | `alias/<alias_prefix>-object_storage` | `<prefix>/object_storage` | `<key_ring>-object_storage-cmek` | `<prefix>-object_storage` |
| Background jobs | `alias/<alias_prefix>-job_queue` | `<prefix>-job_queue` | `<key_ring>-job_queue-cmek` | `<prefix>-job_queue` |

> **Tip:** `terraform output aws_keys` or `terraform output gcp_keys` will print the current key
> metadata, including secret ARNs/IDs. Capture these outputs before and after a rotation to aid
> auditing.

## Rotation cadence

Keys must be rotated at least every 90 days. Automated rotation is enabled by default on AWS KMS
(`enable_key_rotation = true`) and via the `rotation_period` configured for Google Cloud KMS. Manual
rotation is still required when keys are compromised or when changing trust boundaries (for example,
new administrators, new data residency requirements).

## AWS KMS rotation

1. **Prepare:**
   - Authenticate (`aws-vault exec <profile> -- terraform plan`).
   - Pull the latest repo state and ensure the desired alias prefix in `terraform.tfvars`.
   - Run `terraform plan` to confirm no unintended drifts.
2. **Create new key versions:**
   - Update `alias_prefix` or simply re-apply Terraform to create new keys. Terraform creates a fresh
     `aws_kms_key` for each service with rotation enabled and stores the ARN in Secrets Manager.
   - Apply the plan: `terraform apply`.
3. **Validate bindings:**
   - Fetch secrets: `aws secretsmanager get-secret-value --secret-id <secret>` for each service and
     confirm the ARN matches the new key.
   - Use `aws kms describe-key --key-id <arn>` to ensure the key is enabled and the policy includes
     the expected service principals (`rds`, `s3`, `sqs`).
4. **Update application configuration:**
   - Redeploy services so that environment variables `SUPABASE_ENCRYPTION_KEY_REFERENCE`,
     `OBJECT_STORAGE_ENCRYPTION_KEY_REFERENCE`, and `JOB_QUEUE_ENCRYPTION_KEY_REFERENCE` pick up the
     new secret values.
   - Confirm `config/system.yaml` reflects the new key references through `getEncryptionConfig()`.
5. **Decommission old keys:**
   - Once traffic has been verified against the new keys, schedule deletion using
     `aws kms schedule-key-deletion --key-id <old-key-arn> --pending-window-in-days 30`.
   - Monitor CloudWatch metrics (`KMSKeyAccessDenied`, `KMSKeyDisabled`) for anomalies during the
     waiting period.

## Google Cloud KMS rotation

1. **Prepare:**
   - Authenticate using `gcloud auth application-default login`.
   - Ensure the desired `project_id`, `location`, and `key_ring_name` are set in `terraform.tfvars`.
2. **Create new key versions:**
   - Re-apply Terraform: `terraform apply`. New key versions (`cryptoKeyVersions`) are generated for
     each service with the configured `rotation_period`.
   - Terraform also writes the updated resource IDs into Secret Manager.
3. **Validate bindings:**
   - Inspect the key: `gcloud kms keys versions list --location=<location> --keyring=<ring> --key=<key>`.
   - Check IAM policies to ensure the appropriate service accounts (Cloud SQL, GCS, Pub/Sub) retain
     `roles/cloudkms.cryptoKeyEncrypterDecrypter`.
4. **Update application configuration:**
   - Re-sync environment variables / secrets to propagate the new
     `${SERVICE}_ENCRYPTION_KEY_REFERENCE` values.
   - Verify `getEncryptionConfig()` returns the new resource names.
5. **Decommission old versions:**
   - Disable previous versions with
     `gcloud kms keys versions disable --location=<location> --keyring=<ring> --key=<key> --version=<n>`
     once you are satisfied no workloads depend on them.
   - After an additional observation window, destroy the retired version with
     `gcloud kms keys versions destroy ...`.

## Emergency rotation

1. **Quarantine the affected key** by disabling it (`aws kms disable-key` or
   `gcloud kms keys versions disable`).
2. **Provision replacement keys** by re-running Terraform with an updated `alias_prefix` (AWS) or
   `key_ring_name` (GCP) to avoid alias collisions.
3. **Update environment variables** immediately using your secrets manager so that Supabase,
   object storage, and job queues adopt the new references.
4. **Validate end-to-end** by running smoke tests that cover database migrations, storage uploads,
   and background job fan-out.
5. **Document the incident** in the security log and open a follow-up task to review access policies.

## Post-rotation verification

- Confirm Supabase connections succeed and the database reports the correct CMK via
  `SELECT * FROM pg_stat_kms_keys;` (AWS RDS Custom) or the Supabase admin API.
- Upload and retrieve a file from object storage, verifying server-side encryption metadata.
- Enqueue and drain a background job to confirm the queue encryption/decryption works as expected.
- Archive Terraform state and rotation evidence in accordance with the compliance checklist.
