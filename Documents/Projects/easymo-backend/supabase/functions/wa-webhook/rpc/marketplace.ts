import { sb } from "../config.ts";
import { logError } from "../utils/logger.ts";
import type { LogContext } from "../utils/logger.ts";

export interface CategoryRow {
  id: number;
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface BusinessRow {
  id: string;
  owner_whatsapp?: string;
  category_id?: number;
  name?: string;
  description?: string;
  catalog_url?: string;
  geo?: unknown;
  is_active?: boolean;
}

export async function fetchMarketplaceCategories(logCtx?: LogContext): Promise<CategoryRow[]> {
  try {
    const { data, error } = await sb
      .from("marketplace_categories")
      .select("id,name,sort_order,is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return Array.isArray(data) ? data as CategoryRow[] : [];
  } catch (err) {
    logError("MARKETPLACE_CATEGORIES_FAILED", err, {}, logCtx);
    return [];
  }
}

export async function fetchBusinessById(id: string, logCtx?: LogContext): Promise<BusinessRow | null> {
  try {
    const { data, error } = await sb
      .from("businesses")
      .select("id,owner_whatsapp,category_id,name,description,catalog_url,geo,is_active")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as BusinessRow) ?? null;
  } catch (err) {
    logError("MARKETPLACE_BUSINESS_FETCH_FAILED", err, { id }, logCtx);
    return null;
  }
}

export async function insertBusiness(payload: {
  owner_whatsapp: string;
  category_id: number;
  name: string;
  description?: string | null;
  catalog_url?: string | null;
  geo?: string | null;
}, logCtx?: LogContext) {
  try {
    const { data, error } = await sb
      .from("businesses")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    return data?.id as string;
  } catch (err) {
    logError("MARKETPLACE_INSERT_FAILED", err, { owner: payload.owner_whatsapp }, logCtx);
    return null;
  }
}

export async function rpcNearbyBusinesses(
  lat: number,
  lon: number,
  viewer: string,
  limit = 10,
  logCtx?: LogContext,
): Promise<BusinessRow[]> {
  try {
    const { data, error } = await sb.rpc("nearby_businesses", {
      _lat: lat,
      _lon: lon,
      _viewer: viewer,
      _limit: limit,
    });
    if (error) throw error;
    return Array.isArray(data) ? data as BusinessRow[] : [];
  } catch (err) {
    logError("RPC_NEARBY_BUSINESSES_FAILED", err, {
      viewer,
      limit,
    }, logCtx);
    return [];
  }
}
