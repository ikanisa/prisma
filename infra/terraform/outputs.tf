locals {
  empty_map = tomap({})
}

output "aws_keys" {
  description = "Details for the AWS-managed CMEKs keyed by service name."
  value       = length(module.aws_kms) == 0 ? local.empty_map : module.aws_kms[0].keys
  sensitive   = true
}

output "gcp_keys" {
  description = "Details for the GCP-managed CMEKs keyed by service name."
  value       = length(module.gcp_kms) == 0 ? local.empty_map : module.gcp_kms[0].keys
  sensitive   = true
}
