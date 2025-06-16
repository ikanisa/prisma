
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

  const ussdString = `*182*1*1*${paymentData.phone_number}*${paymentData.amount}#`;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 flex flex-col justify-center container mx-auto px-4 py-8 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 text-white">
          <button
            onClick={() => navigate('/')}
            className="p-3 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold">Universal QR Scanner</h1>
            <p className="text-sm text-gray-300">Scan any mobile money QR code</p>
          </div>
          <div style={{ width: 48 }}></div>
        </div>

        {/* Success Card */}
        <div className="bg-green-600/20 border border-green-500/30 rounded-2xl p-6 mb-6 text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-yellow-400 text-2xl font-bold mb-2">USSD Code Detected</h2>
          <p className="text-green-300 text-sm">Ready to launch payment</p>
        </div>

        {/* Scanned Code Display */}
        <div className="bg-white/10 rounded-lg p-4 mb-6 backdrop-blur-sm">
          <p className="text-gray-300 text-sm mb-2 text-center">Scanned Code:</p>
          <p className="text-blue-300 font-mono text-xl text-center break-all font-bold">
            {ussdString}
          </p>
        </div>

        {/* Pay Button */}
        <button
          onClick={openDialer}
          className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 text-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] mb-4"
          style={{ minHeight: '64px' }}
        >
          Pay
        </button>

        {/* Copy Button */}
        <button
          onClick={copyUSSD}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-xl text-base font-semibold transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <Copy className="w-5 h-5" />
          <span>Copy Code</span>
        </button>

        {/* Expiry Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            This payment link expires in 24 hours
          </p>
        </div>
      </div>
    </div>
  );
};

export default SharedPaymentPage;
