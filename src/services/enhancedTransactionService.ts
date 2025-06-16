
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from './supabaseService';
import { USSDValidationResult } from '@/utils/ussdValidation';

export interface TransactionRecord {
  id: string;
  scanned_code: string;
  scanned_at: string;
  launched_ussd: boolean;
  payment_status: string;
  payer_number?: string;
  session_id: string;
  country?: string;
  provider?: string;
  ussd_pattern_type?: string;
  confidence_score?: number;
}

export const enhancedTransactionService = {
  async logQRScan(
    scannedCode: string, 
    validation?: USSDValidationResult,
    payerNumber?: string
  ): Promise<TransactionRecord> {
    const sessionId = getSessionId();
    
    try {
      const insertData = {
        scanned_code: scannedCode,
        payer_number: payerNumber || null,
        launched_ussd: false,
        payment_status: 'scanned',
        session_id: sessionId,
        country: validation?.country || null,
        provider: validation?.provider || null,
        ussd_pattern_type: validation?.pattern || null,
        confidence_score: validation?.confidence || 0.5
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Transaction insert error:', error);
        throw new Error(`Failed to log QR scan: ${error.message}`);
      }

      console.log('QR scan logged successfully:', data);
      return data;
    } catch (error) {
      console.error('Enhanced transaction service error:', error);
      // Return a fallback transaction record
      return {
        id: `fallback_${Date.now()}`,
        scanned_code: scannedCode,
        scanned_at: new Date().toISOString(),
        launched_ussd: false,
        payment_status: 'scanned',
        session_id: sessionId,
        country: validation?.country,
        provider: validation?.provider,
        ussd_pattern_type: validation?.pattern,
        confidence_score: validation?.confidence || 0.5
      };
    }
  },

  async markUSSDLaunched(transactionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          launched_ussd: true,
          payment_status: 'launched'
        })
        .eq('id', transactionId);

      if (error) {
        console.error('USSD launch update error:', error);
        return false;
      }

      console.log('USSD launch marked successfully:', transactionId);
      return true;
    } catch (error) {
      console.error('Mark USSD launched error:', error);
      return false;
    }
  },

  async getRecentTransactions(limit: number = 10): Promise<TransactionRecord[]> {
    const sessionId = getSessionId();
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('session_id', sessionId)
        .order('scanned_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Fetch transactions error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get recent transactions error:', error);
      return [];
    }
  },

  async updatePaymentStatus(transactionId: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ payment_status: status })
        .eq('id', transactionId);

      if (error) {
        console.error('Payment status update error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Update payment status error:', error);
      return false;
    }
  }
};
