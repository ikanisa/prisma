export const Constants = {
  public: {
    Enums: {
      engagement_status: ["planned", "active", "completed", "archived"],
      org_role: ["admin", "manager", "staff", "client"],
      role_level: ["EMPLOYEE", "MANAGER", "SYSTEM_ADMIN"],
      severity_level: ["info", "warn", "error"],
    },
  },
} as const
