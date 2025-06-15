import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Link as LinkIcon, Copy as CopyIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ValidationUtils } from '@/utils/validation';
import AccessibleButton from './AccessibleButton';
import LoadingSpinner from './LoadingSpinner';
import { addPhone, addAmount, getRecentPhones, getRecentAmounts } from '@/utils/offlineCache';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from './ui/sheet';
import SmartPayeeInput from "./SmartPayeeInput";
import { api } from '@/services/api';
import { cloudFunctions } from '@/services/cloudFunctions';

const GetPaidScreen = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [payeeType, setPayeeType] = useState<"phone"|"code"|null>(null);
  const [payeeValid, setPayeeValid] = useState(false);
  const [showAmountLabel, setShowAmountLabel] = useState(true);
  const [amountInteracted, setAmountInteracted] = useState(false);
  const [errors, setErrors] = useState<{
    amount?: string;
    phone?: string;
  }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

  useEffect(() => {
    // Autofill from cache if nothing in localStorage
    if (!payee) {
      const fromCache = getRecentPhones()[0];
      if (fromCache) setPayee(fromCache);
    }
    // Optionally autofill recent amount below
  }, []);

  useEffect(() => {
    const savedPhone = localStorage.getItem('userPhone');
    if (savedPhone) {
      setPayee(savedPhone);
      setPhoneInteracted(true);
      setShowPhoneLabel(false);
    }
  }, []);

  const formatAmount = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = ValidationUtils.sanitizeInput(e.target.value);
    const cleaned = value.replace(/[^0-9]/g, '');
    const formatted = formatAmount(cleaned);
    setAmount(formatted);

    if (errors.amount) {
      setErrors(prev => ({
        ...prev,
        amount: undefined
      }));
    }
  };

  const handleAmountFocus = () => {
    if (!amountInteracted) {
      setAmountInteracted(true);
      setShowAmountLabel(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = ValidationUtils.sanitizeInput(e.target.value);
    const cleaned = value.replace(/[^0-9+]/g, '');
    setPayee(cleaned);
    localStorage.setItem('userPhone', cleaned);

    if (errors.phone) {
      setErrors(prev => ({
        ...prev,
        phone: undefined
      }));
    }
  };

  const handlePhoneFocus = () => {
    if (!phoneInteracted) {
      setPhoneInteracted(true);
      setShowPhoneLabel(false);
    }
  };

  const validateInputs = (): boolean => {
    const rawAmount = amount.replace(/,/g, '');
    const amountValidation = ValidationUtils.validateAmount(rawAmount);
    let payeeErr;
    if (!payeeValid) {
      payeeErr = "Andika numero nyayo ya telefone (07...) cyangwa MoMo Code (4-6 imibare)";
    }
    const newErrors: {
      amount?: string;
      phone?: string;
    } = {};
    if (!amountValidation.isValid) {
      newErrors.amount = amountValidation.error;
    }
    if (payeeErr) {
      newErrors.phone = payeeErr;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateQRCode = async () => {
    if (!validateInputs()) return;
    setIsGenerating(true);
    try {
      const rawAmount = amount.replace(/,/g, '');
      
      // Save to cache
      addAmount(amount);
      addPhone(payee);

      // Use new backend API
      const result = await api.generatePaymentLink({
        phone: payee,
        amount: parseInt(rawAmount, 10)
      });

      // Navigate to QR preview with the generated data
      const searchParams = new URLSearchParams({
        amount: rawAmount,
        phone: payee,
        ussd: result.ussdString,
        qr: result.qrCodeUrl
      });
      
      navigate(`/qr-preview?${searchParams.toString()}`);
      
      toast({
        title: "QR Code Generated!",
        description: "Your payment QR code is ready",
      });
    } catch (error) {
      console.error('QR generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate QR code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sharePaymentLink = async () => {
    if (!validateInputs()) return;
    setIsSharing(true);

    try {
      const rawAmount = amount.replace(/,/g, '');
      
      // Generate payment link using backend
      const result = await cloudFunctions.createPaymentLink(payee, parseInt(rawAmount, 10));
      await cloudFunctions.logShareEvent('PAYMENT_LINK');
      
      const shareText = `Payment Request: ${amount} RWF to ${payee}\nPay via: ${result.paymentLink}`;

      if (navigator.share) {
        await navigator.share({
          title: 'Payment Request (Rwanda)',
          text: shareText,
          url: result.paymentLink
        });
      } else {
        setShowShareSheet(true);
        return;
      }
      
      toast({
        title: "Link Shared!",
        description: "Payment link has been shared successfully",
      });
    } catch (error) {
      console.error('Share failed:', error);
      toast({
        title: "Share Failed",
        description: "Could not create payment link. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Copy link for fallback share sheet
  const handleCopyLink = async () => {
    try {
      const rawAmount = amount.replace(/,/g, '');
      const result = await cloudFunctions.createPaymentLink(payee, parseInt(rawAmount, 10));
      const shareText = `Payment Request: ${amount} RWF to ${payee}\nPay via: ${result.paymentLink}`;

      await navigator.clipboard.writeText(shareText);
      toast({
        title: "Link copied!",
        description: "Payment link copied to clipboard",
        duration: 4000
      });
      setShowShareSheet(false);
    } catch (err) {
      console.error('Copy failed:', err);
      toast({
        title: "Copy failed",
        description: "Could not copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  // Autofill recent values if offline
  const phoneSuggestions = getRecentPhones();
  const amountSuggestions = getRecentAmounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900 dark:to-pink-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/')} className="glass-card p-3 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Subira ahabanza">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Saba Kwishyurwa
          </h1>
          <div className="w-12" aria-hidden="true"></div>
        </div>

        <div className="max-w-md mx-auto space-y-8">
          {/* Amount Input */}
          <div className="space-y-3">
            {showAmountLabel && <label htmlFor="amount" className="block text-lg font-semibold text-gray-700 dark:text-gray-300">
                Ingano y'Amafaranga (RWF)
              </label>}
            <input 
              id="amount" 
              type="text" 
              inputMode="numeric" 
              value={amount} 
              onChange={(e) => {
                const value = ValidationUtils.sanitizeInput(e.target.value);
                const cleaned = value.replace(/[^0-9]/g, '');
                const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                setAmount(formatted);
                if (errors.amount) {
                  setErrors(prev => ({ ...prev, amount: undefined }));
                }
              }}
              onFocus={() => {
                if (!amountInteracted) {
                  setAmountInteracted(true);
                  setShowAmountLabel(false);
                }
              }}
              placeholder={showAmountLabel ? "Andika ingano y'amafaranga" : "Ingano y'amafaranga (RWF)"} 
              className={`w-full mobile-input text-center text-2xl font-bold ${errors.amount ? 'border-red-500 focus:ring-red-500/20' : ''}`} 
              autoFocus 
              aria-invalid={!!errors.amount} 
              aria-describedby={errors.amount ? "amount-error" : undefined} 
              list="recent-amounts" 
            />
            <datalist id="recent-amounts">
              {getRecentAmounts().map(a => <option value={a} key={a} />)}
            </datalist>
            {errors.amount && <p id="amount-error" className="text-error text-center" role="alert">
                {errors.amount}
              </p>}
          </div>

          {/* Payee Input */}
          <SmartPayeeInput
            value={payee}
            onChange={(val, type, valid) => {
              setPayee(val);
              setPayeeType(type === "invalid" ? null : type as "phone"|"code"|null);
              setPayeeValid(valid);
              if (errors.phone && valid) {
                setErrors(prev => ({ ...prev, phone: undefined }));
              }
            }}
            label="Numero yawe ya telefone CYANGWA MoMo Code"
          />

          {errors.phone && <p className="text-error text-center" role="alert">
            {errors.phone}
          </p>}

          {/* Preview */}
          <div className="text-center py-2 text-lg font-medium">
            {amount && payeeValid && payeeType === "phone" && (
              <>You're requesting <span className="font-bold">{amount} RWF</span> from <span className="font-mono">{payee}</span> (MoMo Phone)</>
            )}
            {amount && payeeValid && payeeType === "code" && (
              <>You're requesting <span className="font-bold">{amount} RWF</span> via <span className="font-mono">{payee}</span> (MoMo Code)</>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <AccessibleButton 
              onClick={generateQRCode} 
              variant="royal" 
              size="lg" 
              loading={isGenerating} 
              className="w-full flex items-center justify-center space-x-4" 
              aria-describedby="qr-description"
            >
              {!isGenerating && <QrCode className="icon-large" />}
              <span>Kora QR Code</span>
            </AccessibleButton>

            <AccessibleButton
              onClick={sharePaymentLink}
              variant="primary"
              size="lg"
              loading={isSharing}
              className="w-full flex items-center justify-center space-x-4"
              aria-describedby="share-description"
            >
              {!isSharing && <LinkIcon className="icon-large" />}
              <span>Sangiza Link yo Kwishyura</span>
            </AccessibleButton>
          </div>
        </div>
      </div>

      {/* Share Sheet */}
      <Sheet open={showShareSheet} onOpenChange={setShowShareSheet}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Sangira Link yo Kwishyura</SheetTitle>
            <SheetDescription>
              Share this payment request via WhatsApp, SMS, or email.
            </SheetDescription>
          </SheetHeader>
          <div className="my-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-gray-700 dark:text-gray-200">
            <div><span className="font-semibold">Amount: </span>{amount} RWF</div>
            <div><span className="font-semibold">To: </span>{payee}</div>
          </div>
          <AccessibleButton
            onClick={handleCopyLink}
            variant="royal"
            size="md"
            className="w-full flex items-center justify-center space-x-2"
          >
            <CopyIcon />
            <span>Copy Payment Link</span>
          </AccessibleButton>
          <SheetClose asChild>
            <button className="mt-4 underline w-full text-sm text-center text-blue-600 dark:text-blue-300">Close</button>
          </SheetClose>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default GetPaidScreen;
