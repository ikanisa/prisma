import React, { useState } from 'react';
import { QrCode } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import LoadingSpinner from '../LoadingSpinner';
import RecentContactsDropdown from '../RecentContactsDropdown';
import { useRecentContacts } from '../RecentContacts';
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
  // State to track which field is focused for typing indicator
  const [focusedField, setFocusedField] = useState<null | 'phone' | 'amount'>(null);
  const [showRecentContacts, setShowRecentContacts] = useState(false);
  
  // Get recent contacts data
  const { contacts } = useRecentContacts();

  // Intercept input to format as currency
  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const unformattedValue = unformatCurrencyWithSpaces(e.target.value);
    const formatted = formatCurrencyWithSpaces(unformattedValue);
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        value: unformattedValue
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onAmountChange(syntheticEvent);
  };

  const handlePhoneFocus = () => {
    setFocusedField('phone');
    setShowRecentContacts(true);
    onPhoneFocus();
  };

  const handlePhoneBlur = () => {
    // Delay hiding to allow click on dropdown
    setTimeout(() => {
      setFocusedField(null);
      setShowRecentContacts(false);
    }, 200);
  };

  const handleAmountFocus = () => {
    setFocusedField('amount');
    setShowRecentContacts(false);
    onAmountFocus();
  };

  const handleAmountBlur = () => {
    setFocusedField(null);
  };

  const handleSelectContact = (selectedPhone: string) => {
    const syntheticEvent = {
      target: { value: selectedPhone }
    } as React.ChangeEvent<HTMLInputElement>;
    onPhoneChange(syntheticEvent);
    setShowRecentContacts(false);
    setFocusedField(null);
  };

  const displayAmount = formatCurrencyWithSpaces(amount);

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-blue-200/50">
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className={`transition-opacity ${showPhoneLabel ? 'opacity-100' : 'opacity-0'}`}>
            MOMO Number/Code
          </Label>
          <div className="relative">
            <Input
              id="phone"
              value={phone}
              onChange={onPhoneChange}
              onFocus={handlePhoneFocus}
              onBlur={handlePhoneBlur}
              placeholder="Enter mobile money number"
              className={`text-lg transition-all duration-200 ${
                focusedField === 'phone'
                  ? 'ring-2 ring-blue-400 border-blue-500 shadow-lg focus:ring-2'
                  : 'border-gray-300'
              }`}
              type="tel"
              autoComplete="tel"
              aria-label="Mobile money phone number"
              readOnly={false}
              disabled={false}
            />
            {focusedField === 'phone' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-500 animate-pulse"></div>
                <span className="text-blue-500 text-xs font-bold">
                  Typing...
                </span>
              </div>
            )}
            
            {/* Recent Contacts Dropdown */}
            <RecentContactsDropdown
              contacts={contacts}
              onSelectContact={handleSelectContact}
              isVisible={showRecentContacts}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount" className={`transition-opacity ${amountInteracted ? 'opacity-0' : 'opacity-100'}`}>
            Amount (RWF)
          </Label>
          <div className="relative">
            <Input
              id="amount"
              value={displayAmount}
              onChange={handleAmountInput}
              onFocus={handleAmountFocus}
              onBlur={handleAmountBlur}
              placeholder="Enter amount"
              type="text"
              className={`text-lg transition-all duration-200 ${
                focusedField === 'amount'
                  ? 'ring-2 ring-blue-400 border-blue-500 shadow-lg focus:ring-2'
                  : 'border-gray-300'
              }`}
              inputMode="numeric"
              pattern="\d*"
              maxLength={12}
              autoComplete="off"
              aria-label="Amount (RWF)"
            />
            {focusedField === 'amount' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-500 animate-pulse"></div>
                <span className="text-blue-500 text-xs font-bold">
                  Typing...
                </span>
              </div>
            )}
          </div>
        </div>

        <Button 
          onClick={onGenerateQR}
          disabled={isGenerating || !phone.trim() || !amount.trim()}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 text-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400"
          aria-label="Generate Payment QR"
          tabIndex={0}
        >
          {isGenerating ? (
            <>
              <LoadingSpinner />
              <span className="ml-2">Generating...</span>
            </>
          ) : (
            <>
              <QrCode className="w-5 h-5 mr-2" aria-hidden="true" focusable="false"/>
              Generate Payment QR
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
