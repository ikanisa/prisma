import { supabaseClient } from "./client.ts";
// response-sender – send outbound msg + log conversation
import { serve } from "https://deno.land/std@0.195.0/http/server.ts";
import { sendWaMessage, sendTelegramMessage, sendSMSMessage } from "./utils.ts";

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const start = Date.now();

  try {
    const { channel, recipient, message, meta } = await req.json();

    // 1. send
    if (channel === 'whatsapp') await sendWaMessage(recipient, message);
    else if (channel === 'telegram') await sendTelegramMessage(recipient, message);
    else if (channel === 'sms') await sendSMSMessage(recipient, message);
    else throw new Error('unknown channel');

    // 2. minimal conversation logging (simpler than your previous long version)
    await sb.from('conversation_messages').insert({
      phone_number: recipient, channel, sender: 'agent',
      message_text: message, model_used: meta?.model, confidence_score: meta?.confidence ?? null,
      created_at: new Date().toISOString()
    });

    return json({ ok: true, ms: Date.now() - start });

  } catch (err) {
    console.error(err);
    return json({ ok: false, error: err.message }, 500);
  }
});

function json(d: any, code = 200) {
  return new Response(JSON.stringify(d), {
    status: code,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}