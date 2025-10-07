Enums: {
  ada_exception_disposition: "OPEN" | "INVESTIGATING" | "RESOLVED",
  ada_run_kind: "JE" | "RATIO" | "VARIANCE" | "DUPLICATE" | "BENFORD",
  audit_risk_category:
    | "FINANCIAL_STATEMENT"
    | "FRAUD"
    | "CONTROL"
    | "IT"
    | "GOING_CONCERN"
    | "COMPLIANCE"
    | "ESTIMATE"
    | "OTHER",
  /** merged */
  audit_specialist_status: "draft" | "in_review" | "final",
  cit_refund_profile: "6_7" | "5_7" | "2_3" | "NONE",
  close_period_status: "OPEN" | "SUBSTANTIVE_REVIEW" | "READY_TO_LOCK" | "LOCKED",
  /** needed by controls/control_tests/control_walkthroughs */
  control_frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL" | "EVENT_DRIVEN",
  control_test_result: "PASS" | "EXCEPTIONS",
  control_walkthrough_result: "DESIGNED" | "NOT_DESIGNED" | "IMPLEMENTED" | "NOT_IMPLEMENTED",
  dac6_hallmark_category: "A" | "B" | "C" | "D" | "E",
  dac6_submission_status: "DRAFT" | "READY_FOR_SUBMISSION" | "SUBMITTED" | "REJECTED",
  denylist_action: "deny" | "deboost",
  /** needed by deficiencies */
  deficiency_severity: "LOW" | "MEDIUM" | "HIGH",
  deficiency_status: "OPEN" | "MONITORING" | "CLOSED",
  engagement_status: "planned" | "active" | "completed" | "archived",
  fraud_plan_status: "DRAFT" | "READY_FOR_APPROVAL" | "LOCKED",
  je_control_rule:
    | "LATE_POSTING"
    | "WEEKEND_USER"
    | "ROUND_AMOUNT"
    | "MANUAL_TO_SENSITIVE"
    | "MISSING_ATTACHMENT",
  je_control_severity: "LOW" | "MEDIUM" | "HIGH",
  learning_job_kind:
    | "query_hint_add"
    | "guardrail_tune"
    | "canonicalizer_update"
    | "denylist_update"
    | "rollback_policy",
  learning_job_status:
    | "PENDING"
    | "READY"
    | "IN_PROGRESS"
    | "APPLIED"
    | "FAILED"
    | "ROLLED_BACK",
  ledger_account_type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE",
  org_role: "admin" | "manager" | "staff" | "client",
  /** keep main’s values here (match your reconciliation_items usage) */
  reconciliation_item_category:
    | "OUTSTANDING_CHECKS"
    | "DEPOSITS_IN_TRANSIT"
    | "UNIDENTIFIED"
    | "UNAPPLIED_RECEIPT"
    | "UNAPPLIED_PAYMENT"
    | "TIMING"
    | "ERROR"
    | "OTHER",
  reconciliation_type: "BANK" | "AR" | "AP" | "GRNI" | "PAYROLL" | "OTHER",
  response_status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
  response_type: "CONTROL" | "SUBSTANTIVE" | "ANALYTICS" | "SAMPLING" | "OTHER",
  risk_rating: "LOW" | "MODERATE" | "HIGH" | "SIGNIFICANT",
  risk_status: "OPEN" | "MONITORED" | "CLOSED",
  role_level: "EMPLOYEE" | "MANAGER" | "SYSTEM_ADMIN",
  severity_level: "info" | "warn" | "error",
  tax_account_type: "MTA" | "FIA" | "IPA" | "FTA" | "UA",
  tax_dispute_status: "OPEN" | "IN_PROGRESS" | "SUBMITTED" | "RESOLVED" | "CLOSED",
  us_overlay_type: "GILTI" | "163J" | "CAMT" | "EXCISE_4501",
},
