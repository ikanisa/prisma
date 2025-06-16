
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from './supabaseService';

export interface Transaction {
  id: string;
  scanned_code: string;
  scanned_at: string;
  launched_ussd: boolean;
  payment_status: string;
  payer_number?: string;
  session_id: string;
}

export const transactionService = {
  async logQRScan(scannedCode: string, payerNumber?: string): Promise<Transaction> {
    const sessionId = getSessionId();
    
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        scanned_code: scannedCode,
        payer_number: payerNumber,
        launched_ussd: false,
        payment_status: 'scanned',
        session_id: sessionId
      })
      .select('id, scanned_code, scanned_at, launched_ussd, payment_status, payer_number, session_id')
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
      .select('id, scanned_code, scanned_at, launched_ussd, payment_status, payer_number, session_id')
      .eq('session_id', sessionId)
      .order('scanned_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Failed to fetch transaction history: ${error.message}`);
    }

    return data || [];
  }
};
