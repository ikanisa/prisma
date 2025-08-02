import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ────────────────────────────────────────────────────────────────────── */
/* Helper: quick "natural" geo coder via OpenAI function calling
   (replace with your own mapbox / here / OSM service if needed)         */
/* ────────────────────────────────────────────────────────────────────── */
async function quickGeocode(text: string) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;

  const body = {
    model: "gpt-4o-mini",
    temperature: 0,
    tools: [{
      type: "function",
      function: {
        name: "geo",
        description: "Extract Rwandan place‑names and return lat/lng",
        parameters: {
          type: "object",
          properties: {
            lat: { type: "number" },
            lng: { type: "number" },
            name: { type: "string" },
          },
          required: ["lat", "lng"],
        },
      },
    }],
    messages: [{
      role: "user",
      content:
        `Give me lat/lng & city name for: "${text}". Return via geo() only.`,
    }],
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  const call = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!call) return null;
  return JSON.parse(call);
}

/* ────────────────────────────────────────────────────────────────────── */

serve(withErrorHandling(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { from, text, message_id }: any = await req.json();
    // 💬 Expected patterns (Rwanda English / Kinyarwanda):
    //   • "Trip: Kigali → Rubavu 1 seat / 5000"
    //   • "Ndashaka gutwara Kigali Musanze intebe 2 4500"
    const regex =
      /(?:Trip|tugende|drive)[:\s-]*([\p{L}\s]+?)\s*(?:to|→|\-|–|\s)+\s*([\p{L}\s]+)\s+(\d)\s*(?:seats?|intebe)?\s*[\/\-]?\s*(\d{3,6})/iu;
    const m = regex.exec(text);

    if (!m) {
      // Not matched ⇒ let orchestrator decide
      return new Response(
        JSON.stringify({ handled: false, reason: "no_match" }),
        { headers: cors, status: 200 },
      );
    }

    const [, fromTxt, toTxt, seatsStr, priceStr] = m;
    const seats = Number(seatsStr);
    const price = Number(priceStr);

    // geo lightly (not blocking if fails)
    const [fromGeo, toGeo] = await Promise.all([
      quickGeocode(fromTxt.trim()),
      quickGeocode(toTxt.trim()),
    ]);

    const { data, error } = await supabase
      .from("driver_trips_spatial")
      .insert([{
        driver_phone: from, // phone # acts as user id
        from_text: fromTxt.trim(),
        to_text: toTxt.trim(),
        seats,
        price_rwf: price,
        origin: fromGeo
          ? `SRID=4326;POINT(${fromGeo.lng} ${fromGeo.lat})`
          : 'SRID=4326;POINT(30.0619 -1.9441)', // Default to Kigali center
        destination: toGeo 
          ? `SRID=4326;POINT(${toGeo.lng} ${toGeo.lat})` 
          : 'SRID=4326;POINT(30.1127 -1.9579)', // Default destination
      }])
      .select("id")
      .single();

    if (error) throw error;

    /* ---- fire-and-forget WhatsApp confirmation via channel‑gateway ---- */
    await supabase.functions.invoke("channel-gateway", {
      body: {
        channel: "whatsapp",
        recipient: from,
        message:
          `🚀 Trip posted!\n${fromTxt.trim()} → ${toTxt.trim()}\nSeats: ${seats}\nPrice: ${price.toLocaleString()} RWF\nWe'll ping you when passengers show interest.`,
        message_type: "text",
      },
    });

    return new Response(
      JSON.stringify({ handled: true, trip_id: data.id }),
      { headers: cors },
    );
  } catch (err: any) {
    console.error("driver‑trip‑create error", err);
    return new Response(
      JSON.stringify({ handled: false, error: err.message }),
      { status: 500, headers: cors },
    );
  }
});

export { quickGeocode };
