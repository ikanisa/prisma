
import React from 'react';
import { CheckCircle, Copy, Share2, Download, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PaymentConfirmationProps {
  isVisible: boolean;
  onClose: () => void;
  paymentData: {
    amount: string;
    phone: string;
    qrResult?: any;
    paymentLink?: string;
    ussdString?: string;
  };
}

const PaymentConfirmation = ({ isVisible, onClose, paymentData }: PaymentConfirmationProps) => {
  if (!isVisible) return null;

  const { amount, phone, qrResult, paymentLink, ussdString } = paymentData;

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

  const downloadQR = () => {
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

  const shareViaWhatsApp = () => {
    const message = `Pay me ${amount} RWF via Mobile Money. Use this link: ${paymentLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaSMS = () => {
    const message = `Pay me ${amount} RWF via Mobile Money. Use this link: ${paymentLink}`;
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
  };

  const openDialer = () => {
    if (ussdString) {
      window.location.href = `tel:${encodeURIComponent(ussdString)}`;
    }
  };

  const formatAmount = (amount: string) => {
    return parseInt(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-t-2xl text-white text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-2">Payment Request Created!</h2>
          <p className="text-green-100">
            Request for {formatAmount(amount)} RWF to {phone}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* QR Code */}
          {qrResult?.qrCodeImage && (
            <div className="text-center">
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 inline-block mb-4">
                <img 
                  src={qrResult.qrCodeImage} 
                  alt="Payment QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code with any mobile money app
              </p>
            </div>
          )}

          {/* USSD Code */}
          {ussdString && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">USSD Code:</label>
              <button
                onClick={() => copyToClipboard(ussdString, 'USSD code')}
                className="w-full bg-gray-900 text-white px-4 py-3 rounded-xl text-lg font-mono font-bold hover:scale-105 transition-transform flex items-center justify-center space-x-2"
              >
                <span>{ussdString}</span>
                <Copy className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Payment Link */}
          {paymentLink && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Payment Link:</label>
              <button
                onClick={() => copyToClipboard(paymentLink, 'Payment link')}
                className="w-full bg-blue-50 border-2 border-blue-200 text-blue-800 px-4 py-3 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center space-x-2 text-sm"
              >
                <span className="truncate">{paymentLink}</span>
                <Copy className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            {qrResult?.qrCodeImage && (
              <button
                onClick={downloadQR}
                className="btn-secondary flex items-center justify-center space-x-2 py-3"
              >
                <Download className="w-5 h-5" />
                <span>Download</span>
              </button>
            )}
            
            {paymentLink && (
              <button
                onClick={shareViaWhatsApp}
                className="bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Share2 className="w-5 h-5" />
                <span>WhatsApp</span>
              </button>
            )}
            
            {paymentLink && (
              <button
                onClick={shareViaSMS}
                className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Share2 className="w-5 h-5" />
                <span>SMS</span>
              </button>
            )}
            
            {ussdString && (
              <button
                onClick={openDialer}
                className="bg-purple-600 text-white px-4 py-3 rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-5 h-5" />
                <span>Dial</span>
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full btn-secondary py-3 mt-6"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
