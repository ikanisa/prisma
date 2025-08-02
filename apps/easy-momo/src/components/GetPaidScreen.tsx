
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
    <div className="relative min-h-screen w-full flex flex-col safe-area-top safe-area-bottom">
      <div className="flex-1 flex flex-col justify-start container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-md">
        <div className="flex items-center justify-between mb-6 sm:mb-8 mt-1 sm:mt-2 animate-fade-in" style={{ animationDuration: '5s' }}>
          <button
            onClick={() => navigate('/')}
            className="logo-glass p-2 sm:p-3 md:p-4 hover:scale-110 active:scale-95 transition-all duration-3000 rounded-xl sm:rounded-2xl mobile-button tap-highlight-transparent min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Go to home screen"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white dark:text-gray-200 animate-fade-in px-2 text-center flex-1 loader-text" style={{ animationDuration: '5s', animationDelay: '1s' }}>Get Paid</h1>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="logo-glass p-2 sm:p-3 md:p-4 hover:scale-110 active:scale-95 transition-all duration-3000 rounded-xl sm:rounded-2xl mobile-button tap-highlight-transparent min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Payment History"
            aria-label="View payment history"
          >
            <History className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex-1 animate-fade-in">
          {showHistory ? (
            <div className="animate-slide-down">
              <PaymentRequestHistory />
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8 animate-slide-up">
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

              {(qrResult || paymentLink) && (
                <div className="animate-bounce-in px-2 sm:px-0">
                  <button
                    onClick={() => setShowShareSheet(true)}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 active:from-blue-700 active:to-purple-800 text-white rounded-xl sm:rounded-2xl py-4 sm:py-5 px-4 sm:px-6 font-bold flex items-center justify-center gap-2 sm:gap-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mobile-button tap-highlight-transparent ring-4 ring-blue-500/20 hover:ring-blue-500/30 min-h-[56px]"
                    aria-label="Share payment request"
                  >
                    <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-base sm:text-lg">Share Payment Request</span>
                  </button>
                </div>
              )}

              <div className="pb-6 sm:pb-8"></div>
            </div>
          )}
        </div>
      </div>

      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        qrResult={qrResult}
        amount={amount}
        phone={phone}
        paymentLink={paymentLink}
      />

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

      <PaymentConfirmationModal
        isVisible={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        transactionId={undefined}
        amount={amount}
        phone={phone}
        ussdString={ussdString}
      />

      <PWAInstallBanner />
    </div>
  );
};

export default GetPaidScreen;
