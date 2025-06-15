
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { cloudFunctions } from '@/services/cloudFunctions';

export const usePaymentGeneration = () => {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrResult, setQrResult] = useState<any>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [amountInteracted, setAmountInteracted] = useState(false);
  const [showPhoneLabel, setShowPhoneLabel] = useState(true);
  const [phoneInteracted, setPhoneInteracted] = useState(false);

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
    try {
      // Generate QR code
      const qrResponse = await cloudFunctions.generateQRCode(phone.trim(), numAmount);
      setQrResult(qrResponse);

      // Generate payment link
      const linkResponse = await cloudFunctions.createPaymentLink(phone.trim(), numAmount);
      setPaymentLink(linkResponse.paymentLink);

      toast({
        title: "QR Code Generated!",
        description: "Ready to share your payment request",
      });
    } catch (error) {
      console.error('Error generating QR:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate QR code. Please try again.",
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
