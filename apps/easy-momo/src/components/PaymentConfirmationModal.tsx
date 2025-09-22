
import React, { useState } from 'react';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { transactionService } from '@/services/transactionService';
import { toast } from '@/hooks/use-toast';

interface PaymentConfirmationModalProps {
  isVisible: boolean;
  onClose: () => void;
  transactionId?: string;
  amount: string;
  phone: string;
  ussdString: string;
}

const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  isVisible,
  onClose,
  transactionId,
  amount,
  phone,
  ussdString
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isVisible) return null;

  const handlePaymentConfirmed = async () => {
    if (!transactionId) return;
    
    setIsConfirming(true);
    try {
      await transactionService.updatePaymentStatus(transactionId, 'confirmed');
      toast({
        title: "Payment Confirmed!",
        description: "Thank you for confirming your payment",
      });
      onClose();
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      toast({
        title: "Confirmation Failed",
        description: "Could not update payment status",
        variant: "destructive"
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handlePaymentFailed = async () => {
    if (!transactionId) return;
    
    try {
      await transactionService.updatePaymentStatus(transactionId, 'failed');
      toast({
        title: "Payment Marked as Failed",
        description: "You can try again if needed",
        variant: "destructive"
      });
      onClose();
    } catch (error) {
      console.error('Failed to mark payment as failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md mx-auto bg-white shadow-2xl border-0 rounded-3xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center py-6">
          <CardTitle className="text-xl font-bold">Payment Status</CardTitle>
          <p className="text-blue-100 text-sm mt-2">
            {amount} RWF to {phone}
          </p>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* USSD Code Display */}
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <p className="text-white font-mono text-sm font-bold tracking-wider break-all">
              {ussdString}
            </p>
          </div>

          {/* Status Question */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Did you complete the payment?</span>
            </div>
            
            <p className="text-sm text-gray-600 leading-relaxed">
              After dialing the USSD code, please confirm if your mobile money payment was successful.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handlePaymentConfirmed}
              disabled={isConfirming}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold"
            >
              <Check className="w-5 h-5" />
              Yes, Payment Completed
            </Button>
            
            <Button
              onClick={handlePaymentFailed}
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50 py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold"
            >
              <AlertCircle className="w-5 h-5" />
              Payment Failed / Cancelled
            </Button>
            
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full text-gray-500 hover:text-gray-700 py-2 rounded-2xl flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Maybe Later
            </Button>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <p className="text-xs text-blue-700">
              💡 This helps us track payment success and improve our service
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentConfirmationModal;
