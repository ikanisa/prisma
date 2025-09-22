import { getSupabaseClient } from "./supabase-client";
import {
  UsersSchema,
  StationsSchema,
  VouchersSchema,
  VoucherEventsSchema,
  CampaignsSchema,
  CampaignTargetsSchema,
  InsuranceQuotesSchema,
  SettingsCollectionSchema,
  AuditLogCollectionSchema,
  type UserRecord,
  type StationRecord,
  type VoucherRecord,
  type VoucherEventRecord,
  type CampaignRecord,
  type CampaignTargetRecord,
  type InsuranceQuoteRecord,
  type SettingRecord,
  type AuditLogRecord,
} from "./schemas";
import {
  mockUsers,
  mockStations,
  mockVouchers,
  mockVoucherEvents,
  mockCampaigns,
  mockCampaignTargets,
  mockInsuranceQuotes,
  mockSettings,
  mockAuditLog,
} from "./mock-data";

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  filters?: Record<string, string | number | boolean | (string | number | boolean)[] | undefined>;
}

export interface QueryResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  source: "supabase" | "mock";
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

function normalisePagination(options?: QueryOptions) {
  const page = Math.max(options?.page ?? DEFAULT_PAGE, 1);
  const pageSize = Math.min(Math.max(options?.pageSize ?? DEFAULT_PAGE_SIZE, 1), 200);
  return { page, pageSize };
}

async function fetchWithFallback<T extends Record<string, unknown>>(
  table: string,
  schema: (value: unknown) => T[],
  mockData: T[],
  options?: QueryOptions,
  select = "*",
  searchKeys: string[] = [],
): Promise<QueryResult<T>> {
  const supabase = getSupabaseClient();
  const { page, pageSize } = normalisePagination(options);

  if (!supabase) {
    const filtered = mockFilter(mockData, options, searchKeys);
    return { data: filtered, total: filtered.length, page, pageSize, source: "mock" };
  }

  try {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    let query = supabase.from(table).select(select, { count: "exact" }).range(start, end);

    if (options?.search && searchKeys.length) {
      const term = options.search.trim();
      const filters = searchKeys.map((key) => `${key}.ilike.%${term}%`);
      query = query.or(filters.join(","));
    }

    if (options?.filters) {
      for (const [key, raw] of Object.entries(options.filters)) {
        if (raw === undefined) continue;
        if (Array.isArray(raw)) {
          if (raw.length === 0) continue;
          query = query.in(key, raw as (string | number | boolean)[]);
        } else {
          query = query.eq(key, raw as string | number | boolean);
        }
      }
    }

    const { data, error, count } = await query;
    if (error) throw error;
    const parsed = schema(data ?? []);
    return {
      data: parsed,
      total: count ?? parsed.length,
      page,
      pageSize,
      source: "supabase",
    };
  } catch (error) {
    console.warn(`Falling back to mock data for ${table}:`, error);
    const filtered = mockFilter(mockData, options, searchKeys);
    return {
      data: filtered,
      total: filtered.length,
      page,
      pageSize,
      source: "mock",
    };
  }
}

function mockFilter<T extends Record<string, unknown>>(records: T[], options?: QueryOptions, searchKeys?: string[]) {
  let result = [...records];
  const search = options?.search?.toLowerCase();
  if (search) {
    result = result.filter((record) =>
      (searchKeys && searchKeys.length ? searchKeys : Object.keys(record)).some((key) => {
        const value = record[key as keyof T];
        return typeof value === "string" && value.toLowerCase().includes(search);
      }),
    );
  }

  if (options?.filters) {
    result = result.filter((record) =>
      Object.entries(options.filters ?? {}).every(([key, raw]) => {
        if (raw === undefined) return true;
        const value = record[key as keyof T];
        if (Array.isArray(raw)) {
          if (raw.length === 0) return true;
          return raw.includes(value as never);
        }
        return value === raw;
      }),
    );
  }

  const { page, pageSize } = normalisePagination(options);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return result.slice(start, end);
}

export const dataService = {
  async getUsers(options?: QueryOptions): Promise<QueryResult<UserRecord>> {
    return fetchWithFallback("users", (v) => UsersSchema.parse(v), mockUsers, options, "*", ["display_name", "msisdn_e164"]);
  },
  async getStations(options?: QueryOptions): Promise<QueryResult<StationRecord>> {
    return fetchWithFallback("stations", (v) => StationsSchema.parse(v), mockStations, options, "*", ["name", "engen_code"]);
  },
  async getVouchers(options?: QueryOptions): Promise<QueryResult<VoucherRecord>> {
    return fetchWithFallback("vouchers", (v) => VouchersSchema.parse(v), mockVouchers, options, "*", ["code", "status"]);
  },
  async getVoucherEvents(options?: QueryOptions): Promise<QueryResult<VoucherEventRecord>> {
    return fetchWithFallback("voucher_events", (v) => VoucherEventsSchema.parse(v), mockVoucherEvents, options, "*", ["event", "source"]);
  },
  async getCampaigns(options?: QueryOptions): Promise<QueryResult<CampaignRecord>> {
    return fetchWithFallback("campaigns", (v) => CampaignsSchema.parse(v), mockCampaigns, options, "*", ["name", "status"]);
  },
  async getCampaignTargets(options?: QueryOptions): Promise<QueryResult<CampaignTargetRecord>> {
    return fetchWithFallback("campaign_targets", (v) => CampaignTargetsSchema.parse(v), mockCampaignTargets, options, "*", ["msisdn_e164", "status"]);
  },
  async getInsuranceQuotes(options?: QueryOptions): Promise<QueryResult<InsuranceQuoteRecord>> {
    return fetchWithFallback("insurance_quotes", (v) => InsuranceQuotesSchema.parse(v), mockInsuranceQuotes, options, "*", ["vehicle_plate", "status"]);
  },
  async getSettings(options?: QueryOptions): Promise<QueryResult<SettingRecord>> {
    return fetchWithFallback("settings", (v) => SettingsCollectionSchema.parse(v), mockSettings, options ?? { pageSize: 100 });
  },
  async getAuditLog(options?: QueryOptions): Promise<QueryResult<AuditLogRecord>> {
    return fetchWithFallback("audit_log", (v) => AuditLogCollectionSchema.parse(v), mockAuditLog, options, "*", ["action", "actor", "entity"]);
  },
};

export type DataService = typeof dataService;
