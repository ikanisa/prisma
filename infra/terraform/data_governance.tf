terraform {
  required_version = ">= 1.4.0"
}

locals {
  retention_policy = jsondecode(file("${path.module}/../../POLICY/data-retention-policy.json"))

  anonymisation_jobs = {
    for dataset in local.retention_policy.datasets :
    dataset.anonymisation_job => {
      name        = dataset.anonymisation_job
      schedule    = dataset.schedule
      dataset     = dataset.name
      retention   = dataset.retention_window_days
      storage     = dataset.storage
      owner_group = dataset.owner
    }
  }
}

variable "kubernetes_namespace" {
  description = "Namespace that hosts compliance automation jobs"
  type        = string
  default     = "governance-jobs"
}

resource "kubernetes_cron_job_v1" "data_anonymiser" {
  for_each = local.anonymisation_jobs

  metadata {
    name      = each.value.name
    namespace = var.kubernetes_namespace
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
      "app.kubernetes.io/component"  = "data-governance"
      "data.prismaglow.io/dataset"   = regexreplace(lower(each.value.dataset), "\s+", "-")
    }
    annotations = {
      "data.prismaglow.io/retention-days" = tostring(each.value.retention)
      "data.prismaglow.io/storage"        = join(",", each.value.storage)
      "data.prismaglow.io/owner"          = each.value.owner_group
    }
  }

  spec {
    schedule                   = each.value.schedule
    concurrency_policy         = "Forbid"
    failed_jobs_history_limit  = 2
    successful_jobs_history_limit = 2
    job_template {
      spec {
        ttl_seconds_after_finished = 1800
        template {
          metadata {
            labels = {
              "data.prismaglow.io/dataset" = regexreplace(lower(each.value.dataset), "\s+", "-")
            }
          }
          spec {
            service_account_name = "data-governance-runner"
            restart_policy       = "Never"
            container {
              name  = "${each.value.name}-task"
              image = "ghcr.io/prisma-glow/data-governance-runner:latest"
              env {
                name  = "DATASET_NAME"
                value = each.value.dataset
              }
              env {
                name  = "RETENTION_DAYS"
                value = tostring(each.value.retention)
              }
              env {
                name  = "STORAGE_SYSTEMS"
                value = join(",", each.value.storage)
              }
              env {
                name  = "ANONYMISATION_JOB"
                value = each.value.name
              }
              args = [
                "node",
                "/app/scripts/maintenance/run_data_retention.mjs",
                "--dataset",
                each.value.dataset
              ]
            }
          }
        }
      }
    }
  }
}

output "retention_policy_summary" {
  description = "Flattened view of datasets, retention windows, and anonymisation jobs"
  value = [
    for dataset in local.retention_policy.datasets : {
      name              = dataset.name
      storage           = dataset.storage
      retention_days    = dataset.retention_window_days
      anonymisation_job = dataset.anonymisation_job
      schedule          = dataset.schedule
    }
  ]
}
