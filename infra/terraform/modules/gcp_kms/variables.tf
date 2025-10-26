variable "project_id" {
  description = "Google Cloud project ID where the KMS resources will be created."
  type        = string
}

variable "location" {
  description = "Regional location for the key ring (for example, us-central1)."
  type        = string
}

variable "key_ring_name" {
  description = "Name assigned to the key ring."
  type        = string
}

variable "services" {
  description = "Map of services requiring keys."
  type = map(object({
    description = string
    secret_name = optional(string)
  }))
}

variable "rotation_period" {
  description = "Crypto key rotation period in seconds (formatted duration, e.g. 7776000s for 90 days)."
  type        = string
  default     = "7776000s"
}

variable "purpose" {
  description = "Purpose assigned to the crypto keys (typically ENCRYPT_DECRYPT)."
  type        = string
  default     = "ENCRYPT_DECRYPT"
}

variable "create_secrets" {
  description = "Whether to persist key resource IDs in Secret Manager."
  type        = bool
  default     = true
}

variable "secrets_prefix" {
  description = "Optional prefix applied to Secret Manager secret IDs."
  type        = string
  default     = null
}

variable "labels" {
  description = "Labels applied to created resources."
  type        = map(string)
  default     = {}
}
