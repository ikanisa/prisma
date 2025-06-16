
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
  showPhoneLabel: boolean;
  phoneInteracted: boolean;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhoneFocus: () => void;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAmountFocus: () => void;
  onGenerateQR: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  phone,
  amount,
  isGenerating,
  amountInteracted,
  showPhoneLabel,
  phoneInteracted,
  onPhoneChange,
  onPhoneFocus,
  onAmountChange,
  onAmountFocus,
  onGenerateQR
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
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
        <CardContent className="p-4 sm:p-6 space-y-6">
          <PhoneInput
            value={phone}
            onChange={handlePhoneChange}
            onFocus={onPhoneFocus}
            showLabel={showPhoneLabel}
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
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentForm;
