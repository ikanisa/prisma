import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
 * admin-stats
 * Returns aggregated counts for the admin dashboard.
 * Protected by `x-admin-token` that must match the `ADMIN_TOKEN` secret.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Content-Type": "application/json",
};

function checkAuth(req: Request): boolean {
  return req.headers.get("x-admin-token") === ADMIN_TOKEN;
}

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (!checkAuth(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  const nowIso = new Date().toISOString();

  const driversPromise = supabase
    .from("driver_status")
    .select("count", { count: "exact" })
    .eq("online", true);

  const tripsPromise = supabase
    .from("trips")
    .select("count", { count: "exact" })
    .eq("status", "open");

  const subsPromise = supabase
    .from("subscriptions")
    .select("count", { count: "exact" })
    .eq("status", "active")
    .gt("expires_at", nowIso);

  const [driversRes, tripsRes, subsRes] = await Promise.all([
    driversPromise,
    tripsPromise,
    subsPromise,
  ]);

  if (driversRes.error || tripsRes.error || subsRes.error) {
    const msg =
      driversRes.error?.message ??
      tripsRes.error?.message ??
      subsRes.error?.message ??
      "unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  const drivers_online = driversRes.count ?? 0;
  const open_trips = tripsRes.count ?? 0;
  const active_subscriptions = subsRes.count ?? 0;

  return new Response(
    JSON.stringify({ drivers_online, open_trips, active_subscriptions }),
    { status: 200, headers: CORS_HEADERS },
  );
});

