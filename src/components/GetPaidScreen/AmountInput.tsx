
import React, { useRef, useCallback, useState } from 'react';
import { DollarSign, X } from 'lucide-react';
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
    const unformattedValue = unformatCurrencyWithSpaces(e.target.value);
    onChange(unformattedValue);
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

  const displayAmount = formatCurrencyWithSpaces(value);

  return (
    <div className="space-y-3">
      <Label 
        htmlFor="amount" 
        className={`text-sm font-semibold text-gray-700 transition-opacity duration-200 ${
          interacted ? 'opacity-0' : 'opacity-100'
        }`}
      >
        Amount
      </Label>
      
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
        <Input
          ref={inputRef}
          id="amount"
          value={displayAmount}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="0"
          className={`
            pl-10 pr-12 h-14 text-lg font-medium text-right
            transition-all duration-200 ease-in-out
            border-2 rounded-xl
            ${isFocused 
              ? 'border-green-500 ring-4 ring-green-100 shadow-lg' 
              : 'border-gray-200 hover:border-gray-300'
            }
            focus:outline-none
          `}
          type="text"
          inputMode="numeric"
          pattern="[0-9,]*"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          maxLength={15}
          readOnly={false}
          disabled={false}
        />
        
        {value && (
          <button
            type="button"
            onClick={clearAmount}
            onMouseDown={(e) => e.preventDefault()}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-400 hover:bg-gray-500 active:bg-gray-600 flex items-center justify-center transition-colors z-20"
            aria-label="Clear amount"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
      
      {/* FRW Currency Label */}
      <div className="text-sm text-gray-600 font-medium">
        Currency: FRW (Rwandan Franc)
      </div>
    </div>
  );
};

export default AmountInput;
