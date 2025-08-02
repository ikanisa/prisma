
export interface PaymentData {
  amount: string;
  phone: string;
  currency?: string;
}

export interface QRScanResult {
  data: string;
  type: 'USSD' | 'URL' | 'TEXT';
}

export interface CameraState {
  isActive: boolean;
  hasPermission: boolean;
  error: string | null;
}

export interface ToastConfig {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}
