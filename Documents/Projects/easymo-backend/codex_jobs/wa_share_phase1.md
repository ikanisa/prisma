# OpenAI Codex CLI Job: wa_share_phase1
# Goal: Add "Share easyMO" deep-link + QR. Do not touch baskets or other flows.

## 0) Preconditions (fail fast)
run: deno --version
run: supabase --version
run: git --version

## 1) Ensure function folder exists
run: test -d supabase/functions/wa-webhook || mkdir -p supabase/functions/wa-webhook

## 2) Write utils/share.ts (build wa.me deep-link + QR)
write_file: supabase/functions/wa-webhook/utils/share.ts
<<'TS'
import { sb } from "../config.ts";

/** Reads bot number from DB config or env and returns digits without '+' */
export async function getBotDigits(): Promise<string> {
  // Prefer DB: app_config.WA_BOT_NUMBER_E164
  try {
    const { data } = await sb.from("app_config")
      .select("wa_bot_number_e164")
      .eq("id", 1)
      .maybeSingle();
    const num = data?.wa_bot_number_e164 as string | undefined;
    if (num && /^\+?\d{6,16}$/.test(num)) return num.replace(/\D/g, "");
  } catch {}
  // Fallback: env WA_BOT_NUMBER_E164 (optional)
  const env = (Deno.env.get("WA_BOT_NUMBER_E164") || "").trim();
  if (env && /^\+?\d{6,16}$/.test(env)) return env.replace(/\D/g, "");
  throw new Error("Bot number not set (app_config.wa_bot_number_e164 or WA_BOT_NUMBER_E164).");
}

/** wa.me deep link that opens our bot chat with prefilled "home" */
export async function buildShareUrl(): Promise<string> {
  const digits = await getBotDigits();
  const text = encodeURIComponent("home");
  return `https://wa.me/${digits}?text=${text}`;
}

/** QR image for the wa.me deep link (quickchart) */
export async function buildShareQrUrl(): Promise<string> {
  const link = await buildShareUrl();
  return `https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=600&margin=1`;
}
TS

## 3) Write flows/home.ts (menu + "Love easyMO??? Share it!" buttons)
write_file: supabase/functions/wa-webhook/flows/home.ts
<<'TS'
import { sendList, sendButtons, sendImageUrl } from "../wa/client.ts";
import { buildShareUrl, buildShareQrUrl } from "../utils/share.ts";

export async function sendHome(to: string) {
  await sendList(to, {
    title: "Open menu",
    body: "Welcome 👋\nChoose an option below.",
    sectionTitle: "Menu",
    rows: [
      { id: "see_drivers", title: "Nearby Drivers" },
      { id: "see_passengers", title: "Nearby Passengers" },
      { id: "schedule_trip", title: "Schedule Trip" },
      { id: "marketplace", title: "Marketplace" },
      { id: "baskets", title: "Baskets" },
      { id: "motor_insurance", title: "Motor Insurance" },
      { id: "momoqr_start", title: "MoMo QR Code" },
    ],
  });

  // Second message: the Share CTA
  await sendButtons(to, "Love easyMO??? Share it!", [
    { id: "share_easymo_link", title: "Share link" },
    { id: "share_easymo_qr", title: "Share QR" },
  ]);
}

export async function handleShareButtons(to: string, buttonId: string) {
  if (buttonId === "share_easymo_link") {
    const link = await buildShareUrl();
    // send as plain text so WhatsApp renders a tappable link
    await sendButtons(to, `Share this link with friends:\n${link}`, [
      { id: "back_home", title: "Back to Menu" },
    ]);
    return true;
  }
  if (buttonId === "share_easymo_qr") {
    const link = await buildShareUrl();
    const qr = await buildShareQrUrl();
    await sendImageUrl(to, qr, "Scan to open easyMO on WhatsApp");
    await sendButtons(to, `Or tap the link:\n${link}`, [
      { id: "back_home", title: "Back to Menu" },
    ]);
    return true;
  }
  return false;
}
TS

## 4) Write wa/client.ts (small WA helpers used above)
write_file: supabase/functions/wa-webhook/wa/client.ts
<<'TS'
import { WA_TOKEN, WA_PHONE_ID } from "../config.ts";

const WA_BASE = `https://graph.facebook.com/v20.0/${WA_PHONE_ID}`;

async function waSend(path: string, payload: unknown) {
  const res = await fetch(`${WA_BASE}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("WA send failed", res.status, t);
    throw new Error(`WA send failed: ${res.status}`);
  }
  return res.json();
}

function safe(t: string, max: number) {
  if (!t) return "";
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
}

export async function sendText(to: string, body: string) {
  return waSend("messages", {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
}

export async function sendButtons(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>
) {
  return waSend("messages", {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: safe(b.title, 20) },
        })),
      },
    },
  });
}

export async function sendList(
  to: string,
  opts: {
    title: string;
    body: string;
    sectionTitle: string;
    rows: Array<{ id: string; title: string; description?: string }>;
    buttonText?: string;
  }
) {
  return waSend("messages", {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: safe(opts.title, 60) },
      body: { text: opts.body.slice(0, 1024) },
      footer: { text: "Tip: Reply 'home' anytime." },
      action: {
        button: safe(opts.buttonText || "Choose", 20),
        sections: [
          {
            title: safe(opts.sectionTitle, 60),
            rows: opts.rows.slice(0, 10).map((r) => ({
              id: r.id,
              title: safe(r.title, 24),
              description: r.description ? safe(r.description, 72) : undefined,
            })),
          },
        ],
      },
    },
  });
}

export async function sendImageUrl(to: string, link: string, caption?: string) {
  return waSend("messages", {
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: { link, caption },
  });
}
TS

## 5) Write router/router.ts (only home + share; leave other flows for later)
write_file: supabase/functions/wa-webhook/router/router.ts
<<'TS'
import { sendButtons } from "../wa/client.ts";
import { sendHome, handleShareButtons } from "../flows/home.ts";
import { WA_VERIFY_TOKEN } from "../config.ts";

function e164(s: string) {
  s = s.trim();
  if (s.startsWith("+")) return s;
  if (s.startsWith("0250")) return "+250" + s.slice(4);
  if (s.startsWith("250")) return "+250" + s.slice(3);
  if (s.startsWith("0") && s[1] === "7") return "+250" + s.slice(1);
  return s.startsWith("+") ? s : "+" + s;
}

export async function handleRequest(req: Request): Promise<Response> {
  // GET verify
  if (req.method === "GET") {
    const u = new URL(req.url);
    if (u.searchParams.get("hub.mode") === "subscribe" &&
        u.searchParams.get("hub.verify_token") === WA_VERIFY_TOKEN) {
      return new Response(u.searchParams.get("hub.challenge") || "", { status: 200 });
    }
    return new Response("OK");
  }

  // POST inbound
  const raw = await req.text();
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response("ok"); }

  const msg = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return new Response("ok");

  const from = e164(msg.from?.startsWith("+") ? msg.from : `+${msg.from}`);
  const text = (msg.text?.body || "").trim();
  const lower = text.toLowerCase();

  // global home/menu keyword
  if (msg.type === "text" && (lower === "home" || lower === "menu" || lower === "hi" || lower === "hello")) {
    await sendHome(from);
    return new Response("ok");
  }

  // "Back to Menu" button
  if (msg.interactive?.type === "button_reply" && msg.interactive.button_reply.id === "back_home") {
    await sendHome(from);
    return new Response("ok");
  }

  // Share buttons
  if (msg.interactive?.type === "button_reply") {
    const bid = msg.interactive.button_reply.id || "";
    const handled = await handleShareButtons(from, bid);
    if (handled) return new Response("ok");
  }

  // default: show menu once
  await sendHome(from);
  return new Response("ok");
}
TS

## 6) Replace index.ts to delegate to router
write_file: supabase/functions/wa-webhook/index.ts
<<'TS'
import { serve } from "./deps.ts";
import { handleRequest } from "./router/router.ts";

serve(handleRequest);
TS

## 7) Format, commit
run: deno fmt supabase/functions/wa-webhook || true
run: git add -A
run: git commit -m "feat(wa-webhook): wire Share easyMO link+QR (no basket changes)"

## 8) Local serve check
run: test -f supabase/.env && echo "✅ supabase/.env exists" || (echo "❌ missing supabase/.env" && exit 1)
run: supabase functions serve wa-webhook --env-file supabase/.env
