// supabase/functions/whatsapp_webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERIFY_TOKEN = Deno.env.get("META_WABA_VERIFY_TOKEN")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  const url = new URL(req.url);

  // 1) META verification GET
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  // 2) Incoming messages POST
  if (req.method === "POST") {
    const body = await req.json();
    // (Optional) log to see structure first time
    console.log(JSON.stringify(body, null, 2));

    // Basic extract
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages;
    if (messages && messages.length > 0) {
      for (const m of messages) {
        const from = m.from;
        const to = changes.value?.metadata?.display_phone_number;
        const waId = m.id;
        const type = m.type;
        const bodyText = m.text?.body || "";

        await supabase.from("whatsapp_messages").insert({
          wa_message_id: waId,
          from_number: from,
          to_number: to,
          direction: 'in',
          msg_type: type,
          body: bodyText,
          raw_json: m
        });

        // Upsert conversation
        await supabase.from("whatsapp_conversations")
          .upsert({
            user_number: from,
            last_message_at: new Date().toISOString()
          }, { onConflict: 'user_number' });
      }
    }

    return new Response("OK", { status: 200 });
  }

  return new Response("Not found", { status: 404 });
});