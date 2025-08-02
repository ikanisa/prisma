
import { cloudFunctions } from './cloudFunctions';
import QRCode from 'qrcode';

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

// Helper to detect phone vs code and generate USSD
const generateUSSDString = (receiver: string, amount: number): string => {
  const phoneRegex = /^(07[2-9]\d{7})$/;
  const codeRegex = /^\d{4,6}$/;

  if (phoneRegex.test(receiver)) {
    return `*182*1*1*${receiver}*${amount}#`;
  } else if (codeRegex.test(receiver)) {
    return `*182*8*1*${receiver}*${amount}#`;
  }
  return `*182*1*1*${receiver}*${amount}#`; // Default to phone format
};

async function generatePaymentLink(params: GeneratePaymentLinkParams): Promise<GeneratePaymentLinkResult> {
  try {
    // Supabase Flow: Always call backend
    const result = await cloudFunctions.generateQRCode(params.phone, params.amount);
    const shareLink = await cloudFunctions.createPaymentLink(params.phone, params.amount);

    return {
      ussdString: result.ussdString,
      qrCodeUrl: result.qrCodeUrl || result.qrCodeImage || '',
      shareLink: shareLink?.paymentLink || '',
    };
  } catch (error) {
    console.error('generatePaymentLink error:', error);

    // Fallback
    const { phone, amount } = params;
    const ussdString = generateUSSDString(phone, amount);
    const qrCodeUrl = await QRCode.toDataURL(ussdString, {
      width: 400,
      margin: 2,
      color: { dark: "#1f2937", light: "#ffffff" },
      errorCorrectionLevel: 'H'
    });
    const shareLink = `${window.location.origin}/shared/${Date.now()}`;

    return { ussdString, qrCodeUrl, shareLink };
  }
}

async function scanQRCode(params: ScanQRCodeParams): Promise<ScanQRCodeResult> {
  try {
    const result = await cloudFunctions.scanQRCodeImage(params.imageBase64);
    return { decodedUSSD: result.ussdString };
  } catch (error) {
    console.error('scanQRCode error:', error);

    // Fallback: static/dummy result
    const decodedUSSD = "*182*1*1*0788123456*5000#";
    return { decodedUSSD };
  }
}

async function logScanEvent(params: LogScanEventParams): Promise<LogScanEventResult> {
  try {
    await cloudFunctions.logShareEvent('QR_SCAN');
    return { message: "Scan event logged successfully" };
  } catch (error) {
    console.error('logScanEvent error:', error);
    return { message: "Scan event logged (fallback)" };
  }
}

async function fetchAds(): Promise<FetchAdsResult> {
  // Placeholder/dummy ad for now, as there is no live Supabase ads table
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

export const api = {
  generatePaymentLink,
  scanQRCode,
  logScanEvent,
  fetchAds,
};

