import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

function getEnv(key: string): string {
  if (typeof Deno !== "undefined") return Deno.env.get(key)!;
  return process.env[key]!;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const { phone_number } = await req.json();
  const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
  await supabase.from("users").upsert({ wa_id: phone_number }, { onConflict: "wa_id" });
  await supabase.from("contacts").upsert({ phone_number }, { onConflict: "phone_number" });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

serve(handler);
