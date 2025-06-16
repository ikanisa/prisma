
import React from 'react';
import { X, Download, Share2, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import SmartQRCode from './SmartQRCode';
import USSDDialButton from './USSDDialButton';
import { useQRActions } from '@/hooks/useQRActions';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrResult: any;
  amount: string;
  phone: string;
  paymentLink: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  qrResult,
  amount,
  phone,
  paymentLink
}) => {
  const { copyToClipboard, downloadQR, shareViaWhatsApp, shareViaSMS } = useQRActions();

  if (!qrResult) return null;

  const ussdString = `*182*1*1*${phone}*${amount}#`;

  const handleDownloadQR = () => {
    downloadQR(qrResult, phone, amount);
  };

  const handleShareWhatsApp = () => {
    shareViaWhatsApp(amount, paymentLink);
  };

  const handleShareSMS = () => {
    shareViaSMS(amount, paymentLink);
  };

  const handleCopyLink = () => {
    copyToClipboard(paymentLink, 'Payment link');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Payment QR Code
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-4">
          {/* QR Code Display */}
          <div className="text-center">
            <div className="bg-white p-4 rounded-xl shadow-sm inline-block">
              <SmartQRCode 
                value={ussdString}
                alt="Payment QR Code"
                size={250}
                gradient="electric-ocean"
                className="mx-auto"
              />
            </div>
            
            {/* Display the exact USSD string below QR */}
            <div className="mt-4 bg-gray-900 rounded-xl p-4">
              <p className="text-white font-mono text-lg font-bold tracking-wider break-all">
                {ussdString}
              </p>
            </div>
          </div>

          {/* USSD Dial Section */}
          <div className="space-y-3">
            <h4 className="text-md font-semibold text-gray-800 text-center">
              Mobile Money Payment Code
            </h4>
            <USSDDialButton 
              ussdCode={ussdString}
              size="md"
              showCopy={true}
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleDownloadQR}
              className="flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
          </div>

          {/* Share Options */}
          {paymentLink && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={handleShareWhatsApp}
                  className="bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share via WhatsApp
                </Button>
                
                <Button
                  onClick={handleShareSMS}
                  variant="outline"
                  className="flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share via SMS
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeModal;
