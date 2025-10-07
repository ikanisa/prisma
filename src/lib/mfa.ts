import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';

export async function sendWhatsappOtp(params: { orgId: string; userId: string; whatsappE164: string }) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }
  const response = await supabase.functions.invoke('whatsapp_otp_send', {
    body: params,
  });
  if (response.error) {
    throw new Error(response.error.message || 'Failed to send OTP');
  }
  return response.data as { success: boolean; challengeId?: string | null };
}

export async function verifyWhatsappOtp(params: { orgId: string; userId: string; code: string }) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }
  const response = await supabase.functions.invoke('whatsapp_otp_verify', {
    body: params,
  });
  if (response.error) {
    throw new Error(response.error.message || 'Failed to verify OTP');
  }
  return response.data as { success: boolean };
}
