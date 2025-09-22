// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
 * admin-subscriptions
 *
 * Secured by `x-admin-token` (must match ADMIN_TOKEN secret).
 * Operations:
 *   GET?action=list
 *     → latest 200 subs. If a row has `proof_url`, returns a 7-day signed URL
 *       as `proof_url_signed` (bucket: proofs).
 *   POST?action=approve { id:number, txn_id?:string }
 *     → status=active, sets started_at=now, expires_at=now+30 days, optional txn_id.
 *   POST?action=reject { id:number }
 *     → status=rejected
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!; // use SERVICE_ROLE_KEY (not SUPABASE_SERVICE_KEY)
const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Content-Type": "application/json",
} as const;

function withCORS(init: ResponseInit = {}): ResponseInit {
  return { ...init, headers: { ...(init.headers || {}), ...CORS_HEADERS } };
}

function checkAuth(req: Request): boolean {
  return req.headers.get("x-admin-token") === ADMIN_TOKEN;
}

async function listSubscriptions(): Promise<
  | { subscriptions: any[] }
  | { error: string }
> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id,user_id,status,started_at,expires_at,amount,proof_url,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return { error: error.message };

  const out: any[] = [];
  for (const sub of data ?? []) {
    let proof_url_signed: string | null = null;
    if (sub.proof_url) {
      const { data: signed, error: signErr } = await supabase.storage
        .from("proofs")
        .createSignedUrl(sub.proof_url, 60 * 60 * 24 * 7); // 7 days
      proof_url_signed = signErr ? null : signed.signedUrl;
    }
    out.push({ ...sub, proof_url_signed });
  }
  return { subscriptions: out };
}

async function approveSubscription(
  id: number,
  txn_id?: string,
): Promise<{ error?: string }> {
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const update: any = {
    status: "active",
    started_at: now.toISOString(),
    expires_at: expires.toISOString(),
  };
  if (txn_id) update.txn_id = txn_id;

  const { error } = await supabase.from("subscriptions").update(update).eq(
    "id",
    id,
  );
  return { error: error?.message };
}

async function rejectSubscription(id: number): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "rejected" })
    .eq("id", id);
  return { error: error?.message };
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", withCORS({ status: 200 }));
  }

  if (!checkAuth(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), withCORS({
      status: 401,
    }));
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "list";

  if (req.method === "GET") {
    if (action !== "list") {
      return new Response(JSON.stringify({ error: "invalid action" }), withCORS({
        status: 400,
      }));
    }
    const result = await listSubscriptions();
    if ("error" in result) {
      return new Response(JSON.stringify({ error: result.error }), withCORS({
        status: 500,
      }));
    }
    return new Response(JSON.stringify(result), withCORS({ status: 200 }));
  }

  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid JSON body" }), withCORS({
        status: 400,
      }));
    }

    if (action === "approve") {
      const id = body?.id;
      if (typeof id !== "number") {
        return new Response(JSON.stringify({ error: "id must be a number" }), withCORS({
          status: 400,
        }));
      }
      const txn_id: string | undefined = body?.txn_id;
      const { error } = await approveSubscription(id, txn_id);
      if (error) {
        return new Response(JSON.stringify({ error }), withCORS({ status: 500 }));
      }
      return new Response(JSON.stringify({ success: true }), withCORS({
        status: 200,
      }));
    }

    if (action === "reject") {
      const id = body?.id;
      if (typeof id !== "number") {
        return new Response(JSON.stringify({ error: "id must be a number" }), withCORS({
          status: 400,
        }));
      }
      const { error } = await rejectSubscription(id);
      if (error) {
        return new Response(JSON.stringify({ error }), withCORS({ status: 500 }));
      }
      return new Response(JSON.stringify({ success: true }), withCORS({
        status: 200,
      }));
    }

    return new Response(JSON.stringify({ error: "invalid action" }), withCORS({
      status: 400,
    }));
  }

  return new Response(JSON.stringify({ error: "method not allowed" }), withCORS({
    status: 405,
  }));
}

serve(async (req) => {
  try {
    return await handler(req);
  } catch (e) {
    console.error("admin-subscriptions error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), withCORS({
      status: 500,
    }));
  }
});

