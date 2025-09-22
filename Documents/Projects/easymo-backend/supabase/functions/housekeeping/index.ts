// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
 * housekeeping
 *
 * Marks stale drivers offline, expires past-due subscriptions,
 * and expires old open trips. Intended for cron.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (_req: Request) => {
  try {
    const now = new Date();
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // 1) mark drivers offline if last_seen > 30m ago
    const { error: driverErr } = await supabase
      .from("driver_status")
      .update({ online: false })
      .lt("last_seen", thirtyMinsAgo)
      .eq("online", true);

    // 2) expire active subscriptions whose expiry passed
    const { error: subErr } = await supabase
      .from("subscriptions")
      .update({ status: "expired" })
      .lt("expires_at", now.toISOString())
      .eq("status", "active");

    // 3) expire trips older than 24h that are still open
    const { error: tripErr } = await supabase
      .from("trips")
      .update({ status: "expired" })
      .lt("created_at", dayAgo)
      .eq("status", "open");

    const errs = [driverErr?.message, subErr?.message, tripErr?.message].filter(Boolean);
    if (errs.length) {
      return new Response(JSON.stringify({ ok: false, error: errs.join("; ") }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("housekeeping error:", e);
    return new Response(JSON.stringify({ ok: false, error: "internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

