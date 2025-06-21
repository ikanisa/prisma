
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
    // Amount is optional - if empty, it's valid
    if (!amountValue.trim()) return true;
    
    const numAmount = parseFloat(amountValue);
    return !isNaN(numAmount) && numAmount >= 100 && numAmount <= 1000000;
  }, []);

  const generateQR = useCallback(async (): Promise<QRResult | null> => {
    if (!validatePhoneInput(phone)) {
      playErrorSound();
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number or code",
        variant: "destructive"
      });
      return null;
    }

    // Validate amount only if provided
    if (amount && !validateAmountInput(amount)) {
      playErrorSound();
      toast({
        title: "Invalid Amount",
        description: "Please check your amount (min 100 RWF, max 1,000,000 RWF)",
        variant: "destructive"
      });
      return null;
    }

    setIsGenerating(true);
    
    try {
      // Use default amount of 100 if no amount provided for USSD generation
      const ussdAmount = amount ? parseFloat(amount) : 100;
      
      // Generate USSD string locally first
      const ussdString = generateUSSDFromInputs(phone, ussdAmount.toString());
      
      // Validate the generated USSD
      const validation = validateUSSDString(ussdString);
      if (!validation.isValid) {
        throw new Error('Generated USSD string is invalid');
      }

      console.log('[usePaymentGeneration] Generating QR with:', { 
        phone, 
        amount: amount || 'flexible', 
        ussdString 
      });
      
      // Call backend to generate QR and payment link
      const [qrData, linkData] = await Promise.all([
        cloudFunctions.generateQRCode(phone, ussdAmount),
        cloudFunctions.createPaymentLink(phone, ussdAmount)
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
      
      const successMessage = amount 
        ? "Your payment QR code is ready to share"
        : "Your flexible payment request is ready - payer can enter any amount";
        
      toast({
        title: "QR Code Generated!",
        description: successMessage,
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
