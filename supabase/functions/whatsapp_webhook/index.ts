// supabase/functions/whatsapp_webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERIFY_TOKEN = Deno.env.get("META_WABA_VERIFY_TOKEN")!;

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
        const from = m.from;                  // user number
        const type = m.type;                  // text, image, etc.
        const text = m.text?.body || "";
        // TODO: push into Supabase table or queue (we'll do in Step 2)
      }
    }

    return new Response("OK", { status: 200 });
  }

  return new Response("Not found", { status: 404 });
});