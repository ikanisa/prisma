
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabaseService } from '@/services/supabaseService';
import QRCode from 'qrcode';

const SharedPaymentPage = () => {
  const { linkToken } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (linkToken) {
      loadSharedPayment();
    }
  }, [linkToken]);

  const loadSharedPayment = async () => {
    try {
      setLoading(true);
      const data = await supabaseService.getSharedLink(linkToken!);
      setPaymentData(data);
      
      // Generate USSD string (same logic as backend)
      const ussdString = `*182*1*1*${data.phone_number}*${data.amount}#`;
      
      // Generate QR code
      const qrData = await QRCode.toDataURL(ussdString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
      setQrDataUrl(qrData);
      
    } catch (err) {
      console.error('Failed to load shared payment:', err);
      setError('Payment link not found or expired');
    } finally {
      setLoading(false);
    }
  };

  const copyUSSD = () => {
    if (paymentData) {
      const ussdString = `*182*1*1*${paymentData.phone_number}*${paymentData.amount}#`;
      navigator.clipboard.writeText(ussdString);
      toast({
        title: "Copied!",
        description: "USSD code copied to clipboard",
      });
    }
  };

  const openDialer = () => {
    if (paymentData) {
      const ussdString = `*182*1*1*${paymentData.phone_number}*${paymentData.amount}#`;
      window.location.href = `tel:${encodeURIComponent(ussdString)}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Link Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary px-6 py-3"
          >
            Go to App
          </button>
        </div>
      </div>
    );
  }

  const formatAmount = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col">
      <div className="flex-1 flex flex-col justify-center container mx-auto px-4 py-8 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="glass-card p-3 hover:scale-110 transition-transform"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Payment Request</h1>
          <div style={{ width: 48 }}></div>
        </div>

        {/* Payment Details */}
        <div className="glass-card p-6 mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Pay {formatAmount(paymentData.amount)} RWF
          </h2>
          <p className="text-gray-600">
            To: {paymentData.phone_number}
          </p>
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="glass-card p-6 mb-6 flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl mb-4">
              <img 
                src={qrDataUrl} 
                alt="Payment QR Code"
                className="w-64 h-64"
              />
            </div>
            <p className="text-sm text-gray-600 text-center">
              Scan this QR code with your mobile money app
            </p>
          </div>
        )}

        {/* USSD Code */}
        <div className="glass-card p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-2 text-center">
            Or dial this code:
          </h3>
          <button
            onClick={copyUSSD}
            className="w-full bg-gray-900 text-white px-4 py-3 rounded-xl text-lg font-mono font-bold hover:scale-105 transition-transform flex items-center justify-center space-x-2"
          >
            <span>*182*1*1*{paymentData.phone_number}*{paymentData.amount}#</span>
            <Copy className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={copyUSSD}
            className="btn-secondary flex items-center justify-center space-x-2 py-3"
          >
            <Copy className="w-5 h-5" />
            <span>Copy Code</span>
          </button>
          <button
            onClick={openDialer}
            className="btn-primary flex items-center justify-center space-x-2 py-3"
          >
            <ExternalLink className="w-5 h-5" />
            <span>Open Dialer</span>
          </button>
        </div>

        {/* Expiry Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            This payment link expires in 24 hours
          </p>
        </div>
      </div>
    </div>
  );
};

export default SharedPaymentPage;
