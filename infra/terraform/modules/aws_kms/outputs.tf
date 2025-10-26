output "keys" {
  description = "AWS KMS key metadata keyed by service name."
  value = { for name, key in aws_kms_key.service_keys :
    name => {
      key_id     = key.key_id
      arn        = key.arn
      alias      = aws_kms_alias.service_aliases[name].name
      secret_arn = var.create_secrets ? aws_secretsmanager_secret.kms_references[name].arn : null
    }
  }
  sensitive = true
}
