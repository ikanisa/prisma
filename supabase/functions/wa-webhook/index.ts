// wa-webhook – WhatsApp Inbound Webhook (TypeScript/deno)

import { serve } from "https://deno.land/std@0.195.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
const SUPA_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VERIFY_TOKEN = Deno.env.get('WA_VERIFY_TOKEN') ?? 'easyMoVerifyToken123';

const sb = createClient(SUPA_URL, SUPA_KEY);

// ────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  // ── 1. Webhook verification ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url);
    if (url.searchParams.get('hub.mode') === 'subscribe' &&
        url.searchParams.get('hub.verify_token') === VERIFY_TOKEN) {
      return new Response(url.searchParams.get('hub.challenge') ?? '', { headers: cors });
    }
    return new Response('Verification failed', { status: 403, headers: cors });
  }

  // ── 2. Parse payload ─────────────────────────────────────────────────────
  const payload = await req.json();
  console.log('📩 WA update:', JSON.stringify(payload, null, 2));

  // Health checks from Meta
  if (payload?.test || payload?.health_check) {
    return json({ ok: true, msg: 'webhook alive' });
  }

  const change = payload.entry?.[0]?.changes?.[0]?.value;
  const waMsg = change?.messages?.[0];
  const contact = change?.contacts?.[0];

  // no message? ignore delivery/status webhooks here
  if (!waMsg) return json({ success: true });

  // ── 3. Transform message --------------------------------------------------
  const msg = normaliseWaMessage(waMsg);
  const senderPhone = msg.from;
  const contactName = contact?.profile?.name ?? 'Unknown';

  // Basic rate‑limit: ≤ 15 messages/min
  if (await isRateLimited(senderPhone)) {
    console.log('⏳ Rate‑limited:', senderPhone);
    return json({ throttled: true });
  }

  // ── 4. Persist raw log ----------------------------------------------------
  await sb.from('whatsapp_logs').insert({
    message_id: msg.id,
    phone_number: senderPhone,
    contact_name: contactName,
    message_type: msg.type,
    message_content: msg.content,
    timestamp: new Date(Number(msg.timestamp) * 1000).toISOString(),
    received_at: new Date().toISOString(),
    processed: false
  });

  // ── 5. Send to unified message handler ------------------------------------
  const { error } = await sb.functions.invoke('unified-message-handler', {
    body: {
      platform: 'whatsapp',
      payload: {
        entry: [{
          changes: [{
            value: {
              messages: [waMsg],
              contacts: [{
                profile: { name: contactName }
              }]
            }
          }]
        }]
      }
    }
  });

  if (error) {
    console.error('❌ Unified handler error', error);
    await sendWaMessage(senderPhone,
      "Oops 🤖. Something went wrong, please try again in a moment.");
    return json({ success: false });
  }

  // Mark processed
  await sb.from('whatsapp_logs')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('message_id', msg.id);

  return json({ success: true });
});

// ========== helpers =========================================================
function json(obj: any, code = 200) {
  return new Response(JSON.stringify(obj), {
    status: code,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

interface NormMsg {
  id: string; from: string; timestamp: string;
  type: string; content: string; mediaId?: string;
}

function normaliseWaMessage(m: any): NormMsg {
  switch (m.type) {
    case 'text': return {
      id: m.id, from: m.from, timestamp: m.timestamp,
      type: 'text', content: m.text.body
    };
    case 'image': return {
      id: m.id, from: m.from, timestamp: m.timestamp,
      type: 'image', content: m.image?.caption ?? '[Image]',
      mediaId: m.image?.id
    };
    default: return {
      id: m.id, from: m.from, timestamp: m.timestamp,
      type: m.type, content: `[${m.type}]`
    };
  }
}

async function isRateLimited(phone: string) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await sb
    .from('whatsapp_logs')
    .select('*', { head: true, count: 'exact' })
    .eq('phone_number', phone)
    .gte('received_at', since);
  return (count ?? 0) > 15;
}

// Re‑usable outbound helper (export for response‑sender if needed)
export async function sendWaMessage(to: string, text: string) {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID');
  if (!token || !phoneId) throw new Error('WA creds missing');

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } })
  });
  if (!res.ok) console.error('WA send fail', await res.text());
}