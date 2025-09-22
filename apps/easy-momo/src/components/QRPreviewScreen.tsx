import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import FloatingBadge from './FloatingBadge';
import { addQRCode, getRecentQRCodes, isSimulateOffline } from '@/utils/offlineCache';

const QRPreviewScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  
  const amount = searchParams.get('amount') || '';
  const phone = searchParams.get('phone') || '';
  const ussdCode = `*182*1*1*${phone}*${amount}#`;

  // Format amount with commas
  const formatAmount = (value: string) => {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formattedAmount = formatAmount(amount);

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
    const shareText = `Payment Request: ${formattedAmount} RWF to ${phone}\nUSSD Code: ${ussdCode}`;

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
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 1200);
  };

  const offline = !navigator.onLine || isSimulateOffline();

  useEffect(() => {
    // Generate/save QR to cache for offline revisit
    if (amount && phone) {
      const qrObj = {
        phone,
        amount,
        ussdString: ussdCode,
        qrDataUrl,
        timestamp: Date.now()
      };
      addQRCode(qrObj);
    }
  }, [qrDataUrl]);

  let displayQR = qrDataUrl;
  let displayAmount = formattedAmount;
  let displayPhone = phone;
  let displayUSSD = ussdCode;

  if (offline && !qrDataUrl) {
    const cached = getRecentQRCodes()[0];
    if (cached) {
      displayQR = cached.qrDataUrl ?? "";
      displayAmount = cached.amount;
      displayPhone = cached.phone;
      displayUSSD = cached.ussdString;
    }
  }

  return (
    <div className="min-h-screen h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900 flex flex-col">
      <div className="flex-1 flex flex-col justify-between container mx-auto px-2 py-3 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 mt-1">
          <button
            onClick={() => navigate('/get-paid')}
            className="glass-card p-2 hover:scale-110 transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
            style={{ minWidth: 40 }}
            aria-label="Back to Get Paid screen"
            tabIndex={0}
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" focusable="false" />
            <span className="sr-only">Back</span>
          </button>
          <h1 className="text-lg font-bold text-gray-800 dark:text-white text-center">
            Payment QR Code
          </h1>
          <div style={{ width: 40 }}></div>
        </div>
        
        {/* QR Code Display */}
        <div className="glass-card flex flex-col items-center p-4 mb-2 min-h-fit animate-fade-in">
          {displayQR ? (
            <div className="space-y-2 flex flex-col items-center justify-center">
              <div className="bg-white p-2 rounded-2xl inline-block qr-glow max-w-full flex items-center justify-center" style={{ width: '320px', height: '320px' }}>
                <img 
                  src={displayQR} 
                  alt="Payment QR Code"
                  className="rounded-xl shadow-lg"
                  style={{ width: '288px', height: '288px', objectFit: 'contain' }}
                  loading="lazy"
                  tabIndex={0}
                  aria-label="Payment QR Code"
                />
              </div>
              <h2 className="text-base font-bold text-gray-800 dark:text-white mt-1">
                Pay {displayAmount} RWF
              </h2>
            </div>
          ) : (
            <div className="py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">Generating QR code...</p>
            </div>
          )}
        </div>

        {/* USSD Code Display - Responsive */}
        <div className="glass-card p-2 sm:p-3 text-center mb-2" aria-live="polite">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white mb-1">
            USSD Payment Code:
          </h3>
          <button
            onClick={copyToClipboard}
            className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-lg font-mono font-bold hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400 transition-transform flex items-center space-x-2 mx-auto break-all min-h-[32px]"
            aria-label={`Copy USSD code ${ussdCode}`}
            tabIndex={0}
          >
            <span className="break-all">{ussdCode}</span>
            <Copy className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" aria-hidden="true" focusable="false" />
            <span className="sr-only">Copy Code</span>
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Tap to copy • Dial this code to pay
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-1">
          <button
            onClick={saveQRCode}
            className="btn-secondary ripple flex items-center justify-center space-x-1 py-2 text-xs focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
            aria-label="Save QR code"
            tabIndex={0}
          >
            <Download className="w-5 h-5" aria-hidden="true" focusable="false" />
            <span>Save QR</span>
          </button>

          <button
            onClick={shareQRCode}
            className="btn-primary ripple flex items-center justify-center space-x-1 py-2 text-xs focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
            aria-label="Share payment QR code"
            tabIndex={0}
          >
            <Share2 className="w-5 h-5" aria-hidden="true" focusable="false" />
            <span>Share QR</span>
          </button>
        </div>
      </div>
      {showCopied && <FloatingBadge label="Copied!" />}
      {offline && (
        <div className="bg-yellow-100 border-t border-yellow-400 text-yellow-900 p-2 text-center text-sm rounded-b-xl">
          <span role="img" aria-label="offline" className="mr-1">📴</span>
          You’re offline – displaying most recent QR. Some actions may be limited.
        </div>
      )}
    </div>
  );
};

export default QRPreviewScreen;
