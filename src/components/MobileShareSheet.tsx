
import React from 'react';
import { Share2, MessageCircle, Mail, Copy, Download, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface MobileShareSheetProps {
  isVisible: boolean;
  onClose: () => void;
  paymentData: {
    amount: string;
    phone: string;
    paymentLink: string;
    ussdString: string;
  };
  onShare: (method: string) => void;
  onCopy: () => void;
  onDownload: () => void;
}

const MobileShareSheet: React.FC<MobileShareSheetProps> = ({
  isVisible,
  onClose,
  paymentData,
  onShare,
  onCopy,
  onDownload
}) => {
  if (!isVisible) return null;

  const shareOptions = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500',
      action: () => onShare('whatsapp')
    },
    {
      id: 'sms',
      label: 'SMS',
      icon: Mail,
      color: 'bg-blue-500',
      action: () => onShare('sms')
    },
    {
      id: 'copy',
      label: 'Copy Link',
      icon: Copy,
      color: 'bg-gray-500',
      action: onCopy
    },
    {
      id: 'download',
      label: 'Download QR',
      icon: Download,
      color: 'bg-purple-500',
      action: onDownload
    }
  ];

  const message = `Pay me ${paymentData.amount} RWF via Mobile Money.\n\nUSSD Code: ${paymentData.ussdString}\n\nOr use this link: ${paymentData.paymentLink}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 mb-4 bg-white shadow-2xl border-0 rounded-t-3xl overflow-hidden animate-slide-up">
        <CardHeader className="text-center py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div></div>
            <CardTitle className="text-lg font-semibold">Share Payment</CardTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {paymentData.amount} RWF to {paymentData.phone}
          </p>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Preview Message */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>

          {/* Share Options Grid */}
          <div className="grid grid-cols-2 gap-4">
            {shareOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <Button
                  key={option.id}
                  onClick={option.action}
                  variant="outline"
                  className="flex flex-col items-center gap-3 h-20 hover:scale-105 transition-transform border-gray-200 hover:border-gray-300"
                >
                  <div className={`w-8 h-8 rounded-full ${option.color} flex items-center justify-center`}>
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">{option.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Native Share Button (if supported) */}
          {navigator.share && (
            <Button
              onClick={() => {
                navigator.share({
                  title: 'Mobile Money Payment',
                  text: message,
                  url: paymentData.paymentLink
                });
              }}
              className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl py-3"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share via System
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileShareSheet;
