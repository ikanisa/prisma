
import React, { useState } from 'react';
import { ArrowLeft, History, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PaymentForm from './GetPaidScreen/PaymentForm';
import QRCodeModal from './QRCodeModal';
import RecentContacts from './RecentContacts';
import PaymentConfirmationModal from './PaymentConfirmationModal';
import MobileShareSheet from './MobileShareSheet';
import PWAInstallBanner from './PWAInstallBanner';
import PaymentRequestHistory from './PaymentRequestHistory';
import { usePaymentGeneration } from '@/hooks/usePaymentGeneration';
import { useQRActions } from '@/hooks/useQRActions';

const GetPaidScreen = () => {
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  
  const {
    phone,
    amount,
    isGenerating,
    qrResult,
    paymentLink,
    amountInteracted,
    phoneInteracted,
    handlePhoneChange,
    handlePhoneFocus,
    handleAmountChange,
    handleAmountFocus,
    generateQR,
    validatePhone,
    validateAmount
  } = usePaymentGeneration();

  const { copyToClipboard, downloadQR, shareViaWhatsApp, shareViaSMS } = useQRActions();

  const handleGenerateQR = async () => {
    try {
      const qrData = await generateQR();
      
      if (qrData) {
        console.log('[GetPaidScreen] QR generated successfully, showing modal', qrData);
        setShowQRModal(true);
      }
    } catch (error) {
      console.error('Failed to generate QR:', error);
    }
  };

  const handleShare = (method: string) => {
    setShowShareSheet(false);
    
    switch (method) {
      case 'whatsapp':
        shareViaWhatsApp(amount, paymentLink);
        break;
      case 'sms':
        shareViaSMS(amount, paymentLink);
        break;
      default:
        break;
    }
  };

  const handleCopyLink = () => {
    setShowShareSheet(false);
    copyToClipboard(paymentLink, 'Payment link');
  };

  const handleDownloadQR = () => {
    setShowShareSheet(false);
    downloadQR(qrResult, phone, amount);
  };

  const ussdString = qrResult?.ussdString || (phone && amount ? `*182*1*1*${phone}*${amount}#` : '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col relative safe-area-top safe-area-bottom">
      {/* Mobile-optimized container */}
      <div className="flex-1 flex flex-col justify-start container mx-auto px-4 py-6 max-w-md">
        {/* Enhanced Header with better spacing */}
        <div className="flex items-center justify-between mb-8 mt-2 animate-fade-in">
          <button
            onClick={() => navigate(-1)}
            className="glass-card p-4 hover:scale-110 active:scale-95 transition-all duration-200 rounded-2xl mobile-button tap-highlight-transparent"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 animate-fade-in">Get Paid</h1>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="glass-card p-4 hover:scale-110 active:scale-95 transition-all duration-200 rounded-2xl mobile-button tap-highlight-transparent"
            title="Payment History"
            aria-label="View payment history"
          >
            <History className="w-6 h-6" />
          </button>
        </div>

        {/* Conditional Content with smooth transitions */}
        <div className="flex-1 animate-fade-in">
          {showHistory ? (
            <div className="animate-slide-down">
              <PaymentRequestHistory />
            </div>
          ) : (
            <div className="space-y-8 animate-slide-up">
              {/* Payment Form with enhanced mobile styling */}
              <PaymentForm
                phone={phone}
                amount={amount}
                isGenerating={isGenerating}
                amountInteracted={amountInteracted}
                phoneInteracted={phoneInteracted}
                onPhoneChange={handlePhoneChange}
                onPhoneFocus={handlePhoneFocus}
                onAmountChange={handleAmountChange}
                onAmountFocus={handleAmountFocus}
                onGenerateQR={handleGenerateQR}
                validatePhone={validatePhone}
                validateAmount={validateAmount}
              />

              {/* Enhanced Share Button - only show if QR has been generated */}
              {(qrResult || paymentLink) && (
                <div className="animate-bounce-in">
                  <button
                    onClick={() => setShowShareSheet(true)}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 active:from-blue-700 active:to-purple-800 text-white rounded-2xl py-5 px-6 font-bold flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mobile-button tap-highlight-transparent ring-4 ring-blue-500/20 hover:ring-blue-500/30"
                    aria-label="Share payment request"
                  >
                    <Share2 className="w-6 h-6" />
                    <span className="text-lg">Share Payment Request</span>
                  </button>
                </div>
              )}

              {/* Mobile spacing optimization */}
              <div className="pb-8"></div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrResult={qrResult}
        amount={amount}
        phone={phone}
        paymentLink={paymentLink}
      />

      {/* Mobile Share Sheet */}
      <MobileShareSheet
        isVisible={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        paymentData={{
          amount,
          phone,
          paymentLink,
          ussdString
        }}
        onShare={handleShare}
        onCopy={handleCopyLink}
        onDownload={handleDownloadQR}
      />

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isVisible={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        transactionId={undefined}
        amount={amount}
        phone={phone}
        ussdString={ussdString}
      />

      {/* PWA Install Banner */}
      <PWAInstallBanner />
    </div>
  );
};

export default GetPaidScreen;
