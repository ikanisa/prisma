
import React from 'react';
import { Copy, Download, Send, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { useQRActions } from '@/hooks/useQRActions';
import USSDDialButton from '../USSDDialButton';
import SmartQRCode from '../SmartQRCode';

interface QRResultProps {
  qrResult: any;
  amount: string;
  phone: string;
  paymentLink: string;
}

const QRResult: React.FC<QRResultProps> = ({
  qrResult,
  amount,
  phone,
  paymentLink
}) => {
  const { copyToClipboard, downloadQR, shareViaWhatsApp, shareViaSMS } = useQRActions();

  if (!qrResult) return null;

  // Ensure USSD string follows exact format: *182*1*1*{phone}*{amount}#
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
    <Card className="bg-white/90 backdrop-blur-sm border-blue-200/50">
      <CardContent className="p-6 space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Payment QR Code
          </h3>
          <div className="bg-white p-4 rounded-xl shadow-sm inline-block">
            <SmartQRCode 
              value={ussdString}
              alt="Payment QR Code"
              size={200}
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
            Download QR
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
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">Payment link created</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={handleShareWhatsApp}
                className="bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Share via WhatsApp
              </Button>
              
              <Button
                onClick={handleShareSMS}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Share via SMS
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRResult;
