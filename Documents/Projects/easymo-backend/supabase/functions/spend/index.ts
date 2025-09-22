// supabase/functions/spend/index.ts
// CORS wrapper that preserves your existing handler logic.

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
  // Paste your old spend logic here (the code that used to be inside serve()).

  // Optional probe:
  if (req.method === "GET") return new Response("spend alive", { status: 200 });

  // If your original is POST-only:
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  return new Response(JSON.stringify({ error: "Paste your existing spend logic here" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });

  // ---------- >>> YOUR EXISTING HANDLER END ------------
}

serve(async (req) => {
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

