import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle, Phone, QrCode, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabaseService } from '@/services/supabaseService';
import { toast } from '@/hooks/use-toast';

interface PaymentRecord {
  id: string;
  phone_number: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  type: 'payment' | 'qr';
  ussd_string?: string;
}

const PaymentHistory = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [qrHistory, setQrHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payments' | 'qr'>('payments');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const [paymentsData, qrData] = await Promise.all([
        supabaseService.getRecentPayments(),
        supabaseService.getRecentQRCodes()
      ]);
      
      // Map payments data to include type field
      const mappedPayments: PaymentRecord[] = paymentsData.map(payment => ({
        ...payment,
        type: 'payment' as const,
        status: payment.status === 'sent' ? 'completed' : payment.status === 'confirmed' ? 'completed' : 'pending'
      }));

      // Map QR data to include type field and match PaymentRecord structure
      const mappedQRHistory: PaymentRecord[] = qrData.map(qr => ({
        id: qr.id,
        phone_number: qr.phone_number,
        amount: qr.amount,
        status: 'completed' as const,
        created_at: qr.created_at,
        type: 'qr' as const,
        ussd_string: qr.ussd_string
      }));
      
      setPayments(mappedPayments);
      setQrHistory(mappedQRHistory);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast({
        title: "Loading Failed",
        description: "Could not load payment history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const copyUSSD = (ussdString: string) => {
    navigator.clipboard.writeText(ussdString);
    toast({
      title: "Copied!",
      description: "USSD code copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="glass-card p-3 hover:scale-110 transition-transform"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Payment History</h1>
          <div style={{ width: 48 }}></div>
        </div>

        {/* Tabs */}
        <div className="glass-card p-1 mb-6">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'payments'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-purple-50'
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'qr'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-purple-50'
              }`}
            >
              QR History
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'payments' ? (
          <div className="space-y-4">
            {payments.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Payments Yet</h3>
                <p className="text-gray-500">Your payment history will appear here</p>
              </div>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(payment.status)}
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {formatAmount(payment.amount)} RWF
                        </h3>
                        <p className="text-sm text-gray-600">To: {payment.phone_number}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(payment.created_at)}
                    </span>
                  </div>
                  {payment.ussd_string && (
                    <button
                      onClick={() => copyUSSD(payment.ussd_string!)}
                      className="w-full bg-gray-100 text-gray-800 px-3 py-2 rounded-lg text-sm font-mono hover:bg-gray-200 transition-colors"
                    >
                      {payment.ussd_string}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {qrHistory.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No QR History</h3>
                <p className="text-gray-500">Your QR code history will appear here</p>
              </div>
            ) : (
              qrHistory.map((qr) => (
                <div key={qr.id} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <QrCode className="w-5 h-5 text-purple-600" />
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {formatAmount(qr.amount)} RWF
                        </h3>
                        <p className="text-sm text-gray-600">{qr.phone_number}</p>
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                          Generated
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(qr.created_at)}
                    </span>
                  </div>
                  {qr.ussd_string && (
                    <button
                      onClick={() => copyUSSD(qr.ussd_string!)}
                      className="w-full bg-gray-100 text-gray-800 px-3 py-2 rounded-lg text-sm font-mono hover:bg-gray-200 transition-colors"
                    >
                      {qr.ussd_string}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
