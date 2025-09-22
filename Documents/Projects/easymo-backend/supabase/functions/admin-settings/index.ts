import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
 * admin-settings
 *
 * GET  -> returns the single row from `app_config`
 * POST -> updates allowed fields on that same row
 *
 * Protected by x-admin-token which must match ADMIN_TOKEN.
 * Also adds CORS so the web admin UI can call it from the browser.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function checkAuth(req: Request): boolean {
  return req.headers.get("x-admin-token") === ADMIN_TOKEN;
}

serve(async (req: Request) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Enforce admin token
  if (!checkAuth(req)) {
    return json({ error: "unauthorized" }, 401);
  }

  const method = req.method.toUpperCase();

  if (method === "GET") {
    const { data, error } = await supabase.from("app_config").select("*").single();
    if (error) return json({ error: error.message }, 500);
    return json({ config: data });
  }

  if (method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid JSON body" }, 400);
    }

    // allowlist of fields we let admins update
    const allowed = [
      "subscription_price",
      "search_radius_km",
      "max_results",
      "momo_payee_number",
      "support_phone_e164",
      "admin_whatsapp_numbers",
      "pro_enabled", // NEW: toggle Pro tier on/off
    ];
    const patch: Record<string, any> = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        patch[k] = body[k];
      }
    }
    if (Object.keys(patch).length === 0) {
      return json({ error: "no valid fields to update" }, 400);
    }

    // update the single row; your schema uses id=true for that row
    const { error } = await supabase.from("app_config").update(patch).eq("id", true);
    if (error) return json({ error: error.message }, 500);

    return json({ success: true });
  }

  return json({ error: "method not allowed" }, 405);
});
