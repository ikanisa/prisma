import { createClient } from "./deps.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WA_TOKEN = Deno.env.get("WA_TOKEN") ?? "";
const WA_PHONE_ID = Deno.env.get("WA_PHONE_ID") ?? "";
const WA_APP_SECRET = Deno.env.get("WA_APP_SECRET") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const WA_VERIFY_TOKEN = Deno.env.get("WA_VERIFY_TOKEN") ?? "";

export const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export {
  OPENAI_API_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  WA_APP_SECRET,
  WA_PHONE_ID,
  WA_TOKEN,
  WA_VERIFY_TOKEN,
};
