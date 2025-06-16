
import { supabase } from '@/integrations/supabase/client';
import { getSessionId } from './supabaseService';
import { UssdValidationResult } from '@/utils/universalUssdHelper';

export interface Transaction {
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

export interface TransactionAnalytics {
  country: string;
  provider: string;
  ussd_pattern_type: string;
  total_scans: number;
  successful_launches: number;
  success_rate_percent: number;
  avg_confidence: number;
}

export const transactionService = {
  async logQRScan(
    scannedCode: string, 
    ussdValidation?: UssdValidationResult,
    payerNumber?: string
  ): Promise<Transaction> {
    const sessionId = getSessionId();
    
    const insertData = {
      scanned_code: scannedCode,
      payer_number: payerNumber,
      launched_ussd: false,
      payment_status: 'scanned',
      session_id: sessionId,
      country: ussdValidation?.country || null,
      provider: ussdValidation?.provider || null,
      ussd_pattern_type: ussdValidation?.type || null,
      confidence_score: ussdValidation?.isValid ? 0.95 : 0.3
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert(insertData)
      .select('id, scanned_code, scanned_at, launched_ussd, payment_status, payer_number, session_id, country, provider, ussd_pattern_type, confidence_score')
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
      .select('id, scanned_code, scanned_at, launched_ussd, payment_status, payer_number, session_id, country, provider, ussd_pattern_type, confidence_score')
      .eq('session_id', sessionId)
      .order('scanned_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Failed to fetch transaction history: ${error.message}`);
    }

    return data || [];
  },

  async getAnalytics(country?: string, provider?: string): Promise<TransactionAnalytics[]> {
    const { data, error } = await supabase
      .rpc('get_ussd_success_stats', {
        p_country: country || null,
        p_provider: provider || null
      });

    if (error) {
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }

    // Map the database response to match our interface
    return (data || []).map(item => ({
      country: item.country,
      provider: item.provider,
      ussd_pattern_type: item.pattern_type, // Map pattern_type to ussd_pattern_type
      total_scans: item.total_scans,
      successful_launches: item.successful_launches,
      success_rate_percent: item.success_rate, // Map success_rate to success_rate_percent
      avg_confidence: 0.8 // Default confidence since DB function doesn't return this
    }));
  },

  async getTransactionAnalyticsView(): Promise<TransactionAnalytics[]> {
    const { data, error } = await supabase
      .from('transaction_analytics')
      .select('*')
      .limit(20);

    if (error) {
      throw new Error(`Failed to fetch analytics view: ${error.message}`);
    }

    return data || [];
  }
};
