import { sb } from "../config.ts";
import { logError, logInfo } from "../utils/logger.ts";
import type { LogContext } from "../utils/logger.ts";

export interface NearbyDriverRow {
  driver_user_id?: string;
  whatsapp_e164?: string;
  name?: string;
  distance_km?: number;
  duration_minutes?: number;
  eta_minutes?: number;
}

export interface NearbyPassengerRow {
  passenger_trip_id?: string;
  whatsapp_e164?: string;
  name?: string;
  distance_km?: number;
  duration_minutes?: number;
  eta_minutes?: number;
}

export async function rpcNearbyDriversByVehicle(
  lat: number,
  lon: number,
  viewer: string,
  vehicle: string,
  limit = 10,
  logCtx?: LogContext,
): Promise<NearbyDriverRow[]> {
  try {
    const { data, error } = await sb.rpc("nearby_drivers_by_vehicle", {
      _lat: lat,
      _lon: lon,
      _viewer: viewer,
      _vehicle: vehicle,
      _limit: limit,
    });
    if (error) throw error;
    const rows = Array.isArray(data) ? data as NearbyDriverRow[] : [];
    logInfo("RPC_NEARBY_DRIVERS_OK", {
      viewer,
      vehicle,
      count: rows.length,
      limit,
    }, logCtx);
    return rows;
  } catch (err) {
    const message = (err as { message?: string } | null | undefined)?.message ?? "";
    if (message.includes("does not exist")) {
      logError("RPC_NEARBY_DRIVERS_MISSING", err, {}, logCtx);
    } else {
      logError("RPC_NEARBY_DRIVERS_FAILED", err, {
        viewer,
        vehicle,
        limit,
      }, logCtx);
    }
    return [];
  }
}

export async function rpcNearbyPassengersByVehicle(
  lat: number,
  lon: number,
  viewer: string,
  vehicle: string,
  limit = 10,
  logCtx?: LogContext,
): Promise<NearbyPassengerRow[]> {
  try {
    const { data, error } = await sb.rpc("nearby_passengers_by_vehicle", {
      _lat: lat,
      _lon: lon,
      _viewer: viewer,
      _vehicle: vehicle,
      _limit: limit,
    });
    if (error) throw error;
    const rows = Array.isArray(data) ? data as NearbyPassengerRow[] : [];
    logInfo("RPC_NEARBY_PASSENGERS_OK", {
      viewer,
      vehicle,
      count: rows.length,
      limit,
    }, logCtx);
    return rows;
  } catch (err) {
    const message = (err as { message?: string } | null | undefined)?.message ?? "";
    if (message.includes("does not exist")) {
      logError("RPC_NEARBY_PASSENGERS_MISSING", err, {}, logCtx);
    } else {
      logError("RPC_NEARBY_PASSENGERS_FAILED", err, {
        viewer,
        vehicle,
        limit,
      }, logCtx);
    }
    return [];
  }
}

export async function markServedDriver(viewerMsisdn: string, driverUserId?: string | null, logCtx?: LogContext) {
  if (!driverUserId) return;
  try {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await sb.from("served_drivers").insert({
      viewer_passenger_msisdn: viewerMsisdn,
      driver_contact_id: driverUserId,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    logError("SERVED_DRIVER_MARK_FAILED", err, {
      viewer: viewerMsisdn,
      driverUserId,
    }, logCtx);
  }
}

export async function markServedPassenger(viewerMsisdn: string, tripId?: string | null, logCtx?: LogContext) {
  if (!tripId) return;
  try {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await sb.from("served_passengers").insert({
      viewer_driver_msisdn: viewerMsisdn,
      passenger_trip_id: tripId,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    logError("SERVED_PASSENGER_MARK_FAILED", err, {
      viewer: viewerMsisdn,
      tripId,
    }, logCtx);
  }
}
