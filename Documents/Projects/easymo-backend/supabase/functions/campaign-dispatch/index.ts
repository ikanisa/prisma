// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/** ========= ENV (reuse existing secrets) ========= */
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WA_TOKEN      = Deno.env.get("WA_TOKEN")!;
const WA_PHONE_ID   = Deno.env.get("WA_PHONE_ID")!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);
const WA_BASE = `https://graph.facebook.com/v20.0/${WA_PHONE_ID}`;

/** ========= WhatsApp send helpers ========= */
async function waSendMessages(body: any) {
  const res = await fetch(`${WA_BASE}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

  if (!res.ok) {
    const err = new Error(`WA send failed: ${res.status} ${res.statusText}`);
    (err as any).response = json;
    throw err;
  }
  return json;
}

type QPayload =
  | { kind: "TEXT"; text: string }
  | { kind: "TEMPLATE"; name: string; language_code: string; components: any[] }
  | { kind: "INTERACTIVE"; interactive: any };

function buildWARequest(to: string, p: QPayload) {
  if (p.kind === "TEXT") {
    return {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: p.text },
    };
  }
  if (p.kind === "TEMPLATE") {
    return {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: p.name,
        language: { code: p.language_code },
        components: p.components || [],
      },
    };
  }
  if (p.kind === "INTERACTIVE") {
    return {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: p.interactive,
    };
  }
  throw new Error("Unsupported payload.kind");
}

/** ========= Backoff helper =========
 * attempt starts at 0. Backoff seconds: 15, 30, 60, 120, 300 (cap)
 */
function backoffSeconds(attempt: number) {
  const seq = [15, 30, 60, 120, 300];
  return seq[Math.min(attempt, seq.length - 1)];
}

/** ========= Process a batch ========= */
async function processBatch(limit = 40) {
  // 1) pick jobs
  const { data: jobs, error: pickErr } = await sb
    .from("send_queue")
    .select("id,campaign_id,msisdn_e164,payload,attempt")
    .eq("status", "PENDING")
    .lte("next_attempt_at", new Date().toISOString())
    .order("id", { ascending: true })
    .limit(limit);

  if (pickErr) throw pickErr;

  let sent = 0, failed = 0, skipped = 0;

  for (const job of jobs || []) {
    const to: string = job.msisdn_e164;
    const attempt: number = job.attempt ?? 0;

    // Normalize payload (DB returns object already, but be safe)
    const payload: QPayload = typeof job.payload === "string"
      ? JSON.parse(job.payload)
      : job.payload;

    try {
      const reqBody = buildWARequest(to, payload);
      const res = await waSendMessages(reqBody);
      const providerId =
        res?.messages?.[0]?.id ??
        res?.message_id ??
        res?.id ??
        null;

      // success → mark SENT
      await sb.from("send_queue")
        .update({ status: "SENT", attempt: attempt + 1, next_attempt_at: new Date().toISOString() })
        .eq("id", job.id);

      await sb.from("send_logs").insert({
        queue_id: job.id,
        campaign_id: job.campaign_id,
        msisdn_e164: to,
        provider_msg_id: providerId,
        delivery_status: "SENT",
      });

      sent++;
    } catch (e: any) {
      const nextInSec = backoffSeconds(attempt);
      const next = new Date(Date.now() + nextInSec * 1000).toISOString();
      const maxAttempts = 5;
      const willFail = attempt + 1 >= maxAttempts;

      await sb.from("send_queue")
        .update({
          attempt: attempt + 1,
          next_attempt_at: willFail ? new Date().toISOString() : next,
          status: willFail ? "FAILED" : "PENDING",
        })
        .eq("id", job.id);

      await sb.from("send_logs").insert({
        queue_id: job.id,
        campaign_id: job.campaign_id,
        msisdn_e164: to,
        provider_msg_id: null,
        delivery_status: willFail ? "FAILED" : "PENDING",
        error: (e?.response ? JSON.stringify(e.response).slice(0, 800) : String(e)).slice(0, 800),
      });

      if (willFail) failed++; else skipped++;
    }
  }

  return { picked: jobs?.length || 0, sent, failed, retry_scheduled: skipped };
}

/** ========= HTTP handler (cron or manual) ========= */
serve(async (_req) => {
  try {
    const result = await processBatch(40);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
