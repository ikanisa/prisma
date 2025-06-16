
import { useState, useEffect } from 'react';
import { cloudFunctions } from '@/services/cloudFunctions';
import { useSupabaseCache } from '@/hooks/useSupabaseCache';
import { toastService } from '@/services/toastService';
import { analyticsService } from '@/services/analyticsService';
import { errorMonitoringService } from '@/services/errorMonitoringService';
import { rateLimitingService } from '@/services/rateLimitingService';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

export const usePaymentGeneration = () => {
  // Start with empty values initially
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrResult, setQrResult] = useState<any>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [amountInteracted, setAmountInteracted] = useState(false);
  const [phoneInteracted, setPhoneInteracted] = useState(false);

  const { addPhone, recentPhones } = useSupabaseCache();
  const { trackUserAction } = usePerformanceMonitoring('PaymentGeneration');

  // Auto-fill phone from memory when component mounts
  useEffect(() => {
    if (recentPhones.length > 0 && !phoneInteracted && !phone) {
      setPhone(recentPhones[0]); // Use most recent phone number
    }
  }, [recentPhones, phoneInteracted, phone]);

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (!phoneInteracted) {
      setPhoneInteracted(true);
      trackUserAction('phone_input_started');
    }
  };

  const handlePhoneFocus = () => {
    if (!phoneInteracted) {
      setPhoneInteracted(true);
      trackUserAction('phone_input_focused');
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove any non-numeric characters except decimal point
    let value = e.target.value.replace(/[^\d.]/g, '');
    
    // Handle decimal points properly
    const parts = value.split('.');
    if (parts.length > 2) {
      // More than one decimal point, keep only the first one
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    // Convert to number to check max limit, but keep as string for display
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 5000000) {
      value = '5000000';
    }
    
    // Don't allow leading zeros except for decimals like "0.5"
    if (value.length > 1 && value[0] === '0' && value[1] !== '.') {
      value = value.substring(1);
    }
    
    setAmount(value);
    if (!amountInteracted) {
      setAmountInteracted(true);
      trackUserAction('amount_input_started');
    }
  };

  const handleAmountFocus = () => {
    if (!amountInteracted) {
      setAmountInteracted(true);
      trackUserAction('amount_input_focused');
    }
  };

  const validatePhone = (phoneNumber: string): boolean => {
    // Rwanda phone validation: 07XXXXXXXX or 078/079 specifically
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    return cleanPhone.length >= 4 && cleanPhone.length <= 12;
  };

  const validateAmount = (amountValue: string): boolean => {
    if (!amountValue || amountValue.trim() === '') return false;
    const numAmount = parseFloat(amountValue);
    return !isNaN(numAmount) && numAmount > 0 && numAmount <= 5000000; // Max 5M RWF
  };

  const generateQR = async () => {
    // Enhanced validation
    if (!validatePhone(phone)) {
      toastService.error("Invalid Phone", "Please enter a valid MoMo number or Pay code");
      return;
    }

    if (!validateAmount(amount)) {
      toastService.error("Invalid Amount", "Please enter a valid amount in RWF (max 5,000,000)");
      return;
    }

    const numAmount = parseFloat(amount);

    // Rate limiting check
    if (!rateLimitingService.isAllowed('qr_generation')) {
      const resetTime = rateLimitingService.getResetTime('qr_generation');
      const waitMinutes = Math.ceil((resetTime - Date.now()) / 60000);
      toastService.error("Rate Limit Exceeded", `Please wait ${waitMinutes} minute(s) before generating another QR code`);
      return;
    }

    setIsGenerating(true);
    trackUserAction('qr_generation_started', { amount: numAmount });

    console.log('[QR DEBUG] generateQR called with:', { phone: phone.trim(), amount: numAmount });

    try {
      // Generate QR code and payment link in parallel
      const [qrResponse, linkResponse] = await Promise.all([
        cloudFunctions.generateQRCode(phone.trim(), numAmount),
        cloudFunctions.createPaymentLink(phone.trim(), numAmount)
      ]);
      
      console.log('[QR DEBUG] generateQRCode result:', qrResponse);
      console.log('[QR DEBUG] createPaymentLink result:', linkResponse);
      
      const qrResultData = {
        ...qrResponse,
        ussdString: qrResponse.ussdString || `*182*1*1*${phone.trim()}*${numAmount}#`,
        qrCodeImage: qrResponse.qrCodeImage,
        phone: phone.trim(),
        amount: numAmount
      };
      
      setQrResult(qrResultData);
      setPaymentLink(linkResponse.paymentLink);

      // Save recent phone to cache only after successful generation
      addPhone(phone.trim());

      analyticsService.trackQRGeneration(numAmount, 'mobile_money');
      trackUserAction('qr_generation_completed', { amount: numAmount });

      toastService.success("QR Code Generated!", "Ready to share your payment request");
      
      return qrResultData;
    } catch (error) {
      console.error('[QR DEBUG] Error generating QR:', error);

      let errMsg: string = "Could not generate QR code. Please try again.";
      if (typeof error === "object" && error !== null && "message" in error) {
        errMsg = (error as any).message || errMsg;
      }

      errorMonitoringService.logError(error as Error, 'qr_generation', {
        phone: phone.trim(),
        amount: numAmount
      });

      trackUserAction('qr_generation_failed', { amount: numAmount, error: errMsg });

      toastService.error("Generation Failed", errMsg);
      throw error;
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
    phoneInteracted,
    handlePhoneChange,
    handlePhoneFocus,
    handleAmountChange,
    handleAmountFocus,
    generateQR,
    validatePhone,
    validateAmount
  };
};
