// wa-webhook – WhatsApp Inbound Webhook (TypeScript/deno)

import { serve } from "https://deno.land/std@0.195.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";
import { sanitizeUserInput, validatePhoneNumber, normalizePhoneNumber, validateMessagePayload, RateLimiter, logSecurityEvent } from "../_shared/security.ts";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CRITICAL SECURITY FIX: Validate required environment variables
const SUPA_URL = Deno.env.get('SUPABASE_URL');
const SUPA_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const VERIFY_TOKEN = Deno.env.get('WA_VERIFY_TOKEN');
const WHATSAPP_APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET');

// Validate all required environment variables
if (!SUPA_URL || !SUPA_KEY || !VERIFY_TOKEN || !WHATSAPP_APP_SECRET) {
  throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WA_VERIFY_TOKEN, WHATSAPP_APP_SECRET');
}

const sb = createClient(SUPA_URL, SUPA_KEY);

// SECURITY: Initialize rate limiter (15 requests per minute per phone)
const rateLimiter = new RateLimiter(15, 60000);

// CRITICAL SECURITY FIX: Add webhook signature verification
async function verifyWebhookSignature(body: string, signature: string | null): Promise<boolean> {
  if (!signature || !WHATSAPP_APP_SECRET) {
    console.error('Missing signature or app secret');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(WHATSAPP_APP_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const hmac = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = 'sha256=' + Array.from(new Uint8Array(hmac))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

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

  // ── 2. CRITICAL SECURITY: Verify webhook signature ──────────────────────
  const signature = req.headers.get('x-hub-signature-256');
  const body = await req.text();
  
  if (!await verifyWebhookSignature(body, signature)) {
    logSecurityEvent({
      type: 'webhook_signature_failure',
      source: req.headers.get('x-forwarded-for') || 'unknown',
      details: { signature, bodyLength: body.length }
    });
    return new Response('Forbidden', { status: 403, headers: cors });
  }

  // ── 3. Parse and validate payload ───────────────────────────────────────
  let payload;
  try {
    payload = JSON.parse(body);
  } catch (error) {
    logSecurityEvent({
      type: 'invalid_payload',
      source: req.headers.get('x-forwarded-for') || 'unknown',
      details: { error: error.message, bodyLength: body.length }
    });
    return new Response('Bad Request', { status: 400, headers: cors });
  }

  // Validate payload structure
  const validation = validateMessagePayload(payload);
  if (!validation.isValid) {
    logSecurityEvent({
      type: 'invalid_payload',
      source: req.headers.get('x-forwarded-for') || 'unknown',
      details: { error: validation.error, payload }
    });
    return new Response('Bad Request', { status: 400, headers: cors });
  }
  console.log('📩 WA update (verified):', JSON.stringify(payload, null, 2));

  // Health checks from Meta
  if (payload?.test || payload?.health_check) {
    return json({ ok: true, msg: 'webhook alive - signature verified' });
  }

  const change = payload.entry?.[0]?.changes?.[0]?.value;
  const waMsg = change?.messages?.[0];
  const contact = change?.contacts?.[0];

  // no message? ignore delivery/status webhooks here
  if (!waMsg) return json({ success: true });

  // ── 4. Transform and validate message ────────────────────────────────────
  const msg = normaliseWaMessage(waMsg);
  const senderPhone = normalizePhoneNumber(msg.from);
  const contactName = sanitizeUserInput(contact?.profile?.name ?? 'Unknown');

  // Validate phone number
  if (!validatePhoneNumber(senderPhone)) {
    logSecurityEvent({
      type: 'invalid_payload',
      source: senderPhone,
      details: { error: 'Invalid phone number format', originalPhone: msg.from }
    });
    return json({ error: 'Invalid phone number' }, 400);
  }

  // Enhanced rate limiting with security logging
  if (rateLimiter.isRateLimited(senderPhone)) {
    logSecurityEvent({
      type: 'rate_limit_exceeded',
      source: senderPhone,
      details: { contactName }
    });
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
      id: m.id, 
      from: m.from, 
      timestamp: m.timestamp,
      type: 'text', 
      content: sanitizeUserInput(m.text?.body || '')
    };
    case 'image': return {
      id: m.id, 
      from: m.from, 
      timestamp: m.timestamp,
      type: 'image', 
      content: sanitizeUserInput(m.image?.caption || '[Image]'),
      mediaId: m.image?.id
    };
    default: return {
      id: m.id, 
      from: m.from, 
      timestamp: m.timestamp,
      type: m.type, 
      content: `[${m.type}]`
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