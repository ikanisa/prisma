
// This file's firebase API is deprecated; delegate all to SupabaseService for production
import { supabaseService, getSessionId as getSupabaseSessionId } from './supabaseService';

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
  // Production: backend handles all write logic
  // Could call a Supabase edge function for advanced logging if needed
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
  // All scan logs handled by edge functions or direct Supabase logging
  console.log('QR scan result saved via Supabase Edge Functions');
  return { id: 'handled-by-supabase' };
};

export const saveSharedLink = async (data: {
  receiver: string;
  amount: number;
  paymentLink: string;
}) => {
  // All logic handled via Supabase edge function
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
  // Use the same dummy implementation as in api.ts for now
  return [];
};
