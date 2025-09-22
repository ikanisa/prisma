// supabase/functions/issue_token/index.ts
// CORS wrapper that preserves your existing handler logic.
// Paste your current logic inside main() where marked.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function withCors(res: Response) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}

async function main(req: Request): Promise<Response> {
  // ---------- >>> YOUR EXISTING HANDLER START ----------
  // Paste the body of your old `serve(async (req)=>{ ... })` here,
  // but WITHOUT `serve(` / `})` — just the logic that returns a Response.

  // TEMP sanity route so GET from a browser shows it’s alive.
  if (req.method === "GET") {
    return new Response("issue_token alive", { status: 200 });
  }

  // If your original handler was POST-only, keep that:
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  // NOTE: replace everything below with your real code.
  // This is only a guard so the function compiles if you paste later.
  return new Response(JSON.stringify({ error: "Paste your existing issue_token logic here" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });

  // ---------- >>> YOUR EXISTING HANDLER END ------------
}

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const res = await main(req);
    return withCors(res);
  } catch (e) {
    return withCors(
      new Response(JSON.stringify({ error: String(e) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
});

