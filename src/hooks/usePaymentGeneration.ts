
import { useState, useCallback } from 'react';
import { validatePhone, formatPhoneInput } from '@/utils/phoneValidation';
import { generateUSSDFromInputs, validateUSSDString } from '@/utils/ussdValidation';
import { cloudFunctions } from '@/services/cloudFunctions';
import { enhancedTransactionService } from '@/services/enhancedTransactionService';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { toast } from '@/hooks/use-toast';

export interface QRResult {
  ussdString: string;
  qrCodeUrl: string;
  qrCodeImage?: string;
}

export const usePaymentGeneration = () => {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrResult, setQrResult] = useState<QRResult | null>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [amountInteracted, setAmountInteracted] = useState(false);
  const [phoneInteracted, setPhoneInteracted] = useState(false);
  
  const { playSuccessBeep, playErrorSound } = useAudioFeedback();

  const handlePhoneChange = useCallback((value: string) => {
    const formatted = formatPhoneInput(value);
    setPhone(formatted);
  }, []);

  const handlePhoneFocus = useCallback(() => {
    setPhoneInteracted(true);
  }, []);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    const cleanValue = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : value;
    setAmount(cleanValue);
  }, []);

  const handleAmountFocus = useCallback(() => {
    setAmountInteracted(true);
  }, []);

  const validatePhoneInput = useCallback((phoneNumber: string): boolean => {
    return validatePhone(phoneNumber);
  }, []);

  const validateAmountInput = useCallback((amountValue: string): boolean => {
    const numAmount = parseFloat(amountValue);
    return !isNaN(numAmount) && numAmount >= 100 && numAmount <= 1000000;
  }, []);

  const generateQR = useCallback(async (): Promise<QRResult | null> => {
    if (!validatePhoneInput(phone) || !validateAmountInput(amount)) {
      playErrorSound();
      toast({
        title: "Invalid Input",
        description: "Please check your phone number and amount",
        variant: "destructive"
      });
      return null;
    }

    setIsGenerating(true);
    
    try {
      // Generate USSD string locally first
      const ussdString = generateUSSDFromInputs(phone, amount);
      
      // Validate the generated USSD
      const validation = validateUSSDString(ussdString);
      if (!validation.isValid) {
        throw new Error('Generated USSD string is invalid');
      }

      console.log('[usePaymentGeneration] Generating QR with:', { phone, amount, ussdString });
      
      // Call backend to generate QR and payment link
      const [qrData, linkData] = await Promise.all([
        cloudFunctions.generateQRCode(phone, parseFloat(amount)),
        cloudFunctions.createPaymentLink(phone, parseFloat(amount))
      ]);

      const result: QRResult = {
        ussdString: validation.sanitized,
        qrCodeUrl: qrData.qrCodeUrl || qrData.qrCodeImage || '',
        qrCodeImage: qrData.qrCodeImage
      };

      setQrResult(result);
      setPaymentLink(linkData?.paymentLink || '');
      
      // Log the generation event
      await enhancedTransactionService.logQRScan(
        validation.sanitized,
        {
          isValid: true,
          country: validation.country,
          provider: validation.provider,
          pattern: validation.pattern,
          sanitized: validation.sanitized,
          confidence: validation.confidence
        },
        phone
      );

      playSuccessBeep();
      toast({
        title: "QR Code Generated!",
        description: "Your payment QR code is ready to share",
      });

      return result;
    } catch (error) {
      console.error('QR generation failed:', error);
      playErrorSound();
      toast({
        title: "Generation Failed",
        description: "Please try again",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [phone, amount, validatePhoneInput, validateAmountInput, playSuccessBeep, playErrorSound]);

  return {
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
    validatePhone: validatePhoneInput,
    validateAmount: validateAmountInput
  };
};
