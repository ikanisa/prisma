
/**
 * Unified API layer for Mobile Money WPA backend integration (Firebase Functions, dummy fallback)
 * All endpoints documented in the backend spec.
 * Works fully even without real backend—returns placeholders and logs intentions.
 */

const DUMMY = !(import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL);
const FIREBASE_BASE = import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL?.replace(/\/$/, "");

type GeneratePaymentLinkParams = { phone: string; amount: number };
type GeneratePaymentLinkResult = { ussdString: string; qrCodeUrl: string; shareLink: string };

type ScanQRCodeParams = { imageBase64: string };
type ScanQRCodeResult = { decodedUSSD: string };

type LogScanEventParams = { decodedUSSD: string; rawImageUrl: string };
type LogScanEventResult = { message: string };

type Ad = {
  headline: string;
  description: string;
  gradient: string[];
  ctaLink: string;
  imageUrl: string;
};
type FetchAdsResult = Ad[];

async function generatePaymentLink(params: GeneratePaymentLinkParams): Promise<GeneratePaymentLinkResult> {
  if (DUMMY) {
    // Dummy logic: Generate placeholder values, log the action
    const { phone, amount } = params;
    const ussdString = `*182*1*1*${phone}*${amount}#`;
    const qrCodeUrl = "https://via.placeholder.com/350x350.png?text=QR+Code";
    const shareLink = `https://app.example.com/pay?phone=${phone}&amount=${amount}`;
    console.log("[DUMMY] generatePaymentLink", {phone, amount, ussdString, qrCodeUrl, shareLink});
    return { ussdString, qrCodeUrl, shareLink };
  }
  // Real call
  const resp = await fetch(`${FIREBASE_BASE}/generatePaymentLink`, {
    method: "POST",
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(params),
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

async function scanQRCode(params: ScanQRCodeParams): Promise<ScanQRCodeResult> {
  if (DUMMY) {
    // Return a dummy USSD code
    console.log("[DUMMY] scanQRCode", params);
    const decodedUSSD = "*182*1*1*0788123456*5000#";
    return { decodedUSSD };
  }
  const resp = await fetch(`${FIREBASE_BASE}/scanQRCode`, {
    method: "POST",
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(params),
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

async function logScanEvent(params: LogScanEventParams): Promise<LogScanEventResult> {
  if (DUMMY) {
    console.log("[DUMMY] logScanEvent", params);
    return { message: "Scan event logged (dummy)" };
  }
  const resp = await fetch(`${FIREBASE_BASE}/logScanEvent`, {
    method: "POST",
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(params),
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

async function fetchAds(): Promise<FetchAdsResult> {
  if (DUMMY) {
    const dummyAds = [
      {
        headline: "🔥 Get 10% Cashback!",
        description: "Pay with MoMo and enjoy cashback.",
        gradient: ["#FF512F", "#DD2476"],
        ctaLink: "https://promo.example.com",
        imageUrl: "https://via.placeholder.com/600x200?text=Ad"
      }
    ];
    console.log("[DUMMY] fetchAds returning dummy ads", dummyAds);
    return dummyAds;
  }
  const resp = await fetch(`${FIREBASE_BASE}/fetchAds`);
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export const api = {
  generatePaymentLink,
  scanQRCode,
  logScanEvent,
  fetchAds,
};
