// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN   = Deno.env.get("ADMIN_TOKEN")!;
const WA_TOKEN      = Deno.env.get("WA_TOKEN")!;
const WA_PHONE_ID   = Deno.env.get("WA_PHONE_ID")!;
const WA_BASE = `https://graph.facebook.com/v20.0/${WA_PHONE_ID}`;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

function toWaId(e164: string){ return e164.startsWith("+") ? e164.slice(1) : e164; }

async function sendWA(toE164: string, text: string) {
  const res = await fetch(`${WA_BASE}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: toWaId(toE164), type: "text", text: { body: text }})
  });
  if (!res.ok) console.error("WA", await res.text());
}

function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2,"0")).join("");
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (req.headers.get("x-admin-token") !== ADMIN_TOKEN) return new Response("Forbidden", { status: 403 });

  const body = await req.json();
  const whatsapp = body.whatsapp as string;
  const user_code = body.user_code as string;
  const amount = Number(body.amount || 0);
  const allow_any_shop = body.allow_any_shop !== false;
  const allowed_shop_ids: string[] = Array.isArray(body.allowed_shop_ids) ? body.allowed_shop_ids : [];

  if (!whatsapp || !user_code || amount <= 0) {
    return new Response(JSON.stringify({ error: "whatsapp, user_code, amount required" }), { status: 400 });
  }

  // upsert wallet
  const { data: w0 } = await sb.from("wallets").select("*").eq("user_code", user_code).maybeSingle();
  let wallet = w0;
  if (!wallet) {
    const ins = await sb.from("wallets").insert({ user_code, whatsapp, allow_any_shop }).select("*").single();
    if (ins.error) return new Response(ins.error.message, { status: 500 });
    wallet = ins.data;
  } else {
    await sb.from("wallets").update({ whatsapp, allow_any_shop }).eq("id", wallet.id);
  }

  if (!allow_any_shop) {
    await sb.from("wallet_allowed_shops").delete().eq("wallet_id", wallet.id);
    for (const sid of allowed_shop_ids) {
      await sb.from("wallet_allowed_shops").insert({ wallet_id: wallet.id, shop_id: sid });
    }
  }

  // ensure accounts
  async function ensureAccount(kind: "wallet"|"issuer", wallet_id?: string) {
    const q = await sb.from("ledger_accounts").select("id").eq("kind",kind).eq("wallet_id", wallet_id ?? null).maybeSingle();
    if (q.data) return q.data.id as string;
    const ins = await sb.from("ledger_accounts").insert({ kind, wallet_id: wallet_id ?? null }).select("id").single();
    if (ins.error) throw ins.error;
    const acc = ins.data.id as string;
    await sb.from("account_balances").insert({ account_id: acc, balance: 0 }).onConflict("account_id").ignore();
    return acc;
  }

  const cfg = await sb.from("app_config").select("token_issuer_account").eq("id", true).single();
  let issuerAcc = cfg.data?.token_issuer_account as string | null;
  if (!issuerAcc) {
    issuerAcc = await ensureAccount("issuer");
    await sb.from("app_config").update({ token_issuer_account: issuerAcc }).eq("id", true);
  }
  const walletAcc = await ensureAccount("wallet", wallet.id);

  // issue transaction (double-entry)
  const tx = await sb.from("transactions").insert({ type:"issue", amount, wallet_id: wallet.id }).select("*").single();
  if (tx.error) return new Response(tx.error.message, { status: 500 });

  await sb.from("ledger_entries").insert([
    { tx_id: tx.data.id, account_id: issuerAcc, amount, is_debit: true },
    { tx_id: tx.data.id, account_id: walletAcc, amount, is_debit: false },
  ]);

  // wallet QR
  let { data: qr } = await sb.from("wallet_qr").select("*").eq("wallet_id", wallet.id).maybeSingle();
  if (!qr) {
    qr = (await sb.from("wallet_qr").insert({ wallet_id: wallet.id, qr_secret: randomSecret() })
      .select("*").single()).data;
  }

  // notify user
  await sendWA(whatsapp, `You received ${amount} RWF tokens.\nShow your EasyMo QR to participating shops.`);

  return new Response(JSON.stringify({ ok:true, wallet_id: wallet.id, qr_secret: qr.qr_secret }), {
    status: 200, headers: { "Content-Type": "application/json" }
  });
});
