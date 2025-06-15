
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { cloudFunctions } from '@/services/cloudFunctions';
// Import the offline cache helpers
import { addPhone, getRecentPhones } from '@/utils/offlineCache';

export const usePaymentGeneration = () => {
  // Prefill phone using offline cache (useEffect below)
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrResult, setQrResult] = useState<any>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [amountInteracted, setAmountInteracted] = useState(false);
  const [showPhoneLabel, setShowPhoneLabel] = useState(true);
  const [phoneInteracted, setPhoneInteracted] = useState(false);

  // On mount: prefill phone field from cache
  useEffect(() => {
    const recents = getRecentPhones();
    if (recents?.[0]) {
      setPhone(recents[0]);
    }
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    if (!phoneInteracted) {
      setPhoneInteracted(true);
      setShowPhoneLabel(false);
    }
  };

  const handlePhoneFocus = () => {
    if (!phoneInteracted) {
      setPhoneInteracted(true);
      setShowPhoneLabel(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    if (!amountInteracted) {
      setAmountInteracted(true);
    }
  };

  const handleAmountFocus = () => {
    if (!amountInteracted) {
      setAmountInteracted(true);
    }
  };

  const generateQR = async () => {
    if (!phone.trim() || !amount.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both phone number and amount",
        variant: "destructive"
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    // Debug: log inputs before API call
    console.log('[QR DEBUG] generateQR called with:', { phone: phone.trim(), amount: numAmount });

    try {
      // Generate QR code
      const qrResponse = await cloudFunctions.generateQRCode(phone.trim(), numAmount);
      setQrResult(qrResponse);
      console.log('[QR DEBUG] generateQRCode result:', qrResponse);

      // Generate payment link
      const linkResponse = await cloudFunctions.createPaymentLink(phone.trim(), numAmount);
      setPaymentLink(linkResponse.paymentLink);
      console.log('[QR DEBUG] createPaymentLink result:', linkResponse);

      // Save phone number to offline cache
      addPhone(phone.trim());

      toast({
        title: "QR Code Generated!",
        description: "Ready to share your payment request",
      });
    } catch (error) {
      console.error('[QR DEBUG] Error generating QR:', error);
      let errMsg: string = "Could not generate QR code. Please try again.";
      if (typeof error === "object" && error !== null && "message" in error) {
        errMsg = (error as any).message || errMsg;
      }
      toast({
        title: "Generation Failed",
        description: errMsg,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
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
  };
};

