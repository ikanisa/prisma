terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }

    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

locals {
  managed_services = merge(
    {
      supabase = {
        description = "Customer-managed encryption key protecting Supabase/PostgreSQL data at rest."
      }
      object_storage = {
        description = "Envelope encryption for object storage buckets that store tenant evidence."
      }
      job_queue = {
        description = "Key material for encrypting payloads in the background job queue."
      }
    },
    var.additional_services,
  )

  consolidated_tags = merge({
    "managed-by" = "terraform",
    "component" = "kms",
  }, var.tags)
}

module "aws_kms" {
  count = var.aws_configuration == null ? 0 : 1

  source = "./modules/aws_kms"

  alias_prefix             = var.aws_configuration.alias_prefix
  services                 = local.managed_services
  multi_region             = try(var.aws_configuration.multi_region, false)
  deletion_window_in_days  = try(var.aws_configuration.deletion_window_in_days, 30)
  create_secrets           = try(var.aws_configuration.create_secrets, true)
  secrets_prefix           = try(var.aws_configuration.secrets_prefix, null)
  policy_json              = try(var.aws_configuration.policy_json, null)
  tags                     = merge(local.consolidated_tags, try(var.aws_configuration.tags, {}))
}

module "gcp_kms" {
  count = var.gcp_configuration == null ? 0 : 1

  source = "./modules/gcp_kms"

  project_id      = var.gcp_configuration.project_id
  location        = var.gcp_configuration.location
  key_ring_name   = var.gcp_configuration.key_ring_name
  services        = local.managed_services
  rotation_period = try(var.gcp_configuration.rotation_period, "7776000s")
  purpose         = try(var.gcp_configuration.purpose, "ENCRYPT_DECRYPT")
  create_secrets  = try(var.gcp_configuration.create_secrets, true)
  secrets_prefix  = try(var.gcp_configuration.secrets_prefix, null)
  labels          = merge({
    managed_by = "terraform",
    component  = "kms",
  }, try(var.gcp_configuration.labels, {}))
}
