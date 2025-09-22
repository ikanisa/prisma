import { sendButtons, sendList, sendText } from "../wa/client.ts";
import { ConversationContext } from "../state/types.ts";
import { setState } from "../state/store.ts";
import { sb } from "../config.ts";
import { fmtKm, safeRowDesc, safeRowTitle } from "../utils/text.ts";
import { to07FromE164 } from "../utils/phone.ts";
import { rpcMatchDriversForTrip, rpcMatchPassengersForTrip, TripMatchRow } from "../rpc/match.ts";
import { ctxFromConversation } from "../utils/logger.ts";

interface ScheduleState {
  role?: "passenger" | "driver";
  vehicle_type?: string;
  trip_id?: string;
  results?: MatchOption[];
}

interface MatchOption {
  title: string;
  description: string;
  wa: string;
  user_id?: string | null;
  trip_id?: string | null;
}

const ROLE_ROWS = [
  { id: "role_passenger", title: "I'm a passenger" },
  { id: "role_driver", title: "I'm a driver" },
];

const VEHICLE_ROWS = [
  { id: "veh_moto", title: "Moto" },
  { id: "veh_cab", title: "Cab" },
  { id: "veh_lifan", title: "Lifan" },
  { id: "veh_truck", title: "Truck" },
  { id: "veh_others", title: "Others" },
];

function vehicleFromId(id: string): string {
  if (id.endsWith("_moto")) return "moto";
  if (id.endsWith("_cab")) return "cab";
  if (id.endsWith("_lifan")) return "lifan";
  if (id.endsWith("_truck")) return "truck";
  return "others";
}

function replyText(ctx: ConversationContext, body: string) {
  return sendText(ctx.phone, body, ctxFromConversation(ctx));
}

function replyButtons(ctx: ConversationContext, body: string, buttons: Parameters<typeof sendButtons>[2]) {
  return sendButtons(ctx.phone, body, buttons, ctxFromConversation(ctx));
}

function replyList(ctx: ConversationContext, options: Parameters<typeof sendList>[1]) {
  return sendList(ctx.phone, options, ctxFromConversation(ctx));
}

export async function startSchedule(ctx: ConversationContext) {
  await replyList(ctx, {
    title: "Schedule Trip",
    body: "Who are you scheduling for?",
    buttonText: "Select",
    sectionTitle: "Role",
    rows: ROLE_ROWS.map((row) => ({
      id: row.id,
      title: safeRowTitle(row.title),
      description: safeRowDesc(""),
    })),
  });
  await setState(ctx.userId, "await_schedule_role", {});
  ctx.state = { key: "await_schedule_role", data: {} };
}

export async function handleRoleChoice(ctx: ConversationContext, id: string) {
  const role: "passenger" | "driver" = id === "role_driver" ? "driver" : "passenger";
  await replyList(ctx, {
    title: "Select Vehicle",
    body: "Which vehicle type?",
    buttonText: "Choose",
    sectionTitle: "Vehicle",
    rows: VEHICLE_ROWS.map((row) => ({
      id: row.id,
      title: safeRowTitle(row.title),
      description: safeRowDesc(""),
    })),
  });
  const nextState: ScheduleState = { role };
  await setState(ctx.userId, "await_schedule_vehicle", nextState);
  ctx.state = { key: "await_schedule_vehicle", data: nextState };
}

export async function handleVehicleChoice(ctx: ConversationContext, id: string) {
  const current = (ctx.state.data as ScheduleState | undefined) ?? {};
  const role = current.role;
  if (!role) {
    await startSchedule(ctx);
    return;
  }

  const vehicle_type = vehicleFromId(id);
  const nextState: ScheduleState = { role, vehicle_type };
  await replyText(ctx, "Share pickup location to schedule your trip.");
  await setState(ctx.userId, "await_schedule_pickup", nextState);
  ctx.state = { key: "await_schedule_pickup", data: nextState };
}

async function insertTrip(userId: string, role: "passenger" | "driver", vehicle_type: string, lon: number, lat: number) {
  const payload = {
    creator_user_id: userId,
    role,
    vehicle_type,
    pickup: { type: "Point", coordinates: [lon, lat] }, // ST_SetSRID(ST_Point(lon, lat), 4326)
    status: "open",
    created_at: new Date().toISOString(),
  };

  const res = await sb
    .from("trips")
    .insert(payload)
    .select("id")
    .single();

  if (res.error) throw res.error;
  return res.data.id as string;
}

async function updateTripDropoff(tripId: string, lon: number, lat: number) {
  await sb
    .from("trips")
    .update({
      dropoff: { type: "Point", coordinates: [lon, lat] }, // ST_SetSRID(ST_Point(lon, lat), 4326)
    })
    .eq("id", tripId);
}

export async function handlePickupLocation(ctx: ConversationContext, lat: number, lon: number) {
  const current = (ctx.state.data as ScheduleState | undefined) ?? {};
  const role = current.role;
  const vehicle_type = current.vehicle_type;
  if (!role || !vehicle_type) {
    await startSchedule(ctx);
    return;
  }

  const tripId = await insertTrip(ctx.userId, role, vehicle_type, lon, lat);
  await replyButtons(ctx, "Add a drop-off point?", [
    { id: `sched_add_drop_${tripId}`, title: "Add Drop-off" },
    { id: `sched_skip_drop_${tripId}`, title: "Skip" },
  ]);

  const nextState: ScheduleState = { role, vehicle_type, trip_id: tripId };
  await setState(ctx.userId, "sched_prompt_drop_cta", nextState);
  ctx.state = { key: "sched_prompt_drop_cta", data: nextState };
}

export async function handleAddDropButton(ctx: ConversationContext, tripId: string) {
  const current = (ctx.state.data as ScheduleState | undefined) ?? {};
  if (!current.trip_id || current.trip_id !== tripId) {
    await replyText(ctx, "Trip session expired. Start again.");
    await startSchedule(ctx);
    return;
  }

  await replyText(ctx, "Share the drop-off location.");
  await setState(ctx.userId, "sched_await_drop", current);
  ctx.state = { key: "sched_await_drop", data: current };
}

async function matchTrips(ctx: ConversationContext, tripId: string, role: "passenger" | "driver", vehicle_type?: string) {
  const logCtx = ctxFromConversation(ctx);
  const matches = role === "passenger"
    ? await rpcMatchDriversForTrip(tripId, 10, logCtx)
    : await rpcMatchPassengersForTrip(tripId, 10, logCtx);

  if (!matches.length) {
    await replyText(ctx, "No matches yet. We will notify you when someone is available.");
    await setState(ctx.userId, "home", {});
    ctx.state = { key: "home", data: {} };
    return;
  }

  const options: MatchOption[] = matches.slice(0, 10).map((match, index) => {
    const wa = match.whatsapp_e164 ?? "";
    const title = match.name?.trim() || to07FromE164(wa) || `Match ${index + 1}`;
    const distance = fmtKm(match.score ?? 0);
    const description = distance ? `Score ${distance}` : "Potential match";
    return {
      title,
      description,
      wa,
      user_id: match.user_id ?? null,
      trip_id: match.trip_id ?? null,
    };
  });

  await replyList(ctx, {
    title: "Possible Matches",
    body: `Here are ${options.length} match(es). Choose one to contact on WhatsApp.`,
    buttonText: "View",
    sectionTitle: "Matches",
    rows: options.map((option, index) => ({
      id: `mtch_${index}_${tripId}`,
      title: safeRowTitle(option.title),
      description: safeRowDesc(option.description),
    })),
  });

  const nextState: ScheduleState = { role, vehicle_type, trip_id: tripId, results: options };
  await setState(ctx.userId, "await_match_select", nextState);
  ctx.state = { key: "await_match_select", data: nextState };
}

export async function handleSkipDrop(ctx: ConversationContext, tripId: string) {
  const current = (ctx.state.data as ScheduleState | undefined) ?? {};
  if (!current.trip_id || current.trip_id !== tripId || !current.role) {
    await replyText(ctx, "Trip session expired. Start again.");
    await startSchedule(ctx);
    return;
  }

  await matchTrips(ctx, tripId, current.role, current.vehicle_type);
}

export async function handleDropLocation(ctx: ConversationContext, lat: number, lon: number) {
  const current = (ctx.state.data as ScheduleState | undefined) ?? {};
  if (!current.trip_id || !current.role) {
    await replyText(ctx, "Trip session expired. Start again.");
    await startSchedule(ctx);
    return;
  }

  await updateTripDropoff(current.trip_id, lon, lat);
  await matchTrips(ctx, current.trip_id, current.role, current.vehicle_type);
}

export async function handleMatchSelection(ctx: ConversationContext, id: string) {
  const parts = id.split("_");
  const index = Number.parseInt(parts[1] ?? "", 10);
  const tripId = parts[2] ?? "";
  const current = (ctx.state.data as ScheduleState | undefined) ?? {};
  if (!current.trip_id || current.trip_id !== tripId) {
    await replyText(ctx, "Match expired. Start again.");
    await startSchedule(ctx);
    return;
  }

  const option = current.results?.[index];
  if (!option) {
    await replyText(ctx, "Match unavailable. Try another option.");
    return;
  }

  const digits = option.wa.replace(/\D/g, "");
  if (!digits) {
    await replyText(ctx, "Contact unavailable at the moment.");
    return;
  }

  await replyText(ctx, `Open chat: https://wa.me/${digits}`);
  await setState(ctx.userId, "home", {});
  ctx.state = { key: "home", data: {} };
}
