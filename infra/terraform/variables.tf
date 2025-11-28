variable "aws_configuration" {
  description = <<EOT
Optional AWS KMS configuration. Provide this object to create CMEKs in AWS. The caller must
configure AWS credentials (for example via environment variables or a shared credentials file).
EOT
  type = object({
    alias_prefix            = string
    multi_region            = optional(bool)
    deletion_window_in_days = optional(number)
    create_secrets          = optional(bool)
    secrets_prefix          = optional(string)
    policy_json             = optional(string)
    tags                    = optional(map(string))
  })
  default = null
}

variable "gcp_configuration" {
  description = <<EOT
Optional Google Cloud KMS configuration. Provide this object to create CMEKs in GCP. The caller must
configure Google Cloud authentication (for example via Application Default Credentials).
EOT
  type = object({
    project_id      = string
    location        = string
    key_ring_name   = string
    rotation_period = optional(string)
    purpose         = optional(string)
    create_secrets  = optional(bool)
    secrets_prefix  = optional(string)
    labels          = optional(map(string))
  })
  default = null
}

variable "additional_services" {
  description = "Optional map of additional service keys to create alongside the defaults."
  type = map(object({
    description = string
  }))
  default = {}
}

variable "tags" {
  description = "Tags applied to AWS resources."
  type        = map(string)
  default     = {}
}
