variable "alias_prefix" {
  description = "Prefix applied to each AWS KMS alias (alias/prefix-service)."
  type        = string
}

variable "services" {
  description = "Map of services requiring keys."
  type = map(object({
    description = string
    secret_name = optional(string)
  }))
}

variable "multi_region" {
  description = "Whether to create multi-Region keys."
  type        = bool
  default     = false
}

variable "deletion_window_in_days" {
  description = "Waiting period before a scheduled key deletion in days."
  type        = number
  default     = 30
}

variable "create_secrets" {
  description = "Whether to persist key ARNs in AWS Secrets Manager."
  type        = bool
  default     = true
}

variable "secrets_prefix" {
  description = "Optional prefix for Secrets Manager secret names."
  type        = string
  default     = null
}

variable "policy_json" {
  description = "Optional JSON-formatted key policy to override the default."
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to AWS resources."
  type        = map(string)
  default     = {}
}
