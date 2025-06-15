
import React from 'react';
import { Copy, Download, Send, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface QRResultProps {
  qrResult: any;
  paymentLink: string;
  onCopyUSSD: () => void;
  onDownloadQR: () => void;
  onShareWhatsApp: () => void;
  onShareSMS: () => void;
  onCopyLink: () => void;
}

const QRResult: React.FC<QRResultProps> = ({
  qrResult,
  paymentLink,
  onCopyUSSD,
  onDownloadQR,
  onShareWhatsApp,
  onShareSMS,
  onCopyLink
}) => {
  if (!qrResult) return null;

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-blue-200/50">
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Payment QR Code
          </h3>
          <div className="bg-white p-4 rounded-xl shadow-sm inline-block">
            <img 
              src={qrResult.qrCodeImage} 
              alt="Payment QR Code"
              className="w-48 h-48 mx-auto"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={onCopyUSSD}
            className="flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy USSD
          </Button>
          
          <Button
            variant="outline"
            onClick={onDownloadQR}
            className="flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
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
                onClick={onShareWhatsApp}
                className="bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Share via WhatsApp
              </Button>
              
              <Button
                onClick={onShareSMS}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Share via SMS
              </Button>
              
              <Button
                variant="outline"
                onClick={onCopyLink}
                className="flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRResult;
