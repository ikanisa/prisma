import { sb } from "../config.ts";

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
    return Array.isArray(data) ? data as NearbyDriverRow[] : [];
  } catch (err) {
    const message = (err as { message?: string } | null | undefined)?.message ?? "";
    if (message.includes("does not exist")) {
      console.error("MISSING_RPC: nearby_drivers_by_vehicle");
    } else {
      console.error("nearby_drivers_by_vehicle failed", err);
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
    return Array.isArray(data) ? data as NearbyPassengerRow[] : [];
  } catch (err) {
    const message = (err as { message?: string } | null | undefined)?.message ?? "";
    if (message.includes("does not exist")) {
      console.error("MISSING_RPC: nearby_passengers_by_vehicle");
    } else {
      console.error("nearby_passengers_by_vehicle failed", err);
    }
    return [];
  }
}

export async function markServedDriver(viewerMsisdn: string, driverUserId?: string | null) {
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
    console.error("markServedDriver failed", err);
  }
}

export async function markServedPassenger(viewerMsisdn: string, tripId?: string | null) {
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
    console.error("markServedPassenger failed", err);
  }
}
