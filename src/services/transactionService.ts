
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from './supabaseService';

export interface Transaction {
  id: string;
  payment_id?: string;
  payer_number?: string;
  scanned_at: string;
  launched_ussd: boolean;
  payment_status: string;
  session_id: string;
  ussd_code?: string;
}

export const transactionService = {
  async logQRScan(ussdCode: string, payerNumber?: string): Promise<Transaction> {
    const sessionId = getSessionId();
    
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ussd_code: ussdCode,
        payer_number: payerNumber,
        launched_ussd: false,
        payment_status: 'scanned',
        session_id: sessionId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log QR scan: ${error.message}`);
    }

    return data;
  },

  async logUSSDLaunch(transactionId: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update({ 
        launched_ussd: true,
        payment_status: 'launched'
      })
      .eq('id', transactionId);

    if (error) {
      throw new Error(`Failed to log USSD launch: ${error.message}`);
    }
  },

  async updatePaymentStatus(transactionId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .update({ payment_status: status })
      .eq('id', transactionId);

    if (error) {
      throw new Error(`Failed to update payment status: ${error.message}`);
    }
  },

  async getTransactionHistory(): Promise<Transaction[]> {
    const sessionId = getSessionId();
    
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('session_id', sessionId)
      .order('scanned_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Failed to fetch transaction history: ${error.message}`);
    }

    return data || [];
  }
};
