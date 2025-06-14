
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

const QRPreviewScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [qrDataUrl, setQrDataUrl] = useState('');
  
  const amount = searchParams.get('amount') || '';
  const phone = searchParams.get('phone') || '';
  const ussdCode = `*182*1*1*${phone}*${amount}#`;

  useEffect(() => {
    generateQRCode();
  }, [amount, phone]);

  const generateQRCode = async () => {
    try {
      const qrData = await QRCode.toDataURL(ussdCode, {
        width: 400,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
      setQrDataUrl(qrData);
    } catch (error) {
      console.error('QR Code generation failed:', error);
      toast({
        title: "QR Generation Failed",
        description: "Unable to generate QR code",
        variant: "destructive"
      });
    }
  };

  const saveQRCode = async () => {
    if (!qrDataUrl) return;

    try {
      const link = document.createElement('a');
      link.download = `payment-qr-${amount}-${phone}.png`;
      link.href = qrDataUrl;
      link.click();
      
      toast({
        title: "QR Code Saved!",
        description: "QR code downloaded to your device",
      });
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const shareQRCode = async () => {
    const shareText = `Payment Request: ${amount} UGX to ${phone}\nUSSD Code: ${ussdCode}`;

    if (navigator.share) {
      try {
        // Convert data URL to blob for sharing
        const response = await fetch(qrDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `payment-qr-${amount}.png`, { type: 'image/png' });

        await navigator.share({
          title: 'Payment QR Code',
          text: shareText,
          files: [file]
        });
      } catch (error) {
        // Fallback to text sharing
        try {
          await navigator.share({
            title: 'Payment Request',
            text: shareText
          });
        } catch (fallbackError) {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ussdCode);
    toast({
      title: "USSD Code Copied!",
      description: "Payment code copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/get-paid')}
            className="glass-card p-3 hover:scale-110 transition-transform"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Payment QR Code
          </h1>
          
          <div className="w-12"></div>
        </div>

        <div className="max-w-md mx-auto">
          
          {/* QR Code Display */}
          <div className="glass-card p-8 text-center mb-8">
            {qrDataUrl ? (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl inline-block qr-glow">
                  <img 
                    src={qrDataUrl} 
                    alt="Payment QR Code"
                    className="w-full max-w-xs mx-auto"
                  />
                </div>
                
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    Pay {amount} UGX to {phone}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Scan this QR code to get the payment details
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-4">Generating QR code...</p>
              </div>
            )}
          </div>

          {/* USSD Code Display */}
          <div className="glass-card p-6 text-center mb-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
              USSD Payment Code:
            </h3>
            <button
              onClick={copyToClipboard}
              className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-6 py-3 rounded-2xl text-xl font-mono font-bold hover:scale-105 transition-transform flex items-center space-x-2 mx-auto"
            >
              <span>{ussdCode}</span>
              <Copy className="w-5 h-5" />
            </button>
            <p className="text-sm text-gray-500 mt-3">
              Tap to copy • Dial this code to complete payment
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={saveQRCode}
              className="btn-secondary ripple flex items-center justify-center space-x-2"
            >
              <Download className="w-6 h-6" />
              <span>Save QR</span>
            </button>

            <button
              onClick={shareQRCode}
              className="btn-primary ripple flex items-center justify-center space-x-2"
            >
              <Share2 className="w-6 h-6" />
              <span>Share QR</span>
            </button>
          </div>

          {/* Instructions */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
              Instructions for Payer:
            </h3>
            <div className="space-y-2 text-gray-600 dark:text-gray-400">
              <p>1. Scan the QR code with any camera app</p>
              <p>2. Copy the USSD code that appears</p>
              <p>3. Dial the code on your phone</p>
              <p>4. Follow your mobile money prompts</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default QRPreviewScreen;
