import { sb } from "../config.ts";
import { logError, logInfo } from "../utils/logger.ts";
import type { LogContext } from "../utils/logger.ts";

export interface TripMatchRow {
  user_id?: string;
  whatsapp_e164?: string;
  trip_id?: string;
  score?: number;
  name?: string;
}

export async function rpcMatchDriversForTrip(tripId: string, limit = 10, logCtx?: LogContext): Promise<TripMatchRow[]> {
  try {
    const { data, error } = await sb.rpc("match_drivers_for_trip", {
      _trip_id: tripId,
      _limit: limit,
    });
    if (error) throw error;
    const rows = Array.isArray(data) ? data as TripMatchRow[] : [];
    logInfo("RPC_MATCH_DRIVERS_OK", {
      tripId,
      count: rows.length,
      limit,
    }, logCtx);
    return rows;
  } catch (err) {
    logError("RPC_MATCH_DRIVERS_FAILED", err, {
      tripId,
      limit,
    }, logCtx);
    return [];
  }
}

export async function rpcMatchPassengersForTrip(tripId: string, limit = 10, logCtx?: LogContext): Promise<TripMatchRow[]> {
  try {
    const { data, error } = await sb.rpc("match_passengers_for_trip", {
      _trip_id: tripId,
      _limit: limit,
    });
    if (error) throw error;
    const rows = Array.isArray(data) ? data as TripMatchRow[] : [];
    logInfo("RPC_MATCH_PASSENGERS_OK", {
      tripId,
      count: rows.length,
      limit,
    }, logCtx);
    return rows;
  } catch (err) {
    logError("RPC_MATCH_PASSENGERS_FAILED", err, {
      tripId,
      limit,
    }, logCtx);
    return [];
  }
}
