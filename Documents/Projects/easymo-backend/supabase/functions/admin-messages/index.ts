// supabase/functions/admin-messages/index.ts
// deno-lint-ignore-file no-explicit-any

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (req.method === "GET") {
    // Query params: ?limit=20&from=2507...
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 200);
    const from = url.searchParams.get("from") ?? "";

    const base = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!base || !key) return json({ error: "server not configured" }, 500);

    const qs = new URLSearchParams();
    qs.set("select", "id,from_e164,message_id,msg_type,text_body,created_at");
    qs.set("order", "id.desc");
    qs.set("limit", String(limit));
    if (from) qs.set("from_e164", `eq.${from}`);

    const res = await fetch(`${base}/rest/v1/wa_messages?${qs.toString()}`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Accept": "application/json",
      },
    });

    const text = await res.text();
    let rows: any;
    try { rows = JSON.parse(text); } catch { rows = text; }

    return json({ ok: res.ok, status: res.status, rows });
  }

  return json({ error: "method not allowed" }, 405);
});

