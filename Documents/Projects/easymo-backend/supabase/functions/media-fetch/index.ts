// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
 * media-fetch
 *
 * POST JSON: { media_id: string, subscription_id: number }
 * Auth: header x-admin-token must equal ADMIN_TOKEN secret.
 * Flow:
 *  1) Look up subscription → user_id
 *  2) Graph API: get media URL, then download binary with WA_TOKEN
 *  3) Upload to Storage bucket `proofs` at:
 *       subscriptions/{user_id}/{subscription_id}.{ext}
 *  4) Update subscriptions.proof_url with that path
 *  5) Return a 7-day signed URL
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!; // keep using SERVICE_ROLE_KEY
const ADMIN_TOKEN = Deno.env.get("ADMIN_TOKEN")!;
const WA_TOKEN = Deno.env.get("WA_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json",
} as const;

function withCORS(init: ResponseInit = {}): ResponseInit {
  return { ...init, headers: { ...(init.headers || {}), ...CORS_HEADERS } };
}

function checkAuth(req: Request): boolean {
  return req.headers.get("x-admin-token") === ADMIN_TOKEN;
}

async function fetchMedia(mediaId: string): Promise<
  | { buffer: Uint8Array; contentType: string }
  | { error: string }
> {
  // 1) metadata → URL
  const metaResp = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
  });
  if (!metaResp.ok) {
    return { error: `failed to get media metadata: ${await metaResp.text()}` };
  }
  const meta = await metaResp.json();
  const url = meta?.url;
  if (!url) return { error: "media URL not found" };

  // 2) download binary
  const mediaResp = await fetch(url, {
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
  });
  if (!mediaResp.ok) {
    return { error: `failed to download media: ${await mediaResp.text()}` };
  }
  const arrayBuffer = await mediaResp.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  const contentType =
    mediaResp.headers.get("content-type") ?? "application/octet-stream";
  return { buffer, contentType };
}

function pickExt(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("pdf")) return "pdf";
  return "bin";
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

  if (req.method.toUpperCase() !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), withCORS({
      status: 405,
    }));
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), withCORS({
      status: 400,
    }));
  }

  const mediaId: string | undefined = body?.media_id;
  const subscriptionId: number | undefined = body?.subscription_id;
  if (!mediaId || typeof mediaId !== "string" || typeof subscriptionId !== "number") {
    return new Response(
      JSON.stringify({ error: "media_id and subscription_id are required" }),
      withCORS({ status: 400 }),
    );
  }

  // get subscription → user_id
  const { data: sub, error: subErr } = await supabase
    .from("subscriptions")
    .select("id,user_id")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (subErr || !sub) {
    return new Response(
      JSON.stringify({ error: subErr?.message ?? "subscription not found" }),
      withCORS({ status: 404 }),
    );
  }

  // fetch media
  const media = await fetchMedia(mediaId);
  if ("error" in media) {
    return new Response(JSON.stringify({ error: media.error }), withCORS({
      status: 500,
    }));
  }

  // file path
  const ext = pickExt(media.contentType);
  const filePath = `subscriptions/${sub.user_id}/${subscriptionId}.${ext}`;

  // upload
  const { error: uploadErr } = await supabase.storage
    .from("proofs")
    .upload(filePath, media.buffer, {
      contentType: media.contentType,
      upsert: true,
    });
  if (uploadErr) {
    return new Response(JSON.stringify({ error: uploadErr.message }), withCORS({
      status: 500,
    }));
  }

  // update subscription
  const { error: updateErr } = await supabase
    .from("subscriptions")
    .update({ proof_url: filePath })
    .eq("id", subscriptionId);
  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), withCORS({
      status: 500,
    }));
  }

  // signed URL (7 days)
  const { data: signed, error: signErr } = await supabase.storage
    .from("proofs")
    .createSignedUrl(filePath, 60 * 60 * 24 * 7);
  if (signErr) {
    return new Response(JSON.stringify({ error: signErr.message }), withCORS({
      status: 500,
    }));
  }

  return new Response(JSON.stringify({ success: true, url: signed.signedUrl }), withCORS({
    status: 200,
  }));
}

serve(async (req) => {
  try {
    return await handler(req);
  } catch (e) {
    console.error("media-fetch error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), withCORS({
      status: 500,
    }));
  }
});

