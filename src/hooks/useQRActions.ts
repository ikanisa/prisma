
import { toast } from '@/hooks/use-toast';
import { cloudFunctions } from '@/services/cloudFunctions';

export const useQRActions = () => {
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const downloadQR = (qrResult: any, phone: string, amount: string) => {
    if (!qrResult?.qrCodeImage) return;
    
    const link = document.createElement('a');
    link.download = `payment-qr-${phone}-${amount}.png`;
    link.href = qrResult.qrCodeImage;
    link.click();
    
    toast({
      title: "Downloaded!",
      description: "QR code saved to your device",
    });
  };

  const shareViaWhatsApp = (amount: string, paymentLink: string) => {
    const message = `Pay me ${amount} RWF via Mobile Money. Use this link: ${paymentLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    cloudFunctions.logShareEvent('whatsapp');
  };

  const shareViaSMS = (amount: string, paymentLink: string) => {
    const message = `Pay me ${amount} RWF via Mobile Money. Use this link: ${paymentLink}`;
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
    
    cloudFunctions.logShareEvent('sms');
  };

  return {
    copyToClipboard,
    downloadQR,
    shareViaWhatsApp,
    shareViaSMS
  };
};
