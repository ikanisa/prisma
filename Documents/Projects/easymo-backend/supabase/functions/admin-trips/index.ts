// deno-lint-ignore-file no-explicit-any
// admin-trips — list & close trips for the admin UI (with CORS)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

// ENV
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!; // keep this name for consistency
const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN")!;

// Supabase (service role)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// CORS helpers
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Content-Type": "application/json",
};
const withCORS = (init: ResponseInit = {}) => ({
  ...init,
  headers: { ...(init.headers ?? {}), ...CORS_HEADERS },
});

// Auth helper
function isAuthed(req: Request) {
  return req.headers.get("x-admin-token") === ADMIN_TOKEN;
}

// Handler
async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, withCORS({ status: 204 }));
  }

  if (!isAuthed(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), withCORS({ status: 401 }));
  }

  const url = new URL(req.url);
  const action = (url.searchParams.get("action") ?? "list").toLowerCase();

  if (req.method === "GET") {
    if (action !== "list") {
      return new Response(JSON.stringify({ error: "invalid action" }), withCORS({ status: 400 }));
    }

    const { data, error } = await supabase
      .from("trips")
      .select("id, creator_user_id, role, vehicle_type, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), withCORS({ status: 500 }));
    }

    return new Response(JSON.stringify({ trips: data }), withCORS({ status: 200 }));
  }

  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid JSON body" }), withCORS({ status: 400 }));
    }

    if (action === "close") {
      const id = body?.id;
      if (typeof id !== "number") {
        return new Response(JSON.stringify({ error: "id must be a number" }), withCORS({ status: 400 }));
      }

      const { error } = await supabase.from("trips").update({ status: "closed" }).eq("id", id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), withCORS({ status: 500 }));
      }

      return new Response(JSON.stringify({ success: true }), withCORS({ status: 200 }));
    }

    return new Response(JSON.stringify({ error: "invalid action" }), withCORS({ status: 400 }));
  }

  return new Response(JSON.stringify({ error: "method not allowed" }), withCORS({ status: 405 }));
}

// Serve
serve(async (req) => {
  try {
    return await handler(req);
  } catch (e) {
    console.error("admin-trips error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), withCORS({ status: 500 }));
  }
});

