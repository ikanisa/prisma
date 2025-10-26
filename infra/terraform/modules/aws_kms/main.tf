data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_region" "current" {}

data "aws_iam_policy_document" "default" {
  statement {
    sid     = "AllowAccountAdministration"
    actions = ["kms:*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"]
    }

    resources = ["*"]
  }

  statement {
    sid     = "AllowRDSDataPlane"
    actions = [
      "kms:DescribeKey",
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:CreateGrant",
    ]

    principals {
      type        = "Service"
      identifiers = ["rds.amazonaws.com"]
    }

    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["rds.${data.aws_region.current.name}.amazonaws.com"]
    }
  }

  statement {
    sid     = "AllowS3DataPlane"
    actions = [
      "kms:DescribeKey",
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:CreateGrant",
    ]

    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }

    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["s3.${data.aws_region.current.name}.amazonaws.com"]
    }
  }

  statement {
    sid     = "AllowSQSDataPlane"
    actions = [
      "kms:DescribeKey",
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:CreateGrant",
    ]

    principals {
      type        = "Service"
      identifiers = ["sqs.amazonaws.com"]
    }

    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["sqs.${data.aws_region.current.name}.amazonaws.com"]
    }
  }
}

locals {
  key_policy = var.policy_json != null ? var.policy_json : data.aws_iam_policy_document.default.json

  service_tags = { for name, _ in var.services :
    name => merge(var.tags, {
      "service" = name,
    })
  }

  secret_names = { for name, details in var.services :
    name => (
      can(details.secret_name) && trimspace(details.secret_name) != ""
      ? trimspace(details.secret_name)
      : (
        var.secrets_prefix != null && trimspace(var.secrets_prefix) != ""
        ? format("%s/%s", trim(var.secrets_prefix, "/"), name)
        : format("%s/%s", var.alias_prefix, name)
      )
    )
  }
}

resource "aws_kms_key" "service_keys" {
  for_each = var.services

  description              = each.value.description
  deletion_window_in_days  = var.deletion_window_in_days
  enable_key_rotation      = true
  is_enabled               = true
  key_usage                = "ENCRYPT_DECRYPT"
  multi_region             = var.multi_region
  policy                   = local.key_policy
  tags                     = local.service_tags[each.key]
}

resource "aws_kms_alias" "service_aliases" {
  for_each = aws_kms_key.service_keys

  name          = "alias/${var.alias_prefix}-${each.key}"
  target_key_id = each.value.key_id
}

locals {
  secrets_enabled = var.create_secrets ? var.services : {}
}

resource "aws_secretsmanager_secret" "kms_references" {
  for_each = locals.secrets_enabled

  name        = local.secret_names[each.key]
  description = "Reference to the ${each.key} encryption key"
  tags        = local.service_tags[each.key]
}

resource "aws_secretsmanager_secret_version" "kms_references" {
  for_each = locals.secrets_enabled

  secret_id     = aws_secretsmanager_secret.kms_references[each.key].id
  secret_string = aws_kms_key.service_keys[each.key].arn
}
