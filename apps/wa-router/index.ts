/**
 * wa-router: Entry point for WhatsApp webhook routing
 */
import { serve } from "std/server.ts";
import { verifySignature } from "@easymo/wa-utils";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const signature = req.headers.get("x-hub-signature-256") || "";
  const text = await req.text();
  if (!await verifySignature(signature, text, Deno.env.get("WHATSAPP_TOKEN")!)) {
    return new Response("Invalid signature", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const resp = await fetch(
    `${SUPABASE_URL}/functions/v1/whatsapp-webhook-secure`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(payload),
    },
  );
  const body = await resp.text();
  return new Response(body, { status: resp.status, headers: resp.headers });
});
