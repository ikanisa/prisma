
import React, { useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OfflineBanner from './OfflineBanner';
import PaymentForm from './GetPaidScreen/PaymentForm';
import QRResult from './GetPaidScreen/QRResult';
import { usePaymentGeneration } from '@/hooks/usePaymentGeneration';
import { useQRActions } from '@/hooks/useQRActions';

const GetPaidScreen = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const {
    phone,
    amount,
    isGenerating,
    qrResult,
    paymentLink,
    amountInteracted,
    showPhoneLabel,
    phoneInteracted,
    handlePhoneChange,
    handlePhoneFocus,
    handleAmountChange,
    handleAmountFocus,
    generateQR
  } = usePaymentGeneration();

  const { copyToClipboard, downloadQR, shareViaWhatsApp, shareViaSMS } = useQRActions();

  const handleCopyUSSD = () => copyToClipboard(qrResult.ussdString, "USSD Code");
  const handleDownloadQR = () => downloadQR(qrResult, phone, amount);
  const handleShareWhatsApp = () => shareViaWhatsApp(amount, paymentLink);
  const handleShareSMS = () => shareViaSMS(amount, paymentLink);
  const handleCopyLink = () => copyToClipboard(paymentLink, "Payment Link");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <OfflineBanner />
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b border-blue-200/50">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Get Paid</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* Payment Form */}
        <PaymentForm
          phone={phone}
          amount={amount}
          isGenerating={isGenerating}
          amountInteracted={amountInteracted}
          showPhoneLabel={showPhoneLabel}
          phoneInteracted={phoneInteracted}
          onPhoneChange={handlePhoneChange}
          onPhoneFocus={handlePhoneFocus}
          onAmountChange={handleAmountChange}
          onAmountFocus={handleAmountFocus}
          onGenerateQR={generateQR}
        />

        {/* QR Result */}
        <QRResult
          qrResult={qrResult}
          paymentLink={paymentLink}
          onCopyUSSD={handleCopyUSSD}
          onDownloadQR={handleDownloadQR}
          onShareWhatsApp={handleShareWhatsApp}
          onShareSMS={handleShareSMS}
          onCopyLink={handleCopyLink}
        />
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default GetPaidScreen;
