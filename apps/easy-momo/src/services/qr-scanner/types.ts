
export interface ScanResult {
  success: boolean;
  code: string;
  ussdCode?: string;
  confidence: number;
  timestamp: number;
}

export interface ScanTransaction {
  id: string;
  scanned_code: string;
  scanned_at: string;
  launched_ussd: boolean;
  payment_status: string;
  payer_number?: string;
  session_id: string;
}
