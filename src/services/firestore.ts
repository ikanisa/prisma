import { supabaseService, getSessionId as getSupabaseSessionId } from './supabaseService';

// Keep the Firebase interface but redirect to Supabase
export const initializeSession = async (): Promise<string> => {
  return getSupabaseSessionId();
};

export const getSessionId = (): string => {
  return getSupabaseSessionId();
};

export const savePaymentRequest = async (data: {
  inputType: string;
  receiver: string;
  amount: number;
  ussdString: string;
  qrCodeUrl?: string;
  paymentLink?: string;
}) => {
  // This is now handled by the Edge Functions
  console.log('Payment request saved via Supabase Edge Functions');
  return { id: 'handled-by-supabase' };
};

export const saveQRScanResult = async (data: {
  decodedUssd: string;
  decodedReceiver?: string;
  decodedAmount?: number;
  result: string;
  imageSource?: string;
}) => {
  // This is now handled by the Edge Functions
  console.log('QR scan result saved via Supabase Edge Functions');
  return { id: 'handled-by-supabase' };
};

export const saveSharedLink = async (data: {
  receiver: string;
  amount: number;
  paymentLink: string;
}) => {
  // This is now handled by the Edge Functions
  console.log('Shared link saved via Supabase Edge Functions');
  return { id: 'handled-by-supabase' };
};

export const logSessionEvent = async (data: {
  function: string;
  status: string;
  error?: string;
}) => {
  await supabaseService.logShareEvent(`${data.function}_${data.status}`);
};

export const getRecentQRCodes = async () => {
  return await supabaseService.getRecentQRCodes();
};

export const fetchAds = async () => {
  // Mock implementation - can be enhanced later
  return [];
};
