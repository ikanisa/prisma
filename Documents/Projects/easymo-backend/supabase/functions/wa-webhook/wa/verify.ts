import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { WA_APP_SECRET } from "../config.ts";

export async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  try {
    const sig = req.headers.get("x-hub-signature-256") || "";
    if (!sig || !WA_APP_SECRET) return true;
    const expected = await signHmacSha256Hex(WA_APP_SECRET, rawBody);
    return sig.toLowerCase() === `sha256=${expected}`;
  } catch (error) {
    console.error("SIG_VERIFY_ERROR", error);
    return false;
  }
}

async function signHmacSha256Hex(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
