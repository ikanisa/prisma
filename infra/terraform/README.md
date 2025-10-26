# Terraform KMS provisioning

This configuration creates customer-managed encryption keys (CMEKs) for Prisma's core data
plane. It supports both AWS KMS and Google Cloud KMS deployments and provisions keys for the
following managed services by default:

- Supabase/PostgreSQL
- Object storage (S3/GCS/MinIO gateways)
- Background job queue transports (SQS/Pub/Sub/Redis envelope encryption)

## Usage

1. Decide which cloud(s) you operate in and populate either `aws_configuration` or
   `gcp_configuration` in a `terraform.tfvars` file.
2. Authenticate to the respective provider (e.g. `aws-vault exec`, `gcloud auth application-default login`).
3. Run `terraform init`, `terraform plan`, and `terraform apply`.

```hcl
aws_configuration = {
  alias_prefix = "prismaglow"
}

gcp_configuration = {
  project_id    = "finance-prod"
  location      = "us-central1"
  key_ring_name = "prisma-glow"
}
```

Additional service keys can be added by providing an `additional_services` map, for example:

```hcl
additional_services = {
  audit_logs = {
    description = "KMS key to encrypt exported audit logs"
  }
}
```

The configuration automatically persists key ARNs/resource IDs into the relevant secret manager
so that application services can reference the managed keys without exposing them in plaintext
configuration files.
