
import { useState, useEffect } from 'react';
import { cloudFunctions } from '@/services/cloudFunctions';
import { useSupabaseCache } from '@/hooks/useSupabaseCache';
import { toastService } from '@/services/toastService';
import { analyticsService } from '@/services/analyticsService';
import { errorMonitoringService } from '@/services/errorMonitoringService';
import { rateLimitingService } from '@/services/rateLimitingService';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

export const usePaymentGeneration = () => {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrResult, setQrResult] = useState<any>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [amountInteracted, setAmountInteracted] = useState(false);
  const [showPhoneLabel, setShowPhoneLabel] = useState(true);
  const [phoneInteracted, setPhoneInteracted] = useState(false);

  const { addPhone, getRecentPhones } = useSupabaseCache();
  const { trackUserAction } = usePerformanceMonitoring('PaymentGeneration');

  // On mount: prefill phone field from cache
  useEffect(() => {
    const recents = getRecentPhones();
    if (recents?.[0]) {
      setPhone(recents[0]);
      analyticsService.trackEvent('phone_prefilled', { source: 'cache' });
    }
  }, [getRecentPhones]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    if (!phoneInteracted) {
      setPhoneInteracted(true);
      setShowPhoneLabel(false);
      trackUserAction('phone_input_started');
    }
  };

  const handlePhoneFocus = () => {
    if (!phoneInteracted) {
      setPhoneInteracted(true);
      setShowPhoneLabel(false);
      trackUserAction('phone_input_focused');
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
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

  const generateQR = async () => {
    // Simplified input validation
    if (!phone.trim() || !amount.trim()) {
      toastService.error("Missing Information", "Please enter both phone number and amount");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toastService.error("Invalid Amount", "Please enter a valid amount");
      return;
    }

    // Simple rate limiting check
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
      // Generate QR code and payment link in parallel for speed
      const [qrResponse, linkResponse] = await Promise.all([
        cloudFunctions.generateQRCode(phone.trim(), numAmount),
        cloudFunctions.createPaymentLink(phone.trim(), numAmount)
      ]);
      
      console.log('[QR DEBUG] generateQRCode result:', qrResponse);
      console.log('[QR DEBUG] createPaymentLink result:', linkResponse);
      
      // Create a proper QR result object
      const qrResultData = {
        ...qrResponse,
        ussdString: qrResponse.ussdString || `*182*1*1*${phone.trim()}*${numAmount}#`,
        qrCodeImage: qrResponse.qrCodeImage,
        phone: phone.trim(),
        amount: numAmount
      };
      
      setQrResult(qrResultData);
      setPaymentLink(linkResponse.paymentLink);

      // Save recent phone to cache
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
    showPhoneLabel,
    phoneInteracted,
    handlePhoneChange,
    handlePhoneFocus,
    handleAmountChange,
    handleAmountFocus,
    generateQR
  };
};
