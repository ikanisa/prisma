export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  public: {
    Tables: {
      /* ... keep all the Tables from main exactly as-is ... */
      /* (Your entire block from `accounting` through `workflow_runs`) */
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      enforce_rate_limit: {
        Args: {
          p_limit: number;
          p_org_id: string;
          p_resource: string;
          p_window_seconds: number;
        };
        Returns: { allowed: boolean; request_count: number }[];
      };
      has_min_role: {
        Args: { min: Database["public"]["Enums"]["role_level"]; org: string };
        Returns: boolean;
      };
      is_member_of: {
        Args: { org: string };
        Returns: boolean;
      };
    };
    Enums: {
      audit_risk_category:
        | "FINANCIAL_STATEMENT"
        | "FRAUD"
        | "CONTROL"
        | "IT"
        | "GOING_CONCERN"
        | "COMPLIANCE"
        | "ESTIMATE"
        | "OTHER";
      /** merged from codex */
      audit_specialist_status: "draft" | "in_review" | "final";
      cit_refund_profile: "6_7" | "5_7" | "2_3" | "NONE";
      close_period_status: "OPEN" | "SUBSTANTIVE_REVIEW" | "READY_TO_LOCK" | "LOCKED";
      dac6_hallmark_category: "A" | "B" | "C" | "D" | "E";
      dac6_submission_status: "DRAFT" | "READY_FOR_SUBMISSION" | "SUBMITTED" | "REJECTED";
      denylist_action: "deny" | "deboost";
      engagement_status: "planned" | "active" | "completed" | "archived";
      fraud_plan_status: "DRAFT" | "READY_FOR_APPROVAL" | "LOCKED";
      je_control_rule:
        | "LATE_POSTING"
        | "WEEKEND_USER"
        | "ROUND_AMOUNT"
        | "MANUAL_TO_SENSITIVE"
        | "MISSING_ATTACHMENT";
      je_control_severity: "LOW" | "MEDIUM" | "HIGH";
      learning_job_kind:
        | "query_hint_add"
        | "guardrail_tune"
        | "canonicalizer_update"
        | "denylist_update"
        | "rollback_policy";
      learning_job_status:
        | "PENDING"
        | "READY"
        | "IN_PROGRESS"
        | "APPLIED"
        | "FAILED"
        | "ROLLED_BACK";
      ledger_account_type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
      org_role: "admin" | "manager" | "staff" | "client";
      reconciliation_item_category:
        | "DIT"
        | "OC"
        | "UNAPPLIED_RECEIPT"
        | "UNAPPLIED_PAYMENT"
        | "TIMING"
        | "ERROR"
        | "OTHER";
      reconciliation_type: "BANK" | "AR" | "AP" | "GRNI" | "PAYROLL" | "OTHER";
      response_status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
      response_type: "CONTROL" | "SUBSTANTIVE" | "ANALYTICS" | "SAMPLING" | "OTHER";
      risk_rating: "LOW" | "MODERATE" | "HIGH" | "SIGNIFICANT";
      risk_status: "OPEN" | "MONITORED" | "CLOSED";
      role_level: "EMPLOYEE" | "MANAGER" | "SYSTEM_ADMIN";
      severity_level: "info" | "warn" | "error";
      tax_account_type: "MTA" | "FIA" | "IPA" | "FTA" | "UA";
      tax_dispute_status: "OPEN" | "IN_PROGRESS" | "SUBMITTED" | "RESOLVED" | "CLOSED";
      us_overlay_type: "GILTI" | "163J" | "CAMT" | "EXCISE_4501";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      audit_risk_category: [
        "FINANCIAL_STATEMENT",
        "FRAUD",
        "CONTROL",
        "IT",
        "GOING_CONCERN",
        "COMPLIANCE",
        "ESTIMATE",
        "OTHER",
      ],
      /** merged from codex */
      audit_specialist_status: ["draft", "in_review", "final"],
      cit_refund_profile: ["6_7", "5_7", "2_3", "NONE"],
      close_period_status: ["OPEN", "SUBSTANTIVE_REVIEW", "READY_TO_LOCK", "LOCKED"],
      dac6_hallmark_category: ["A", "B", "C", "D", "E"],
      dac6_submission_status: ["DRAFT", "READY_FOR_SUBMISSION", "SUBMITTED", "REJECTED"],
      denylist_action: ["deny", "deboost"],
      engagement_status: ["planned", "active", "completed", "archived"],
      fraud_plan_status: ["DRAFT", "READY_FOR_APPROVAL", "LOCKED"],
      je_control_rule: [
        "LATE_POSTING",
        "WEEKEND_USER",
        "ROUND_AMOUNT",
        "MANUAL_TO_SENSITIVE",
        "MISSING_ATTACHMENT",
      ],
      je_control_severity: ["LOW", "MEDIUM", "HIGH"],
      learning_job_kind: [
        "query_hint_add",
        "guardrail_tune",
        "canonicalizer_update",
        "denylist_update",
        "rollback_policy",
      ],
      learning_job_status: ["PENDING", "READY", "IN_PROGRESS", "APPLIED", "FAILED", "ROLLED_BACK"],
      ledger_account_type: ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"],
      org_role: ["admin", "manager", "staff", "client"],
      reconciliation_item_category: [
        "DIT",
        "OC",
        "UNAPPLIED_RECEIPT",
        "UNAPPLIED_PAYMENT",
        "TIMING",
        "ERROR",
        "OTHER",
      ],
      reconciliation_type: ["BANK", "AR", "AP", "GRNI", "PAYROLL", "OTHER"],
      response_status: ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      response_type: ["CONTROL", "SUBSTANTIVE", "ANALYTICS", "SAMPLING", "OTHER"],
      risk_rating: ["LOW", "MODERATE", "HIGH", "SIGNIFICANT"],
      risk_status: ["OPEN", "MONITORED", "CLOSED"],
      role_level: ["EMPLOYEE", "MANAGER", "SYSTEM_ADMIN"],
      severity_level: ["info", "warn", "error"],
      tax_account_type: ["MTA", "FIA", "IPA", "FTA", "UA"],
      tax_dispute_status: ["OPEN", "IN_PROGRESS", "SUBMITTED", "RESOLVED", "CLOSED"],
      us_overlay_type: ["GILTI", "163J", "CAMT", "EXCISE_4501"],
    },
  },
} as const;
