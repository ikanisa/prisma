
import React, { useState, useRef, useCallback } from 'react';
import { QrCode, Phone, DollarSign, X } from 'lucide-react';
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
  const [showRecentContacts, setShowRecentContacts] = useState(false);
  const [focusedField, setFocusedField] = useState<'phone' | 'amount' | null>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  
  const { contacts } = useRecentContacts();

  const handlePhoneFocus = useCallback(() => {
    setFocusedField('phone');
    setShowRecentContacts(true);
    onPhoneFocus();
  }, [onPhoneFocus]);

  const handlePhoneBlur = useCallback(() => {
    // Delay to allow dropdown interaction
    setTimeout(() => {
      setFocusedField(null);
      setShowRecentContacts(false);
    }, 150);
  }, []);

  const handleAmountFocus = useCallback(() => {
    setFocusedField('amount');
    setShowRecentContacts(false);
    onAmountFocus();
  }, [onAmountFocus]);

  const handleAmountBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  const handleAmountInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const unformattedValue = unformatCurrencyWithSpaces(e.target.value);
    const formatted = formatCurrencyWithSpaces(unformattedValue);
    
    // Create synthetic event with unformatted value for parent component
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        value: unformattedValue
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onAmountChange(syntheticEvent);
  }, [onAmountChange]);

  const handleSelectContact = useCallback((selectedPhone: string) => {
    const syntheticEvent = {
      target: { value: selectedPhone }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onPhoneChange(syntheticEvent);
    setShowRecentContacts(false);
    setFocusedField(null);
    
    // Focus back to phone input after selection
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 100);
  }, [onPhoneChange]);

  const clearPhone = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const syntheticEvent = {
      target: { value: '' }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onPhoneChange(syntheticEvent);
    
    // Focus back to input after clearing
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 10);
  }, [onPhoneChange]);

  const clearAmount = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const syntheticEvent = {
      target: { value: '' }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onAmountChange(syntheticEvent);
    
    // Focus back to input after clearing
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 10);
  }, [onAmountChange]);

  const displayAmount = formatCurrencyWithSpaces(amount);
  const isPhoneFocused = focusedField === 'phone';
  const isAmountFocused = focusedField === 'amount';

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Phone Number Input Section */}
          <div className="space-y-3">
            <Label 
              htmlFor="phone" 
              className={`text-sm font-semibold text-gray-700 transition-opacity duration-200 ${
                showPhoneLabel ? 'opacity-100' : 'opacity-0'
              }`}
            >
              MOMO Number/Code
            </Label>
            
            <div className="relative">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <Input
                  ref={phoneInputRef}
                  id="phone"
                  value={phone}
                  onChange={onPhoneChange}
                  onFocus={handlePhoneFocus}
                  onBlur={handlePhoneBlur}
                  placeholder="Enter MOMO Number/Code"
                  className={`
                    pl-10 pr-12 h-14 text-lg font-medium
                    transition-all duration-200 ease-in-out
                    border-2 rounded-xl
                    cursor-text
                    ${isPhoneFocused 
                      ? 'border-blue-500 ring-4 ring-blue-100 shadow-lg' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                    focus:outline-none
                    touch-manipulation
                  `}
                  style={{
                    fontSize: '16px', // Prevents zoom on iOS
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  maxLength={15}
                />
                
                {/* Clear button */}
                {phone && (
                  <button
                    type="button"
                    onClick={clearPhone}
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-400 hover:bg-gray-500 active:bg-gray-600 flex items-center justify-center transition-colors cursor-pointer touch-manipulation z-10"
                    aria-label="Clear phone number"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>

              {/* Recent Contacts Dropdown */}
              <RecentContactsDropdown
                contacts={contacts}
                onSelectContact={handleSelectContact}
                isVisible={showRecentContacts && contacts.length > 0}
              />
            </div>
          </div>

          {/* Amount Input Section */}
          <div className="space-y-3">
            <Label 
              htmlFor="amount" 
              className={`text-sm font-semibold text-gray-700 transition-opacity duration-200 ${
                amountInteracted ? 'opacity-0' : 'opacity-100'
              }`}
            >
              Amount (RWF)
            </Label>
            
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <Input
                ref={amountInputRef}
                id="amount"
                value={displayAmount}
                onChange={handleAmountInput}
                onFocus={handleAmountFocus}
                onBlur={handleAmountBlur}
                placeholder="0"
                className={`
                  pl-10 pr-12 h-14 text-lg font-medium text-right
                  transition-all duration-200 ease-in-out
                  border-2 rounded-xl
                  cursor-text
                  ${isAmountFocused 
                    ? 'border-green-500 ring-4 ring-green-100 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                  focus:outline-none
                  touch-manipulation
                `}
                style={{
                  fontSize: '16px', // Prevents zoom on iOS
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9,]*"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                maxLength={15}
              />
              
              {/* Clear button */}
              {amount && (
                <button
                  type="button"
                  onClick={clearAmount}
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-400 hover:bg-gray-500 active:bg-gray-600 flex items-center justify-center transition-colors cursor-pointer touch-manipulation z-10"
                  aria-label="Clear amount"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>

          {/* Generate QR Button */}
          <Button 
            onClick={onGenerateQR}
            disabled={isGenerating || !phone.trim() || !amount.trim()}
            className={`
              w-full h-14 text-lg font-semibold rounded-xl
              transition-all duration-200 ease-in-out
              cursor-pointer touch-manipulation
              ${isGenerating || !phone.trim() || !amount.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl active:scale-95'
              }
            `}
            type="button"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {isGenerating ? (
              <div className="flex items-center justify-center gap-3">
                <LoadingSpinner />
                <span>Generating QR Code...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <QrCode className="w-6 h-6" />
                <span>Generate Payment QR</span>
              </div>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentForm;
