export * from './templates';
export * from './getButtons';

/**
 * WhatsApp Cloud API helper functions.
 */
/**
 * Verify HMAC SHA256 signature of a payload using the app secret.
 * @param signature Header signature (e.g., "sha256=...")
 * @param payload Raw request payload
 * @param secret App secret for HMAC
 */
export async function verifySignature(
  signature: string,
  payload: string,
  secret: string,
): Promise<boolean> {
  const sig = signature.replace(/^sha256=/, "");
  const keyData = new TextEncoder().encode(secret);
  const data = new TextEncoder().encode(payload);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signatureBytes = hexToBytes(sig);
  return crypto.subtle.verify("HMAC", cryptoKey, signatureBytes, data);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function sendTemplateMessage() {
  // Placeholder for sending WhatsApp template messages via Cloud API
  throw new Error("sendTemplateMessage not implemented");
}
