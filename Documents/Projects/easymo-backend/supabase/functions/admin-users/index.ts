// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
 * admin-users
 *
 * GET only. Returns up to 500 latest users for the admin UI.
 * Protected by `x-admin-token` which must match `ADMIN_TOKEN` secret.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// CORS helpers
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Content-Type": "application/json",
} as const;

function withCORS(init: ResponseInit = {}): ResponseInit {
  return { ...init, headers: { ...(init.headers || {}), ...CORS_HEADERS } };
}

function isAuthed(req: Request): boolean {
  return req.headers.get("x-admin-token") === ADMIN_TOKEN;
}

serve(async (req: Request): Promise<Response> => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", withCORS({ status: 204 }));
  }

  if (!isAuthed(req)) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      withCORS({ status: 401 }),
    );
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "method not allowed" }),
      withCORS({ status: 405 }),
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, whatsapp_e164, ref_code, credits_balance, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      withCORS({ status: 500 }),
    );
  }

  return new Response(JSON.stringify({ users: data ?? [] }), withCORS({ status: 200 }));
});

