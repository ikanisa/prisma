
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Link } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const GetPaidScreen = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [showAmountLabel, setShowAmountLabel] = useState(true);
  const [showPhoneLabel, setShowPhoneLabel] = useState(true);
  const [amountInteracted, setAmountInteracted] = useState(false);
  const [phoneInteracted, setPhoneInteracted] = useState(false);

  useEffect(() => {
    // Load saved phone number from localStorage
    const savedPhone = localStorage.getItem('userPhone');
    if (savedPhone) {
      setPhone(savedPhone);
      setPhoneInteracted(true);
      setShowPhoneLabel(false);
    }
  }, []);

  const formatAmount = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    const formatted = formatAmount(value);
    setAmount(formatted);
  };

  const handleAmountFocus = () => {
    if (!amountInteracted) {
      setAmountInteracted(true);
      setShowAmountLabel(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setPhone(value);
    // Save to localStorage
    localStorage.setItem('userPhone', value);
  };

  const handlePhoneFocus = () => {
    if (!phoneInteracted) {
      setPhoneInteracted(true);
      setShowPhoneLabel(false);
    }
  };

  const generateQRCode = () => {
    const rawAmount = amount.replace(/,/g, '');
    if (!rawAmount || !phone) {
      toast({
        title: "Missing Information",
        description: "Please enter both amount and phone number",
        variant: "destructive"
      });
      return;
    }

    if (phone.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }

    navigate(`/qr-preview?amount=${rawAmount}&phone=${phone}`);
  };

  const sharePaymentLink = async () => {
    const rawAmount = amount.replace(/,/g, '');
    if (!rawAmount || !phone) {
      toast({
        title: "Missing Information",
        description: "Please enter both amount and phone number",
        variant: "destructive"
      });
      return;
    }

    const paymentLink = `${window.location.origin}/pay?amount=${rawAmount}&phone=${phone}`;
    const shareText = `Request for ${rawAmount} UGX. Pay via Mobile Money: *182*1*1*${phone}*${rawAmount}#`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Request',
          text: shareText,
          url: paymentLink
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(`${shareText}\n\n${paymentLink}`);
      toast({
        title: "Payment Link Copied!",
        description: "Share this with the person who needs to pay you",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900 dark:to-pink-900">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="glass-card p-3 hover:scale-110 transition-transform"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Request Payment
          </h1>
          
          <div className="w-12"></div>
        </div>

        <div className="max-w-md mx-auto space-y-8">
          
          {/* Amount Input */}
          <div className="space-y-3">
            {showAmountLabel && (
              <label htmlFor="amount" className="block text-lg font-semibold text-gray-700 dark:text-gray-300">
                Amount (UGX)
              </label>
            )}
            <input
              id="amount"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              onFocus={handleAmountFocus}
              placeholder={showAmountLabel ? "Enter amount" : "Amount (UGX)"}
              className="w-full mobile-input text-center text-2xl font-bold"
              autoFocus
            />
          </div>

          {/* Phone Input */}
          <div className="space-y-3">
            {showPhoneLabel && (
              <label htmlFor="phone" className="block text-lg font-semibold text-gray-700 dark:text-gray-300">
                Your Phone Number
              </label>
            )}
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={handlePhoneChange}
              onFocus={handlePhoneFocus}
              placeholder={showPhoneLabel ? "e.g., 0788767676" : "Your Phone Number"}
              className="w-full mobile-input text-center text-xl"
            />
            <p className="text-sm text-gray-500 text-center">
              This number will receive the payment
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={generateQRCode}
              className="w-full btn-royal ripple flex items-center justify-center space-x-4"
            >
              <QrCode className="icon-large" />
              <span>Generate QR Code</span>
            </button>

            <button
              onClick={sharePaymentLink}
              className="w-full btn-primary ripple flex items-center justify-center space-x-4"
            >
              <Link className="icon-large" />
              <span>Share Payment Link</span>
            </button>
          </div>

          {/* Info Card */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
              How it works:
            </h3>
            <div className="space-y-2 text-gray-600 dark:text-gray-400">
              <p>1. Enter the amount and your phone number</p>
              <p>2. Generate a QR code or share payment link</p>
              <p>3. The payer scans the code or uses the link</p>
              <p>4. They dial the USSD code to complete payment</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GetPaidScreen;
