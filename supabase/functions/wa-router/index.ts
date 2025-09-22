import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifySignature } from "@easymo/wa-utils";
import { askAgent } from "@easymo/openai-sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getEnv(key: string): string {
  if (typeof Deno !== "undefined") return Deno.env.get(key)!;
  return process.env[key]!;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === getEnv("WHATSAPP_TOKEN")) {
      return new Response(challenge || "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  const raw = await req.text();
  if (!await verifySignature(req.headers.get("x-hub-signature-256") || "", raw, getEnv("WHATSAPP_TOKEN"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const entry = payload.entry?.[0]?.changes?.[0]?.value;
  const msg = entry.messages?.[0];
  const waId = entry.contacts?.[0]?.wa_id;
  const text = msg?.text?.body || "";
  await supabase.from("incoming_messages").insert({
    phone_number: waId,
    message_id: msg.id,
    message_text: text,
    status: "new",
    processed: false,
    metadata: payload,
  });
  await supabase.rpc("ensure_user_exists", { phone_number: waId });
  const decision = await askAgent({ phone: waId, text });
  const phoneId = getEnv("WHATSAPP_PHONE_ID");
  const token = getEnv("WHATSAPP_TOKEN");
  let respPayload: any = {};
  if (decision.type === "TEMPLATE") {
    respPayload = { messaging_product: "whatsapp", to: waId, type: "template", template: { name: decision.id, language: { code: "en" } } };
  } else if (decision.type === "TEXT") {
    respPayload = { messaging_product: "whatsapp", to: waId, type: "text", text: { body: decision.text } };
  }
  await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(respPayload),
  });
  await supabase.from("whatsapp_messages").insert({ wa_id: waId, direction: "out", payload: respPayload });
  return new Response("OK", { status: 200, headers: corsHeaders });
}

serve(handler);
