
import { useState, useCallback } from 'react';
import { paymentRequestService, PaymentRequest } from '@/services/paymentRequestService';
import { toastService } from '@/services/toastService';
import { analyticsService } from '@/services/analyticsService';

export const usePaymentRequests = () => {
  const [isCreating, setIsCreating] = useState(false);

  const createPaymentRequest = useCallback(async (momoNumber: string, amount: number): Promise<PaymentRequest | null> => {
    setIsCreating(true);
    try {
      const request = await paymentRequestService.createPaymentRequest(momoNumber, amount);
      
      toastService.success("Payment Request Created!", "QR code generated successfully");
      analyticsService.trackEvent('payment_request_created', { 
        momo_number: momoNumber, 
        amount 
      });
      
      return request;
    } catch (error) {
      console.error('Failed to create payment request:', error);
      toastService.error("Creation Failed", "Could not create payment request");
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    createPaymentRequest,
    isCreating
  };
};
