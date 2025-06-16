import React from 'react';
import { X, Download, Share2, Copy, MessageCircle, Link } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
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
  const {
    copyToClipboard,
    downloadQR,
    shareViaWhatsApp,
    shareViaSMS
  } = useQRActions();

  // Generate the USSD string directly if we have phone and amount
  const ussdString = qrResult?.ussdString || (phone && amount ? `*182*1*1*${phone}*${amount}#` : '');
  const telUri = qrResult?.telUri || `tel:${encodeURIComponent(ussdString)}`;
  console.log('[QR Modal Debug]', {
    isOpen,
    qrResult,
    ussdString,
    telUri,
    phone,
    amount,
    hasQRResult: !!qrResult,
    qrResultKeys: qrResult ? Object.keys(qrResult) : [],
    qrCodeImage: qrResult?.qrCodeImage ? 'Present' : 'Missing'
  });
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
  const handleCopyUSSD = () => {
    copyToClipboard(ussdString, 'USSD code');
  };

  // Don't render if we don't have the minimum required data
  if (!isOpen || !ussdString && !qrResult) {
    return null;
  }
  return <Dialog open={isOpen} onOpenChange={onClose}>
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
              {qrResult?.qrCodeImage ? <img src={qrResult.qrCodeImage} alt="Payment QR Code" className="w-64 h-64 mx-auto rounded-lg" style={{
              maxWidth: '250px',
              maxHeight: '250px'
            }} /> : <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-500 text-sm">Generating QR Code...</p>
                  </div>
                </div>}
            </div>
            
            {/* Display the exact USSD string below QR */}
            <div className="mt-4 bg-gray-900 rounded-xl p-4">
              <p className="text-white font-mono break-all tracking-wide text-xs font-normal">
                {ussdString}
              </p>
            </div>
          </div>

          {/* Action Buttons - All four on one line */}
          <div className="grid grid-cols-4 gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadQR} className="flex items-center justify-center" disabled={!qrResult?.qrCodeImage}>
              <Download className="w-4 h-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleCopyUSSD} className="flex items-center justify-center">
              <Copy className="w-4 h-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex items-center justify-center">
              <Link className="w-4 h-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>

          {/* Share Options - Remove since WhatsApp is now in the main button row */}
          {paymentLink && <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                
                
                

                
              </div>
            </div>}
        </div>
      </DialogContent>
    </Dialog>;
};
export default QRCodeModal;