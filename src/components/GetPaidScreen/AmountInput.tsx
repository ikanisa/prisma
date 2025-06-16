
import React, { useRef, useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { formatCurrencyWithSpaces, unformatCurrencyWithSpaces } from '../../utils/formatCurrency';

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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove any non-numeric characters except decimal point
    const numericValue = e.target.value.replace(/[^\d.]/g, '');
    
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    let cleanValue = parts[0];
    if (parts.length > 1) {
      cleanValue += '.' + parts[1];
    }
    
    // Prevent negative values and ensure reasonable limits
    const numValue = parseFloat(cleanValue);
    if (cleanValue === '' || (!isNaN(numValue) && numValue >= 0)) {
      onChange(cleanValue);
    }
  }, [onChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const clearAmount = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }, [onChange]);

  const displayAmount = value ? formatCurrencyWithSpaces(value) : '';

  return (
    <div className="space-y-3">
      <Label 
        htmlFor="amount" 
        className={`text-sm font-semibold text-gray-700 transition-opacity duration-200 ${
          interacted ? 'opacity-0' : 'opacity-100'
        }`}
      >
        Amount (RWF)
      </Label>
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="amount"
          value={displayAmount}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Enter Amount"
          className={`
            h-14 text-lg font-medium text-right pr-12
            transition-all duration-200 ease-in-out
            border-2 rounded-xl
            ${isFocused 
              ? 'border-green-500 ring-4 ring-green-100 shadow-lg' 
              : 'border-gray-200 hover:border-gray-300'
            }
            focus:outline-none mobile-input
          `}
          style={{ fontSize: '16px' }}
          type="number"
          inputMode="decimal"
          pattern="[0-9]*"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          maxLength={15}
          min="0"
          step="any"
          readOnly={false}
          disabled={false}
        />
        
        {value && (
          <button
            type="button"
            onClick={clearAmount}
            onMouseDown={(e) => e.preventDefault()}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-400 hover:bg-gray-500 active:bg-gray-600 flex items-center justify-center transition-colors z-20 mobile-button"
            aria-label="Clear amount"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
      
      {/* RWF Currency Label */}
      <div className="text-sm text-gray-600 font-medium">
        Currency: RWF (Rwandan Franc)
      </div>
    </div>
  );
};

export default AmountInput;
