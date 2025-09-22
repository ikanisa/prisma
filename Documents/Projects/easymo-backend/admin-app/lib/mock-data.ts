import type {
  UserRecord,
  StationRecord,
  VoucherRecord,
  VoucherEventRecord,
  CampaignRecord,
  CampaignTargetRecord,
  InsuranceQuoteRecord,
  SettingRecord,
  AuditLogRecord,
} from "./schemas";

const now = new Date();
const iso = (offsetDays = 0) => new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000).toISOString();

export const mockUsers: UserRecord[] = [
  {
    id: "user-001",
    msisdn_e164: "+250780000111",
    display_name: "Alice Mugenzi",
    status: "active",
    created_at: iso(12),
    total_vouchers: 4,
  },
  {
    id: "user-002",
    msisdn_e164: "+250788222333",
    display_name: "Brian Iyakaremye",
    status: "active",
    created_at: iso(30),
    total_vouchers: 2,
  },
  {
    id: "user-003",
    msisdn_e164: "+35699777000",
    display_name: "Carla Fenech",
    status: "inactive",
    created_at: iso(45),
    total_vouchers: 0,
  },
];

export const mockStations: StationRecord[] = [
  {
    id: "station-enga-kigali",
    name: "Engen Kigali Downtown",
    engen_code: "ENG-KGL-01",
    contact_name: "Samuel",
    contact_phone: "+250789123456",
    latitude: -1.94995,
    longitude: 30.05885,
    updated_at: iso(2),
  },
  {
    id: "station-mdina",
    name: "Mdina Fuel Hub",
    engen_code: "MLT-MDN-02",
    contact_name: "Elena",
    contact_phone: "+35699887766",
    latitude: 35.8844,
    longitude: 14.4067,
    updated_at: iso(5),
  },
];

export const mockVouchers: VoucherRecord[] = [
  {
    id: "vch-001",
    code: "71382",
    amount: 2000,
    status: "redeemed",
    issued_at: iso(8),
    redeemed_at: iso(2),
    campaign_id: "cmp-back-to-school",
    station_id: "station-enga-kigali",
    user_id: "user-001",
  },
  {
    id: "vch-002",
    code: "98215",
    amount: 2000,
    status: "sent",
    issued_at: iso(5),
    redeemed_at: null,
    campaign_id: "cmp-october-fuel",
    station_id: "station-mdina",
    user_id: "user-002",
  },
  {
    id: "vch-003",
    code: "44501",
    amount: 2000,
    status: "issued",
    issued_at: iso(1),
    redeemed_at: null,
    campaign_id: null,
    station_id: null,
    user_id: "user-003",
  },
  {
    id: "vch-004",
    code: "11904",
    amount: 2000,
    status: "redeemed",
    issued_at: iso(10),
    redeemed_at: iso(7),
    campaign_id: "cmp-back-to-school",
    station_id: "station-enga-kigali",
    user_id: "user-001",
  },
  {
    id: "vch-005",
    code: "65022",
    amount: 2000,
    status: "sent",
    issued_at: iso(3),
    redeemed_at: null,
    campaign_id: "cmp-back-to-school",
    station_id: "station-mdina",
    user_id: "user-002",
  },
  {
    id: "vch-006",
    code: "88340",
    amount: 2000,
    status: "redeemed",
    issued_at: iso(14),
    redeemed_at: iso(13),
    campaign_id: "cmp-october-fuel",
    station_id: "station-enga-kigali",
    user_id: "user-002",
  },
  {
    id: "vch-007",
    code: "43012",
    amount: 2000,
    status: "issued",
    issued_at: iso(6),
    redeemed_at: null,
    campaign_id: null,
    station_id: "station-enga-kigali",
    user_id: "user-003",
  },
  {
    id: "vch-008",
    code: "76455",
    amount: 2000,
    status: "sent",
    issued_at: iso(12),
    redeemed_at: null,
    campaign_id: "cmp-back-to-school",
    station_id: null,
    user_id: "user-001",
  },
];

export const mockVoucherEvents: VoucherEventRecord[] = [
  {
    id: "evt-001",
    voucher_id: "vch-001",
    event: "redeemed",
    source: "station_app",
    created_at: iso(2),
    payload: { station: "station-enga-kigali" },
  },
  {
    id: "evt-002",
    voucher_id: "vch-002",
    event: "sent",
    source: "whatsapp",
    created_at: iso(4),
    payload: { template: "promo_fuel" },
  },
  {
    id: "evt-003",
    voucher_id: "vch-002",
    event: "delivered",
    source: "whatsapp",
    created_at: iso(3),
    payload: { channel: "whatsapp" },
  },
  {
    id: "evt-004",
    voucher_id: "vch-005",
    event: "sent",
    source: "whatsapp",
    created_at: iso(3),
    payload: { template: "promo_fuel" },
  },
  {
    id: "evt-005",
    voucher_id: "vch-005",
    event: "delivered",
    source: "whatsapp",
    created_at: iso(2),
    payload: { channel: "whatsapp" },
  },
  {
    id: "evt-006",
    voucher_id: "vch-008",
    event: "sent",
    source: "whatsapp",
    created_at: iso(11),
    payload: { template: "promo_default_v1" },
  },
];

export const mockCampaigns: CampaignRecord[] = [
  {
    id: "cmp-back-to-school",
    name: "Back to School Boost",
    type: "voucher",
    status: "running",
    created_at: iso(20),
    updated_at: iso(1),
  },
  {
    id: "cmp-october-fuel",
    name: "October Fuel Promo",
    type: "promo",
    status: "draft",
    created_at: iso(5),
    updated_at: iso(5),
  },
];

export const mockCampaignTargets: CampaignTargetRecord[] = [
  {
    id: "tgt-001",
    campaign_id: "cmp-back-to-school",
    msisdn_e164: "+250780000111",
    status: "delivered",
    last_attempt_at: iso(3),
    error_code: null,
  },
  {
    id: "tgt-002",
    campaign_id: "cmp-back-to-school",
    msisdn_e164: "+250788222333",
    status: "pending",
    last_attempt_at: null,
    error_code: null,
  },
];

export const mockInsuranceQuotes: InsuranceQuoteRecord[] = [
  {
    id: "inq-001",
    user_id: "user-001",
    status: "pending_review",
    premium: 45000,
    vehicle_plate: "RAE042M",
    document_url: "https://example.com/in/rae042m.pdf",
    ocr_summary: { insurer: "Radiant", expiry_date: "2025-04-01" },
    submitted_at: iso(3),
  },
  {
    id: "inq-002",
    user_id: "user-003",
    status: "approved",
    premium: 52000,
    vehicle_plate: "ABZ123",
    document_url: "https://example.com/in/abz123.pdf",
    ocr_summary: { insurer: "Allied", expiry_date: "2025-03-15" },
    submitted_at: iso(10),
  },
];

export const mockSettings: SettingRecord[] = [
  {
    key: "quiet_hours",
    value: "22:00-06:00",
    description: "Outbound WhatsApp throttled during these hours.",
    updated_at: iso(7),
  },
  {
    key: "whatsapp_template_fallback",
    value: "promo_default_v1",
    description: "Default template when campaigns do not specify one.",
    updated_at: iso(12),
  },
];

export const mockAuditLog: AuditLogRecord[] = [
  {
    id: "log-001",
    created_at: iso(1),
    actor: "alice@easymo.africa",
    action: "voucher.issue",
    entity: "voucher",
    entity_id: "vch-003",
    payload: { amount: 2000, campaign: null },
  },
  {
    id: "log-002",
    created_at: iso(2),
    actor: "system",
    action: "campaign.pause",
    entity: "campaign",
    entity_id: "cmp-back-to-school",
    payload: { reason: "manual" },
  },
];
