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

serve(withErrorHandling(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { from, text, message_id }: any = await req.json();

    // Examples:
    //   "Need ride Kigali -> Huye 1 seat 4000"
    //   "Ndashaka Kigali Musanze intebe1 3000"
    const regex =
      /(?:Need|ride|nkeneye|Trip|ndeshaka)[:\s-]*([\p{L}\s]+?)\s*(?:to|→|\-|–|\s)+\s*([\p{L}\s]+)\s+(\d)\s*(?:seat[s]?|intebe)?\s*([0-9]{3,6})?/iu;
    const m = regex.exec(text);

    if (!m) {
      return new Response(JSON.stringify({ handled: false }), {
        headers: cors,
      });
    }

    const [, fromTxt, toTxt, seatsStr, priceStr] = m;
    const seats_needed = Number(seatsStr);
    const max_price = priceStr ? Number(priceStr) : null;

    const [fromGeo, toGeo] = await Promise.all([
      quickGeocode(fromTxt.trim()),
      quickGeocode(toTxt.trim()),
    ]);

    const { data, error } = await supabase
      .from("passenger_intents_spatial")
      .insert([{
        passenger_phone: from,
        from_text: fromTxt.trim(),
        to_text: toTxt.trim(),
        seats_needed,
        max_price_rwf: max_price,
        pickup: fromGeo
          ? `SRID=4326;POINT(${fromGeo.lng} ${fromGeo.lat})`
          : 'SRID=4326;POINT(30.0619 -1.9441)', // Default to Kigali center
        dropoff: toGeo 
          ? `SRID=4326;POINT(${toGeo.lng} ${toGeo.lat})` 
          : 'SRID=4326;POINT(30.1127 -1.9579)', // Default destination
      }])
      .select("id")
      .single();

    if (error) throw error;

    /* ───── Fetch nearby drivers instantly (2 km) and craft reply ───── */
    const { data: drivers } = await supabase.rpc("fn_get_nearby_drivers_spatial", {
      lat: fromGeo?.lat || -1.95,
      lng: fromGeo?.lng || 30.06,
      radius: 2,
    });

    let reply = `🚌 Request posted!\n${fromTxt.trim()} → ${toTxt.trim()}\nSeats: ${seats_needed}`;
    if (max_price) reply += `\nBudget: ${max_price.toLocaleString()} RWF`;

    if (drivers && drivers.length) {
      reply += `\n\nNearby drivers:\n`;
      reply += drivers
        .slice(0, 5)
        .map((d: any, i: number) =>
          `${i + 1}. ${d.driver_phone} (${d.distance_km.toFixed(1)} km)`
        )
        .join("\n");
      reply +=
        `\n\nReply with the driver's number to book, or we'll keep searching.`;
    } else {
      reply +=
        `\n\nNo drivers within 2 km right now. We'll notify you when one appears ✅`;
    }

    await supabase.functions.invoke("channel-gateway", {
      body: {
        channel: "whatsapp",
        recipient: from,
        message: reply,
        message_type: "text",
      },
    });

    return new Response(JSON.stringify({ handled: true, intent_id: data.id }), {
      headers: cors,
    });
  } catch (e: any) {
    console.error("passenger‑intent‑create error", e);
    return new Response(
      JSON.stringify({ handled: false, error: e.message }),
      { status: 500, headers: cors },
    );
  }
});
