import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  msisdn_e164: z.string().optional().nullable(),
  display_name: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  total_vouchers: z.number().optional().nullable(),
});

export const StationSchema = z.object({
  id: z.string(),
  name: z.string(),
  engen_code: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

export const VoucherSchema = z.object({
  id: z.string(),
  code: z.string(),
  amount: z.number(),
  status: z.enum(["issued", "sent", "redeemed", "expired", "void"]).default("issued"),
  issued_at: z.string().optional().nullable(),
  redeemed_at: z.string().optional().nullable(),
  campaign_id: z.string().optional().nullable(),
  station_id: z.string().optional().nullable(),
  user_id: z.string().optional().nullable(),
});

export const VoucherEventSchema = z.object({
  id: z.string(),
  voucher_id: z.string(),
  event: z.string(),
  source: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  payload: z.record(z.any()).optional().nullable(),
});

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["promo", "voucher"]).default("promo"),
  status: z.enum(["draft", "running", "paused", "stopped"]).default("draft"),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

export const CampaignTargetSchema = z.object({
  id: z.string(),
  campaign_id: z.string(),
  msisdn_e164: z.string(),
  status: z.string().optional().nullable(),
  last_attempt_at: z.string().optional().nullable(),
  error_code: z.string().optional().nullable(),
});

export const InsuranceQuoteSchema = z.object({
  id: z.string(),
  user_id: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  premium: z.number().optional().nullable(),
  vehicle_plate: z.string().optional().nullable(),
  document_url: z.string().optional().nullable(),
  ocr_summary: z.record(z.any()).optional().nullable(),
  submitted_at: z.string().optional().nullable(),
});

export const SettingsSchema = z.object({
  key: z.string(),
  value: z.string().nullable(),
  description: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});

export const AuditLogSchema = z.object({
  id: z.string(),
  created_at: z.string().optional().nullable(),
  actor: z.string().optional().nullable(),
  action: z.string(),
  entity: z.string().optional().nullable(),
  entity_id: z.string().optional().nullable(),
  payload: z.record(z.any()).optional().nullable(),
});

export type UserRecord = z.infer<typeof UserSchema>;
export type StationRecord = z.infer<typeof StationSchema>;
export type VoucherRecord = z.infer<typeof VoucherSchema>;
export type VoucherEventRecord = z.infer<typeof VoucherEventSchema>;
export type CampaignRecord = z.infer<typeof CampaignSchema>;
export type CampaignTargetRecord = z.infer<typeof CampaignTargetSchema>;
export type InsuranceQuoteRecord = z.infer<typeof InsuranceQuoteSchema>;
export type SettingRecord = z.infer<typeof SettingsSchema>;
export type AuditLogRecord = z.infer<typeof AuditLogSchema>;

export const UsersSchema = z.array(UserSchema);
export const StationsSchema = z.array(StationSchema);
export const VouchersSchema = z.array(VoucherSchema);
export const VoucherEventsSchema = z.array(VoucherEventSchema);
export const CampaignsSchema = z.array(CampaignSchema);
export const CampaignTargetsSchema = z.array(CampaignTargetSchema);
export const InsuranceQuotesSchema = z.array(InsuranceQuoteSchema);
export const SettingsCollectionSchema = z.array(SettingsSchema);
export const AuditLogCollectionSchema = z.array(AuditLogSchema);
