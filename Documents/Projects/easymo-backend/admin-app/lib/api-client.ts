import { z } from "zod";
import {
  VoucherSchema,
  UserSchema,
  CampaignSchema,
  StationSchema,
  InsuranceQuoteSchema,
  type VoucherRecord,
  type UserRecord,
  type CampaignRecord,
  type StationRecord,
  type InsuranceQuoteRecord,
} from "@/lib/schemas";

const VoucherRecordSchema = VoucherSchema;

const VouchersResponseSchema = z.object({
  data: z.object({
    items: z.array(VoucherRecordSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    source: z.enum(["supabase", "mock"]),
  }),
});

export async function fetchVouchers(params: URLSearchParams): Promise<{
  items: VoucherRecord[];
  total: number;
  page: number;
  pageSize: number;
  source: "supabase" | "mock";
}> {
  const response = await fetch(`/api/v1/vouchers?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load vouchers (${response.status})`);
  }
  const json = await response.json();
  const parsed = VouchersResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Unexpected response shape");
  }
  return parsed.data.data;
}

const UserRecordSchema = UserSchema;

const UsersResponseSchema = z.object({
  data: z.object({
    items: z.array(UserRecordSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    source: z.enum(["supabase", "mock"]),
  }),
});

const InsuranceRecordSchema = InsuranceQuoteSchema;

const UserDetailResponseSchema = z.object({
  data: z.object({
    user: UserRecordSchema,
    vouchers: z.array(VoucherRecordSchema),
    quotes: z.array(InsuranceRecordSchema),
    source: z.object({
      user: z.enum(["supabase", "mock"]),
      vouchers: z.enum(["supabase", "mock"]),
      quotes: z.enum(["supabase", "mock"]),
    }),
  }),
});

export async function fetchUsers(params: URLSearchParams): Promise<{
  items: UserRecord[];
  total: number;
  page: number;
  pageSize: number;
  source: "supabase" | "mock";
}> {
  const response = await fetch(`/api/v1/users?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load users (${response.status})`);
  }
  const json = await response.json();
  const parsed = UsersResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Unexpected response shape");
  }
  return parsed.data.data;
}

export async function fetchUserDetail(userId: string): Promise<{
  user: UserRecord;
  vouchers: VoucherRecord[];
  quotes: InsuranceQuoteRecord[];
  source: { user: "supabase" | "mock"; vouchers: "supabase" | "mock"; quotes: "supabase" | "mock" };
}> {
  const response = await fetch(`/api/v1/users/${encodeURIComponent(userId)}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load user detail (${response.status})`);
  }
  const json = await response.json();
  const parsed = UserDetailResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Unexpected response shape");
  }
  return parsed.data.data;
}

const CampaignRecordSchema = CampaignSchema;

const CampaignsResponseSchema = z.object({
  data: z.object({
    items: z.array(CampaignRecordSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    source: z.enum(["supabase", "mock"]),
  }),
});

export async function fetchCampaigns(params: URLSearchParams): Promise<{
  items: CampaignRecord[];
  total: number;
  page: number;
  pageSize: number;
  source: "supabase" | "mock";
}> {
  const response = await fetch(`/api/v1/campaigns?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load campaigns (${response.status})`);
  }
  const json = await response.json();
  const parsed = CampaignsResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Unexpected response shape");
  }
  return parsed.data.data;
}


const StationRecordSchema = StationSchema;

const StationsResponseSchema = z.object({
  data: z.object({
    items: z.array(StationRecordSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    source: z.enum(["supabase", "mock"]),
  }),
});

export async function fetchStations(params: URLSearchParams): Promise<{
  items: StationRecord[];
  total: number;
  page: number;
  pageSize: number;
  source: "supabase" | "mock";
}> {
  const response = await fetch(`/api/v1/stations?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load stations (${response.status})`);
  }
  const json = await response.json();
  const parsed = StationsResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Unexpected response shape");
  }
  return parsed.data.data;
}

const InsuranceResponseSchema = z.object({
  data: z.object({
    items: z.array(InsuranceRecordSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    source: z.enum(["supabase", "mock"]),
  }),
});

export async function fetchInsuranceQuotes(params: URLSearchParams): Promise<{
  items: InsuranceQuoteRecord[];
  total: number;
  page: number;
  pageSize: number;
  source: "supabase" | "mock";
}> {
  const response = await fetch(`/api/v1/insurance?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load insurance quotes (${response.status})`);
  }
  const json = await response.json();
  const parsed = InsuranceResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Unexpected response shape");
  }
  return parsed.data.data;
}
