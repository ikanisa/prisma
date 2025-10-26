resource "google_kms_key_ring" "this" {
  project  = var.project_id
  name     = var.key_ring_name
  location = var.location
}

locals {
  service_labels = { for name, _ in var.services :
    name => merge(var.labels, {
      service = name,
    })
  }

  secret_ids = { for name, details in var.services :
    name => (
      can(details.secret_name) && trimspace(details.secret_name) != ""
      ? trimspace(details.secret_name)
      : (
        var.secrets_prefix != null && trimspace(var.secrets_prefix) != ""
        ? format("%s-%s", replace(trim(var.secrets_prefix, "/"), "/", "-"), name)
        : format("%s-%s", var.key_ring_name, name)
      )
    )
  }
}

resource "google_kms_crypto_key" "service_keys" {
  for_each = var.services

  name            = "${each.key}-cmek"
  key_ring        = google_kms_key_ring.this.id
  purpose         = var.purpose
  rotation_period = var.rotation_period
  labels          = local.service_labels[each.key]

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "SOFTWARE"
  }
}

locals {
  secrets_enabled = var.create_secrets ? var.services : {}
}

resource "google_secret_manager_secret" "kms_references" {
  for_each = locals.secrets_enabled

  project   = var.project_id
  secret_id = local.secret_ids[each.key]

  replication {
    automatic = true
  }

  labels = local.service_labels[each.key]
}

resource "google_secret_manager_secret_version" "kms_references" {
  for_each = locals.secrets_enabled

  secret      = google_secret_manager_secret.kms_references[each.key].id
  secret_data = google_kms_crypto_key.service_keys[each.key].self_link
}
