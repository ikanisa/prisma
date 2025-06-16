
import React from 'react';
import { Card, CardContent } from '../ui/card';
import PhoneInput from './PhoneInput';
import AmountInput from './AmountInput';
import GenerateButton from './GenerateButton';

interface PaymentFormProps {
  phone: string;
  amount: string;
  isGenerating: boolean;
  amountInteracted: boolean;
  phoneInteracted: boolean;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhoneFocus: () => void;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAmountFocus: () => void;
  onGenerateQR: () => void;
  validatePhone?: (phone: string) => boolean;
  validateAmount?: (amount: string) => boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  phone,
  amount,
  isGenerating,
  amountInteracted,
  phoneInteracted,
  onPhoneChange,
  onPhoneFocus,
  onAmountChange,
  onAmountFocus,
  onGenerateQR,
  validatePhone,
  validateAmount
}) => {
  const handlePhoneChange = (value: string) => {
    const syntheticEvent = {
      target: { value }
    } as React.ChangeEvent<HTMLInputElement>;
    onPhoneChange(syntheticEvent);
  };

  const handleAmountChange = (value: string) => {
    const syntheticEvent = {
      target: { value }
    } as React.ChangeEvent<HTMLInputElement>;
    onAmountChange(syntheticEvent);
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-3xl dark:bg-gray-900/95 overflow-hidden">
        <CardContent className="p-8 space-y-8">
          <PhoneInput
            value={phone}
            onChange={handlePhoneChange}
            onFocus={onPhoneFocus}
            interacted={phoneInteracted}
          />

          <AmountInput
            value={amount}
            onChange={handleAmountChange}
            onFocus={onAmountFocus}
            interacted={amountInteracted}
          />

          <GenerateButton
            onGenerate={onGenerateQR}
            isGenerating={isGenerating}
            phone={phone}
            amount={amount}
            validatePhone={validatePhone}
            validateAmount={validateAmount}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentForm;
