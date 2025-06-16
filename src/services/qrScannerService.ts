
import { supabase } from '@/integrations/supabase/client';

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
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          scanned_code: scannedCode,
          session_id: this.sessionId,
          payment_status: 'scanned',
          launched_ussd: false
        })
        .select('*')
        .single();

      if (error) {
        console.error('Failed to log scan:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error logging scan:', error);
      return null;
    }
  }

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
        console.error('Failed to mark USSD launched:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking USSD launched:', error);
      return false;
    }
  }

  extractPayerNumber(ussdCode: string): string | null {
    // Extract payer number from USSD code like *182*1*1*0788123456*2500#
    const phoneMatch = ussdCode.match(/\*182\*1\*1\*(\d+)\*/);
    return phoneMatch ? phoneMatch[1] : null;
  }

  createTelURI(ussdCode: string): string {
    return `tel:${encodeURIComponent(ussdCode)}`;
  }
}

export const qrScannerService = new QRScannerService();
