
import React, { useRef, useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  interacted: boolean;
}

const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  onFocus,
  interacted
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Add haptic feedback for mobile
  const triggerHapticFeedback = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove any non-numeric characters except decimal point
    let numericValue = e.target.value.replace(/[^\d.]/g, '');

    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      numericValue = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      numericValue = parts[0] + '.' + parts[1].slice(0, 2);
    }

    // Prevent leading zeros (except for decimal values like 0.5)
    if (numericValue.length > 1 && numericValue.startsWith('0') && !numericValue.startsWith('0.')) {
      numericValue = numericValue.substring(1);
    }

    // Allow up to 5,000,000 RWF - no restriction on digits, just the final amount
    const numValue = parseFloat(numericValue);
    if (numericValue === '' || !isNaN(numValue) && numValue >= 0 && numValue <= 5000000) {
      onChange(numericValue);
      if (numericValue.length > 0) {
        triggerHapticFeedback();
      }
    }
  }, [onChange, triggerHapticFeedback]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus();
    triggerHapticFeedback();
  }, [onFocus, triggerHapticFeedback]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const clearAmount = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
    triggerHapticFeedback();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }, [onChange, triggerHapticFeedback]);

  // Format display value with thousands separator for better readability
  const formatDisplayValue = (val: string) => {
    if (!val) return '';
    const parts = val.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (parts.length === 2) {
      return integerPart + '.' + parts[1];
    }
    return integerPart;
  };

  const displayValue = formatDisplayValue(value);

  return (
    <div className="space-y-3 animate-fade-in">
      <Label htmlFor="amount" className="text-base font-semibold text-gray-800 dark:text-gray-200">
        Amount (RWF)
      </Label>
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="amount"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Enter Amount"
          className={`
            h-16 text-2xl font-bold text-right pr-12 pl-4
            transition-all duration-300 ease-in-out
            border-2 rounded-xl
            mobile-input touch-action-manipulation
            ${isFocused ? 'border-green-500 ring-4 ring-green-100 shadow-lg scale-[1.02] dark:ring-green-900' : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'}
            focus:outline-none
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder:text-gray-500 dark:placeholder:text-gray-400
            caret-green-600 dark:caret-green-400
          `}
          style={{
            fontSize: '24px',
            fontWeight: '800',
            caretColor: isFocused ? '#16a34a' : 'currentColor',
            WebkitUserSelect: 'text',
            userSelect: 'text',
            pointerEvents: 'auto',
            WebkitAppearance: 'none'
          }}
          type="text"
          inputMode="decimal"
          pattern="[0-9]*"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          min="0"
          max="5000000"
          readOnly={false}
          disabled={false}
        />
        
        {value && (
          <button
            type="button"
            onClick={clearAmount}
            onMouseDown={e => e.preventDefault()}
            className={`
              absolute right-3 top-1/2 -translate-y-1/2 
              w-8 h-8 rounded-full 
              bg-gray-400 hover:bg-gray-500 active:bg-gray-600
              dark:bg-gray-600 dark:hover:bg-gray-500 dark:active:bg-gray-400
              flex items-center justify-center 
              transition-all duration-200 
              mobile-button
              hover:scale-110 active:scale-95
              z-10
            `}
            aria-label="Clear amount"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
      
      {/* Validation hints */}
      {value && parseFloat(value.replace(/\s/g, '')) > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {parseFloat(value.replace(/\s/g, '')) < 100 && "Minimum amount: 100 RWF"}
          {parseFloat(value.replace(/\s/g, '')) > 1000000 && "Large amount - please verify"}
        </div>
      )}
    </div>
  );
};

export default AmountInput;
