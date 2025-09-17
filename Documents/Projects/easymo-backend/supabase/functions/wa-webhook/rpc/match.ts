import { sb } from "../config.ts";

export interface TripMatchRow {
  user_id?: string;
  whatsapp_e164?: string;
  trip_id?: string;
  score?: number;
  name?: string;
}

export async function rpcMatchDriversForTrip(tripId: string, limit = 10): Promise<TripMatchRow[]> {
  try {
    const { data, error } = await sb.rpc("match_drivers_for_trip", {
      _trip_id: tripId,
      _limit: limit,
    });
    if (error) throw error;
    return Array.isArray(data) ? data as TripMatchRow[] : [];
  } catch (err) {
    console.error("match_drivers_for_trip failed", err);
    return [];
  }
}

export async function rpcMatchPassengersForTrip(tripId: string, limit = 10): Promise<TripMatchRow[]> {
  try {
    const { data, error } = await sb.rpc("match_passengers_for_trip", {
      _trip_id: tripId,
      _limit: limit,
    });
    if (error) throw error;
    return Array.isArray(data) ? data as TripMatchRow[] : [];
  } catch (err) {
    console.error("match_passengers_for_trip failed", err);
    return [];
  }
}
