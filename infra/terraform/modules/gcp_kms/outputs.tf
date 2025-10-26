output "keys" {
  description = "GCP KMS key metadata keyed by service name."
  value = { for name, key in google_kms_crypto_key.service_keys :
    name => {
      id         = key.id
      self_link  = key.self_link
      key_ring   = google_kms_key_ring.this.id
      secret_id  = var.create_secrets ? google_secret_manager_secret.kms_references[name].id : null
      secret_name = var.create_secrets ? google_secret_manager_secret.kms_references[name].secret_id : null
    }
  }
  sensitive = true
}
