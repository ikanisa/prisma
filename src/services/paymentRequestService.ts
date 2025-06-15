
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from './supabaseService';
import { generateUSSDCode } from '@/utils/ussdHelper';

export interface PaymentRequest {
  id: string;
  session_id: string;
  momo_number: string;
  amount: number;
  ussd_code: string;
  created_at: string;
}

export const paymentRequestService = {
  async createPaymentRequest(momoNumber: string, amount: number): Promise<PaymentRequest> {
    const sessionId = getSessionId();
    // Use the helper function to ensure exact USSD format
    const ussdCode = generateUSSDCode(momoNumber, amount);
    
    const { data, error } = await supabase
      .from('payment_requests')
      .insert({
        session_id: sessionId,
        momo_number: momoNumber,
        amount,
        ussd_code: ussdCode
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create payment request: ${error.message}`);
    }

    return data;
  },

  async getPaymentRequests(): Promise<PaymentRequest[]> {
    const sessionId = getSessionId();
    
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to fetch payment requests: ${error.message}`);
    }

    return data || [];
  }
};
