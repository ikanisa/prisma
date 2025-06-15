
import React from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import LoadingSpinner from '../LoadingSpinner';
import { formatCurrencyWithSpaces, unformatCurrencyWithSpaces } from '../../utils/formatCurrency';

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
  // Intercept input to format as currency
  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip formatting, allow only digits
    const unformattedValue = unformatCurrencyWithSpaces(e.target.value);
    const formatted = formatCurrencyWithSpaces(unformattedValue);
    // Create a synthetic event to pass up only the plain digits for state management
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        value: unformattedValue
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onAmountChange(syntheticEvent);
  };

  // For displaying: always show with thousand separators
  const displayAmount = formatCurrencyWithSpaces(amount);

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-blue-200/50">
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className={`transition-opacity ${showPhoneLabel ? 'opacity-100' : 'opacity-0'}`}>
            Mobile Money Number
          </Label>
          <Input
            id="phone"
            value={phone}
            onChange={onPhoneChange}
            onFocus={onPhoneFocus}
            placeholder="Enter mobile money number"
            className="text-lg"
            inputMode="numeric"
            pattern="\d*"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount" className={`transition-opacity ${amountInteracted ? 'opacity-0' : 'opacity-100'}`}>
            Amount (RWF)
          </Label>
          <Input
            id="amount"
            value={displayAmount}
            onChange={handleAmountInput}
            onFocus={onAmountFocus}
            placeholder="Enter amount"
            type="text"
            className="text-lg"
            inputMode="numeric"
            pattern="\d*"
            maxLength={12}
            autoComplete="off"
          />
        </div>

        <Button 
          onClick={onGenerateQR}
          disabled={isGenerating || !phone.trim() || !amount.trim()}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 text-lg"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner />
              <span className="ml-2">Generating...</span>
            </>
          ) : (
            <>
              <QrCode className="w-5 h-5 mr-2" />
              Generate Payment QR
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
