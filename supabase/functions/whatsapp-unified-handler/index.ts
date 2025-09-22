import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

/* ——— env ——— */
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERIFY_TOKEN  = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "easyMoVerifyToken123";

/* ——— init client ——— */

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
  | "data-aware-agent"    // Primary data-aware agent
  | "driver-trip-create"
  | "passenger-intent-create"
  | "business-order-create"
  | "farmer-produce-create"
  | "realestate-listing-create"
  | "vehicle-listing-create"
  | "support-ticket"
  | "mcp-orchestrator"; // fallback

/** Light intent classifier (keywords + memory sniff). */
function resolveDownstream(text: string, phone: string, memory?: Record<string, any>): Downstream {
  const t = text.toLowerCase();

  // Route most traffic to data-aware agent for proper validation
  // Only route to specialized functions for specific patterns that don't need data validation
  
  // Complex transport requests that need location validation
  if (t.includes("nearby drivers") || t.includes("drivers near") || t.includes("find drivers") ||
      t.includes("nearby passengers") || t.includes("passengers near") || 
      t.includes("ride") || t.includes("trip") || t.includes("moto") && !t.includes("for sale") ||
      t.includes("go online") || t.includes("driver on")) {
    return "data-aware-agent";
  }

  // Business and marketplace queries that need data validation
  if (t.includes("pharmacy") || t.includes("shop") || t.includes("business") || 
      t.includes("find") || t.includes("buy") || t.includes("sell") || 
      t.includes("product") || t.includes("market")) {
    return "data-aware-agent";
  }

  // Payment requests (amounts or payment keywords)
  if (/^\d+$/.test(t) || t.includes("pay") || t.includes("money") || t.includes("qr")) {
    return "data-aware-agent";
  }

  // Direct creation patterns for specialized functions (when user is already in flow)
  if (/^(trip|ride|go|pickup|drop|driver|moto)/.test(t) && memory?.current_flow === 'driver_creation') {
    return "driver-trip-create";
  }

  if (/^(need|looking for|ride to|passenger|ndashaka)/.test(t) && memory?.current_flow === 'passenger_creation') {
    return "passenger-intent-create";
  }

  if (t.includes("order") && (t.includes("bar") || t.includes("pharmacy") || t.includes("shop")) && memory?.current_flow === 'business_order') {
    return "business-order-create";
  }

  if ((t.includes("maize") || t.includes("beans") || t.includes("kg") || t.includes("produce")) && memory?.current_flow === 'farmer_listing') {
    return "farmer-produce-create";
  }

  if ((t.includes("house") || t.includes("plot") || t.includes("rent") || t.includes("buy land")) && memory?.current_flow === 'property_listing') {
    return "realestate-listing-create";
  }

  if ((t.includes("car") || t.includes("vehicle") || t.includes("moto for sale") || t.includes("toyota")) && memory?.current_flow === 'vehicle_listing') {
    return "vehicle-listing-create";
  }

  if (t.includes("help") || t.includes("problem") || t.includes("issue") || t.includes("support")) {
    return "support-ticket";
  }

  // Default to data-aware agent for better user experience
  return "data-aware-agent";
}

/* ——— main ——— */
serve(withErrorHandling(async (req) => {
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

    const from = msg.from;
    const id = msg.id;
    const timestamp = msg.timestamp;
    const contactName = entry.contacts?.[0]?.profile?.name || "Unknown";
    
    // Handle different message types
    let text = "";
    let location = null;
    
    if (msg.type === "text") {
      text = msg.text.body;
    } else if (msg.type === "location") {
      location = {
        latitude: msg.location.latitude,
        longitude: msg.location.longitude,
        address: msg.location.address || `${msg.location.latitude}, ${msg.location.longitude}`
      };
      text = "Location shared";
    } else if (msg.type === "image" || msg.type === "document" || msg.type === "audio") {
      // For now, just acknowledge media messages
      text = `${msg.type} received`;
    } else {
      return json({ ignored: true, reason: "unsupported_message_type" });
    }

    // 2.1 Upsert contact and ensure conversation
    console.log(`📞 Upserting contact for wa_id: ${from}`);
    const { data: contact, error: contactError } = await sbAdmin.from('contacts').upsert({
      wa_id: from,
      display_name: contactName,
      language: 'en' // Default language, could be detected from message
    }, { onConflict: 'wa_id', ignoreDuplicates: false }).select().single();

    if (contactError) {
      console.error("Failed to upsert contact:", contactError);
    } else {
      console.log(`✅ Contact upserted successfully for wa_id: ${from}`);
    }

    // 2.2 Ensure conversation exists (24hr window for grouping)
    let conversationId: string;
    const { data: openConv } = await sbAdmin.from('conversations')
      .select('*')
      .eq('contact_wa_id', from)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!openConv || Date.now() - new Date(openConv.last_message_at ?? 0).getTime() > 24*60*60*1000) {
      // Create new conversation
      const { data: newConv } = await sbAdmin.from('conversations')
        .insert({ contact_wa_id: from, started_at: new Date() })
        .select().single();
      conversationId = newConv.id;
    } else {
      conversationId = openConv.id;
    }

    // Update last_message_at for the conversation
    await sbAdmin.from('conversations')
      .update({ last_message_at: new Date() })
      .eq('id', conversationId);

    // 2.3 Log turn memory
    await sbAdmin.from('agent_memory').insert({
      contact_wa_id: from,
      memory_type: 'turn',
      content: `user: ${text}`
    });

    // 2.2 quick async log (fire‑and‑forget)
    sbAdmin.from("whatsapp_logs").insert({
      phone_number: from,
      contact_name: contactName,
      message_id: id,
      message_content: text,
      message_type: msg.type,
      received_at: new Date().toISOString(),
      timestamp: new Date(+timestamp * 1000).toISOString(),
      processed: false,
    }).then().catch(console.error);

    // 2.4 fetch memory (for routing hints)
    const { data: mem } = await sbAdmin
      .from("agent_memory")
      .select("memory_type, content")
      .eq("contact_wa_id", from);

    const memoryObj = Object.fromEntries((mem || []).map((m) => [m.memory_type, m.content]));

    // 2.4 decide downstream
    const fn = resolveDownstream(text, from, memoryObj);

    // 2.5 invoke downstream Edge Function (async but we await for status)
    const start = Date.now();
    const { error, data } = await sbAdmin.functions.invoke(fn, {
      body: {
        from,
        text,
        message,
        phone: from,
        message_id: id,
        contact_name: contactName,
        timestamp: new Date(+timestamp * 1000).toISOString(),
        location,
        conversation_id: conversationId
      },
    });

    // 2.6 Log tool call if it was successful
    if (!error && data) {
      await sbAdmin.from('agent_tool_calls').insert({
        conversation_id: conversationId,
        skill_name: fn,
        input_params: { text, from },
        output_payload: data,
        latency_ms: Date.now() - start
      });
    }

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
