
import React from 'react';
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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and decimal point
    const numericValue = e.target.value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    const cleanValue = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : numericValue;
    
    onChange(cleanValue);
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <Label htmlFor="amount" className="text-base font-medium text-gray-800 dark:text-gray-200 truncate block">
        Amount (RWF) <span className="text-gray-500 text-sm font-normal">- Optional</span>
      </Label>
      
      <div className="relative">
        <Input
          id="amount"
          value={value}
          onChange={handleInputChange}
          onFocus={onFocus}
          placeholder="Enter amount (optional)…"
          className={`
            h-16 text-2xl font-bold pl-4 pr-4
            transition-all duration-300 ease-in-out
            border-2 rounded-xl
            mobile-input touch-action-manipulation
            ${value ? 'border-green-500 ring-4 ring-green-100 shadow-lg scale-[1.02] dark:ring-green-900' : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'}
            focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 focus:shadow-lg focus:scale-[1.02]
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder:text-gray-500 dark:placeholder:text-gray-400
          `}
          style={{
            fontSize: '24px',
            fontWeight: '800',
            caretColor: '#16a34a',
            WebkitUserSelect: 'text',
            userSelect: 'text',
            pointerEvents: 'auto',
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
            WebkitTapHighlightColor: 'transparent'
          }}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          maxLength={10}
          readOnly={false}
          disabled={false}
        />
      </div>
      
      {/* Validation hints - only show if amount is entered */}
      {value && parseFloat(value) > 0 && parseFloat(value) < 100 && (
        <div className="text-xs text-orange-500 dark:text-orange-400">
          Minimum amount is 100 RWF
        </div>
      )}
      
      {value && parseFloat(value) > 1000000 && (
        <div className="text-xs text-orange-500 dark:text-orange-400">
          Maximum amount is 1,000,000 RWF
        </div>
      )}

      {!value && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Leave empty to let payer enter amount
        </div>
      )}
    </div>
  );
};

export default AmountInput;
