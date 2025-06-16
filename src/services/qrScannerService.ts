
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';
import { withRetry, isRetryableError } from '@/utils/retryMechanism';
import { errorMonitoringService } from './errorMonitoringService';

export interface ScanTransaction {
  id: string;
  scanned_code: string;
  scanned_at: string;
  launched_ussd: boolean;
  payment_status: string;
  payer_number?: string;
  session_id: string;
}

class QRScannerService {
  private sessionId: string;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem('qr_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('qr_session_id', sessionId);
    }
    return sessionId;
  }

  async logScan(scannedCode: string): Promise<ScanTransaction | null> {
    try {
      return await withRetry(async () => {
        const { data, error } = await supabase
          .from('transactions')
          .insert({
            scanned_code: scannedCode,
            session_id: this.sessionId,
            payment_status: 'scanned',
            launched_ussd: false
          })
          .select('id, scanned_code, scanned_at, launched_ussd, payment_status, payer_number, session_id')
          .single();

        if (error) {
          errorMonitoringService.logSupabaseError('logScan', error);
          throw error;
        }

        return data;
      }, { maxAttempts: 3, delay: 1000 });
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'qr_scan_logging', {
        scannedCode: scannedCode.substring(0, 50), // Log partial code for privacy
        sessionId: this.sessionId
      });
      return null;
    }
  }

  async updateLightingData(transactionId: string, lightingCondition: string, torchUsed: boolean): Promise<boolean> {
    try {
      return await withRetry(async () => {
        const updateData: TablesUpdate<'transactions'> = {
          lighting_conditions: lightingCondition,
          torch_used: torchUsed
        };

        const { error } = await supabase
          .from('transactions')
          .update(updateData)
          .eq('id', transactionId);

        if (error) {
          errorMonitoringService.logSupabaseError('updateLightingData', error);
          throw error;
        }

        return true;
      }, { maxAttempts: 2, delay: 500 });
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'lighting_data_update', {
        transactionId,
        lightingCondition,
        torchUsed
      });
      return false;
    }
  }

  async markUSSDLaunched(transactionId: string): Promise<boolean> {
    try {
      return await withRetry(async () => {
        const { error } = await supabase
          .from('transactions')
          .update({
            launched_ussd: true,
            payment_status: 'launched'
          })
          .eq('id', transactionId);

        if (error) {
          errorMonitoringService.logSupabaseError('markUSSDLaunched', error);
          throw error;
        }

        return true;
      }, { maxAttempts: 3, delay: 1000 });
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'ussd_launch_tracking', {
        transactionId
      });
      return false;
    }
  }

  extractPayerNumber(ussdCode: string): string | null {
    try {
      const phoneMatch = ussdCode.match(/\*182\*1\*1\*(\d+)\*/);
      return phoneMatch ? phoneMatch[1] : null;
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'payer_number_extraction', {
        ussdCodeLength: ussdCode.length
      });
      return null;
    }
  }

  createTelURI(ussdCode: string): string {
    try {
      return `tel:${encodeURIComponent(ussdCode)}`;
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'tel_uri_creation', {
        ussdCodeLength: ussdCode.length
      });
      return `tel:${ussdCode}`; // Fallback without encoding
    }
  }
}

export const qrScannerService = new QRScannerService();
