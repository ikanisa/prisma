import { supabaseService } from './supabaseService';

// Keep the same interface but redirect to Supabase
export const cloudFunctions = {
  async generateQRCode(receiver: string, amount: number) {
    console.log('[QR DEBUG] generateQRCode input:', { receiver, amount });
    const result = await supabaseService.generateQRCode(receiver, amount);
    console.log('[QR DEBUG] generateQRCode result:', result);
    return result;
  },

  async createPaymentLink(receiver: string, amount: number) {
    const result = await supabaseService.createPaymentLink(receiver, amount);
    console.log('[QR DEBUG] createPaymentLink result:', result);
    return result;
  },

  async scanQRCodeImage(qrImage: string) {
    return await supabaseService.scanQRCodeImage(qrImage);
  },

  async logShareEvent(method: string) {
    return await supabaseService.logShareEvent(method);
  },

  async getOfflineQRCode() {
    const recentQRs = await supabaseService.getRecentQRCodes();
    return recentQRs[0] || null;
  }
};
