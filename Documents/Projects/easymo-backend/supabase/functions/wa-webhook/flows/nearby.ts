import { sendList, sendText } from "../wa/client.ts";
import { ConversationContext } from "../state/types.ts";
import { setState } from "../state/store.ts";
import { fmtKm, safeRowDesc, safeRowTitle } from "../utils/text.ts";
import { to07FromE164 } from "../utils/phone.ts";
import {
  markServedDriver,
  markServedPassenger,
  rpcNearbyDriversByVehicle,
  rpcNearbyPassengersByVehicle,
  NearbyDriverRow,
  NearbyPassengerRow,
} from "../rpc/nearby.ts";

interface DriverOption {
  title: string;
  description: string;
  wa: string;
  driver_user_id?: string | null;
}

interface PassengerOption {
  title: string;
  description: string;
  wa: string;
  passenger_trip_id?: string | null;
}

interface NearbyState<T> {
  vehicle_type?: string;
  results?: T[];
}

function vehicleFromId(id: string): string {
  if (id.endsWith("_moto")) return "moto";
  if (id.endsWith("_cab")) return "cab";
  if (id.endsWith("_lifan")) return "lifan";
  if (id.endsWith("_truck")) return "truck";
  return "others";
}

function makeDriverOptions(rows: NearbyDriverRow[]): DriverOption[] {
  return rows.slice(0, 10).map((row, index) => {
    const wa = row.whatsapp_e164 ?? "";
    const title = row.name?.trim() || to07FromE164(wa) || `Driver ${index + 1}`;
    const distance = fmtKm(row.distance_km ?? 0);
    const eta = row.eta_minutes ?? row.duration_minutes;
    const parts: string[] = [];
    if (distance) parts.push(distance);
    if (eta != null) parts.push(`${Math.round(Number(eta))} min away`);
    const description = parts.join(" • ") || "Available now";
    return {
      title,
      description,
      wa,
      driver_user_id: row.driver_user_id ?? null,
    };
  });
}

function makePassengerOptions(rows: NearbyPassengerRow[]): PassengerOption[] {
  return rows.slice(0, 10).map((row, index) => {
    const wa = row.whatsapp_e164 ?? "";
    const title = row.name?.trim() || to07FromE164(wa) || `Passenger ${index + 1}`;
    const distance = fmtKm(row.distance_km ?? 0);
    const eta = row.eta_minutes ?? row.duration_minutes;
    const parts: string[] = [];
    if (distance) parts.push(distance);
    if (eta != null) parts.push(`${Math.round(Number(eta))} min away`);
    const description = parts.join(" • ") || "Needs a ride";
    return {
      title,
      description,
      wa,
      passenger_trip_id: row.passenger_trip_id ?? null,
    };
  });
}

async function askForVehicle(ctx: ConversationContext, kind: "drivers" | "passengers") {
  const rows = kind === "drivers"
    ? [
      { id: "near_v_drv_moto", title: "Moto" },
      { id: "near_v_drv_cab", title: "Cab" },
      { id: "near_v_drv_lifan", title: "Lifan" },
      { id: "near_v_drv_truck", title: "Truck" },
      { id: "near_v_drv_others", title: "Others" },
    ]
    : [
      { id: "near_v_pax_moto", title: "Moto" },
      { id: "near_v_pax_cab", title: "Cab" },
      { id: "near_v_pax_lifan", title: "Lifan" },
      { id: "near_v_pax_truck", title: "Truck" },
      { id: "near_v_pax_others", title: "Others" },
    ];

  await sendList(ctx.phone, {
    title: kind === "drivers" ? "Nearby Drivers" : "Nearby Passengers",
    body: "Select a vehicle type.",
    buttonText: "Choose",
    sectionTitle: "Vehicle",
    rows: rows.map((row) => ({
      id: row.id,
      title: safeRowTitle(row.title),
      description: safeRowDesc(""),
    })),
  });
}

export async function startNearbyDrivers(ctx: ConversationContext) {
  await askForVehicle(ctx, "drivers");
  await setState(ctx.userId, "near_vehicle_choice_drivers", {});
  ctx.state = { key: "near_vehicle_choice_drivers", data: {} };
}

export async function startNearbyPassengers(ctx: ConversationContext) {
  await askForVehicle(ctx, "passengers");
  await setState(ctx.userId, "near_vehicle_choice_pax", {});
  ctx.state = { key: "near_vehicle_choice_pax", data: {} };
}

export async function handleDriverVehicleChoice(ctx: ConversationContext, id: string) {
  const vehicle = vehicleFromId(id);
  await setState(ctx.userId, "near_await_loc_drivers", { vehicle_type: vehicle });
  ctx.state = { key: "near_await_loc_drivers", data: { vehicle_type: vehicle } };
  await sendText(ctx.phone, "Share your live location to see nearby drivers.");
}

export async function handlePassengerVehicleChoice(ctx: ConversationContext, id: string) {
  const vehicle = vehicleFromId(id);
  await setState(ctx.userId, "near_await_loc_passengers", { vehicle_type: vehicle });
  ctx.state = { key: "near_await_loc_passengers", data: { vehicle_type: vehicle } };
  await sendText(ctx.phone, "Share your live location to find passengers near you.");
}

export async function handleDriverLocation(ctx: ConversationContext, lat: number, lon: number) {
  const current = (ctx.state.data as NearbyState<DriverOption> | undefined) ?? {};
  const vehicle = current.vehicle_type ?? "";
  if (!vehicle) {
    await sendText(ctx.phone, "Please choose a vehicle type first.");
    await startNearbyDrivers(ctx);
    return;
  }

  const rows = await rpcNearbyDriversByVehicle(lat, lon, ctx.phone, vehicle, 10);
  const options = makeDriverOptions(rows);
  if (!options.length) {
    await sendText(ctx.phone, "No drivers nearby for that vehicle right now. Try again soon.");
    await setState(ctx.userId, "home", {});
    ctx.state = { key: "home", data: {} };
    return;
  }

  await sendList(ctx.phone, {
    title: "Drivers Nearby",
    body: `Here are ${options.length} driver(s) near you.\nVehicle: ${vehicle}`,
    buttonText: "View",
    sectionTitle: "Drivers",
    rows: options.map((option, index) => ({
      id: `drv_${index}`,
      title: safeRowTitle(option.title),
      description: safeRowDesc(option.description),
    })),
  });

  const nextState: NearbyState<DriverOption> = {
    vehicle_type: vehicle,
    results: options,
  };
  await setState(ctx.userId, "near_vehicle_choice_drivers", nextState);
  ctx.state = { key: "near_vehicle_choice_drivers", data: nextState };
}

export async function handlePassengerLocation(ctx: ConversationContext, lat: number, lon: number) {
  const current = (ctx.state.data as NearbyState<PassengerOption> | undefined) ?? {};
  const vehicle = current.vehicle_type ?? "";
  if (!vehicle) {
    await sendText(ctx.phone, "Please choose a vehicle type first.");
    await startNearbyPassengers(ctx);
    return;
  }

  const rows = await rpcNearbyPassengersByVehicle(lat, lon, ctx.phone, vehicle, 10);
  const options = makePassengerOptions(rows);
  if (!options.length) {
    await sendText(ctx.phone, "No passengers nearby for that vehicle right now. Try again soon.");
    await setState(ctx.userId, "home", {});
    ctx.state = { key: "home", data: {} };
    return;
  }

  await sendList(ctx.phone, {
    title: "Passengers Nearby",
    body: `Here are ${options.length} passenger(s).\nVehicle: ${vehicle}`,
    buttonText: "View",
    sectionTitle: "Passengers",
    rows: options.map((option, index) => ({
      id: `pax_${index}`,
      title: safeRowTitle(option.title),
      description: safeRowDesc(option.description),
    })),
  });

  const nextState: NearbyState<PassengerOption> = {
    vehicle_type: vehicle,
    results: options,
  };
  await setState(ctx.userId, "near_vehicle_choice_pax", nextState);
  ctx.state = { key: "near_vehicle_choice_pax", data: nextState };
}

export async function handleDriverSelection(ctx: ConversationContext, id: string) {
  const index = Number.parseInt(id.replace("drv_", ""), 10);
  const current = (ctx.state.data as NearbyState<DriverOption> | undefined) ?? {};
  const option = current.results?.[index];
  if (!option) {
    await sendText(ctx.phone, "Driver no longer available.");
    return;
  }

  const digits = option.wa.replace(/\D/g, "");
  if (!digits) {
    await sendText(ctx.phone, "Driver contact unavailable. Try another option.");
    return;
  }

  await sendText(ctx.phone, `Open chat: https://wa.me/${digits}`);
  await markServedDriver(ctx.phone, option.driver_user_id ?? null);
  await setState(ctx.userId, "home", {});
  ctx.state = { key: "home", data: {} };
}

export async function handlePassengerSelection(ctx: ConversationContext, id: string) {
  const index = Number.parseInt(id.replace("pax_", ""), 10);
  const current = (ctx.state.data as NearbyState<PassengerOption> | undefined) ?? {};
  const option = current.results?.[index];
  if (!option) {
    await sendText(ctx.phone, "Passenger no longer available.");
    return;
  }

  const digits = option.wa.replace(/\D/g, "");
  if (!digits) {
    await sendText(ctx.phone, "Passenger contact unavailable right now.");
    return;
  }

  await sendText(ctx.phone, `Open chat: https://wa.me/${digits}`);
  await markServedPassenger(ctx.phone, option.passenger_trip_id ?? null);
  await setState(ctx.userId, "home", {});
  ctx.state = { key: "home", data: {} };
}
