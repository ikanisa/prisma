
import React, { useState } from 'react';
import { ArrowLeft, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PaymentForm from './GetPaidScreen/PaymentForm';
import QRResult from './GetPaidScreen/QRResult';
import RecentContacts from './RecentContacts';
import PaymentConfirmation from './PaymentConfirmation';
import PaymentRequestHistory from './PaymentRequestHistory';
import { usePaymentGeneration } from '@/hooks/usePaymentGeneration';
import { usePaymentRequests } from '@/hooks/usePaymentRequests';

const GetPaidScreen = () => {
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
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

  const { createPaymentRequest } = usePaymentRequests();

  const handleSelectContact = (selectedPhone: string) => {
    handlePhoneChange({ target: { value: selectedPhone } } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleGenerateQR = async () => {
    // Create payment request in database
    await createPaymentRequest(phone, parseFloat(amount));
    
    // Generate QR code
    await generateQR();
    
    // Show confirmation modal after successful generation
    if (qrResult || paymentLink) {
      setShowConfirmation(true);
    }
  };

  const ussdString = qrResult?.ussdString || (phone && amount ? `*182*1*1*${phone}*${amount}#` : '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col">
      <div className="flex-1 flex flex-col justify-center container mx-auto px-4 py-8 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="glass-card p-3 hover:scale-110 transition-transform"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Get Paid</h1>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="glass-card p-3 hover:scale-110 transition-transform"
            title="Payment History"
          >
            <History className="w-6 h-6" />
          </button>
        </div>

        {/* Conditional Content */}
        {showHistory ? (
          <PaymentRequestHistory />
        ) : (
          <>
            {/* Recent Contacts */}
            <RecentContacts 
              onSelectContact={handleSelectContact}
              currentPhone={phone}
            />

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

            {/* QR Result */}
            {(qrResult || paymentLink) && (
              <QRResult
                qrResult={qrResult}
                amount={amount}
                phone={phone}
                paymentLink={paymentLink}
              />
            )}
          </>
        )}

        {/* Payment Confirmation Modal */}
        <PaymentConfirmation
          isVisible={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          paymentData={{
            amount,
            phone,
            qrResult,
            paymentLink,
            ussdString
          }}
        />
      </div>
    </div>
  );
};

export default GetPaidScreen;
