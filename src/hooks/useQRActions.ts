
import { cloudFunctions } from '@/services/cloudFunctions';
import { toastService } from '@/services/toastService';
import { analyticsService } from '@/services/analyticsService';
import { errorMonitoringService } from '@/services/errorMonitoringService';
import { rateLimitingService } from '@/services/rateLimitingService';

export const useQRActions = () => {
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toastService.success("Copied!", `${type} copied to clipboard`);
      analyticsService.trackEvent('clipboard_copy', { type, text_length: text.length });
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'clipboard_copy', { type });
      toastService.error("Copy Failed", "Could not copy to clipboard");
    }
  };

  const downloadQR = (qrResult: any, phone: string, amount: string) => {
    if (!qrResult?.qrCodeImage) {
      toastService.error("Download Failed", "No QR code available to download");
      return;
    }
    
    try {
      const link = document.createElement('a');
      link.download = `payment-qr-${phone}-${amount}.png`;
      link.href = qrResult.qrCodeImage;
      link.click();
      
      toastService.success("Downloaded!", "QR code saved to your device");
      analyticsService.trackEvent('qr_download', { phone, amount });
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'qr_download', { phone, amount });
      toastService.error("Download Failed", "Could not download QR code");
    }
  };

  const shareViaWhatsApp = (amount: string, paymentLink: string) => {
    // Rate limiting check
    if (!rateLimitingService.isAllowed('share_action')) {
      toastService.error("Too Many Shares", "Please wait before sharing again");
      return;
    }

    try {
      const message = `Pay me ${amount} RWF via Mobile Money. Use this link: ${paymentLink}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      cloudFunctions.logShareEvent('whatsapp');
      analyticsService.trackShare('whatsapp', parseFloat(amount) || 0);
      toastService.info("Sharing via WhatsApp", "Opening WhatsApp...");
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'whatsapp_share', { amount });
      toastService.error("Share Failed", "Could not open WhatsApp");
    }
  };

  const shareViaSMS = (amount: string, paymentLink: string) => {
    // Rate limiting check
    if (!rateLimitingService.isAllowed('share_action')) {
      toastService.error("Too Many Shares", "Please wait before sharing again");
      return;
    }

    try {
      const message = `Pay me ${amount} RWF via Mobile Money. Use this link: ${paymentLink}`;
      const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
      window.open(smsUrl, '_blank');
      
      cloudFunctions.logShareEvent('sms');
      analyticsService.trackShare('sms', parseFloat(amount) || 0);
      toastService.info("Sharing via SMS", "Opening SMS app...");
    } catch (error) {
      errorMonitoringService.logError(error as Error, 'sms_share', { amount });
      toastService.error("Share Failed", "Could not open SMS app");
    }
  };

  return {
    copyToClipboard,
    downloadQR,
    shareViaWhatsApp,
    shareViaSMS
  };
};
