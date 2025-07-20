
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ——— env ——— */
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERIFY_TOKEN  = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "easyMoVerifyToken123";

/* ——— init client ——— */
const sbAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

/* ——— helpers ——— */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/* ——— basic router map ——— */
type Downstream =
  | "driver-trip-create"
  | "passenger-intent-create"
  | "business-order-create"
  | "farmer-produce-create"
  | "realestate-listing-create"
  | "vehicle-listing-create"
  | "support-ticket"
  | "mcp-orchestrator"; // generic fallback

/** Light intent classifier (keywords + memory sniff). */
function resolveDownstream(text: string, phone: string, memory?: Record<string, any>): Downstream {
  const t = text.toLowerCase();

  if (/^(trip|ride|go|pickup|drop|driver|moto)/.test(t) || t.includes("tugende") || t.includes("gutwara"))
    return "driver-trip-create";

  if (/^(need|find|looking for|ride to|passenger|ndashaka)/.test(t) || t.includes("nkeneye"))
    return "passenger-intent-create";

  if (t.includes("order") && (t.includes("bar") || t.includes("pharmacy") || t.includes("shop")))
    return "business-order-create";

  if (t.includes("maize") || t.includes("beans") || t.includes("kg") || t.includes("produce"))
    return "farmer-produce-create";

  if (t.includes("house") || t.includes("plot") || t.includes("rent") || t.includes("buy land"))
    return "realestate-listing-create";

  if (t.includes("car") || t.includes("vehicle") || t.includes("moto for sale") || t.includes("toyota"))
    return "vehicle-listing-create";

  if (t.includes("help") || t.includes("problem") || t.includes("issue"))
    return "support-ticket";

  // memory‑based override: if we already know user_type
  const userType = memory?.user_type;
  if (userType === "driver") return "driver-trip-create";
  if (userType === "passenger") return "passenger-intent-create";
  if (userType === "farmer") return "farmer-produce-create";

  return "mcp-orchestrator";
}

/* ——— main ——— */
serve(async (req) => {
  /* 0. CORS pre‑flight */
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  /* 1. GET Verify handshake */
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) return new Response(challenge || "ok");
    return new Response("Forbidden", { status: 403 });
  }

  /* 2. POST — real events */
  try {
    const body = await req.json();
    const entry = body?.entry?.[0]?.changes?.[0]?.value;

    // (a) statuses (delivery / read receipts) — just log & exit
    if (entry?.statuses) {
      const statuses = entry.statuses;
      await sbAdmin.from("whatsapp_logs").insert(
        statuses.map((s: any) => ({
          message_id: s.id,
          phone_number: s.recipient_id,
          message_type: "status",
          message_content: s.status,
          timestamp: new Date(+s.timestamp * 1000).toISOString(),
          received_at: new Date().toISOString(),
        })),
      );
      return json({ ok: true });
    }

    // (b) inbound messages
    const msg = entry?.messages?.[0];
    if (!msg) return json({ ignored: true });

    // Only handle text messages for now
    if (msg.type !== "text") {
      return json({ ignored: true, reason: "non_text_message" });
    }

    const from = msg.from;
    const id = msg.id;
    const timestamp = msg.timestamp;
    const text = msg.text.body;
    const contactName = entry.contacts?.[0]?.profile?.name || "Unknown";

    // 2.1 quick async log (fire‑and‑forget)
    sbAdmin.from("whatsapp_logs").insert({
      phone_number: from,
      contact_name: contactName,
      message_id: id,
      message_content: text,
      message_type: "text",
      received_at: new Date().toISOString(),
      timestamp: new Date(+timestamp * 1000).toISOString(),
      processed: false,
    }).then().catch(console.error);

    // 2.2 fetch memory (for routing hints)
    const { data: mem } = await sbAdmin
      .from("agent_memory")
      .select("memory_type, memory_value")
      .eq("user_id", from);

    const memoryObj = Object.fromEntries((mem || []).map((m) => [m.memory_type, m.memory_value]));

    // 2.3 decide downstream
    const fn = resolveDownstream(text, from, memoryObj);

    // 2.4 invoke downstream Edge Function (async but we await for status)
    const { error, data } = await sbAdmin.functions.invoke(fn, {
      body: {
        from,
        text,
        message_id: id,
        contact_name: contactName,
        timestamp: new Date(+timestamp * 1000).toISOString(),
      },
    });

    if (error) {
      console.error(`${fn} failed:`, error);
      // Don't throw, just log and continue
    }

    // mark log processed
    sbAdmin.from("whatsapp_logs")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("message_id", id)
      .then().catch(console.error);

    return json({ ok: true, routed_to: fn, downstream_response: data });

  } catch (err) {
    console.error("[unified-handler]", err);
    return json({ error: err.message }, 500);
  }
});
