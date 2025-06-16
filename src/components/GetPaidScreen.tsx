
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
    showPhoneLabel,
    phoneInteracted,
    handlePhoneChange,
    handlePhoneFocus,
    handleAmountChange,
    handleAmountFocus,
    generateQR
  } = usePaymentGeneration();

  const { copyToClipboard, downloadQR, shareViaWhatsApp, shareViaSMS } = useQRActions();

  const handleSelectContact = (selectedPhone: string) => {
    handlePhoneChange({ target: { value: selectedPhone } } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleGenerateQR = async () => {
    try {
      // Generate QR code directly without redundant payment request creation
      const qrData = await generateQR();
      
      // Show QR modal immediately after successful generation
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col relative">
      <div className="flex-1 flex flex-col justify-start container mx-auto px-4 py-4 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 mt-2">
          <button
            onClick={() => navigate(-1)}
            className="glass-card p-3 hover:scale-110 transition-transform rounded-2xl"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Get Paid</h1>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="glass-card p-3 hover:scale-110 transition-transform rounded-2xl"
            title="Payment History"
          >
            <History className="w-6 h-6" />
          </button>
        </div>

        {/* Conditional Content */}
        {showHistory ? (
          <PaymentRequestHistory />
        ) : (
          <div className="space-y-6">
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
              onGenerateQR={handleGenerateQR}
            />

            {/* Share Button - only show if QR has been generated */}
            {(qrResult || paymentLink) && (
              <button
                onClick={() => setShowShareSheet(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl py-4 px-6 font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Share2 className="w-5 h-5" />
                Share Payment Request
              </button>
            )}
          </div>
        )}
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
