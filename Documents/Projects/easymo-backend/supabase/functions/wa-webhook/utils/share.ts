import { sb } from "../config.ts";
import { e164 } from "./phone.ts";

let cachedDigits: string | null = null;

async function fetchBotDigits(): Promise<string> {
  if (cachedDigits !== null) return cachedDigits;
  try {
    const { data, error } = await sb
      .from("app_config")
      .select("WA_BOT_NUMBER_E164")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    const value = data?.WA_BOT_NUMBER_E164 ?? "";
    cachedDigits = value ? e164(value).replace(/\D/g, "") : "";
  } catch (error) {
    console.error("FETCH_BOT_DIGITS_FAILED", error);
    cachedDigits = "";
  }
  return cachedDigits;
}

export async function buildShareLink(numberE164?: string, prefill = "home"): Promise<string> {
  const digits = numberE164
    ? e164(numberE164).replace(/\D/g, "")
    : await fetchBotDigits();
  const encodedText = encodeURIComponent(prefill);
  if (!digits) {
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${digits}?text=${encodedText}`;
}

export async function buildShareQR(link: string): Promise<string> {
  return link ? `https://quickchart.io/qr?text=${encodeURIComponent(link)}&margin=1&size=512` : "";
}

export async function getBotDigits(): Promise<string> {
  return fetchBotDigits();
}
