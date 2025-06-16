
import React, { useRef, useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  interacted: boolean;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
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
    // Only allow numeric input, max 12 characters for Rwanda MoMo
    const numericValue = e.target.value.replace(/\D/g, '').slice(0, 12);
    onChange(numericValue);
    if (numericValue.length > 0) {
      triggerHapticFeedback();
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

  const clearPhone = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
    triggerHapticFeedback();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }, [onChange, triggerHapticFeedback]);

  return (
    <div className="space-y-3 animate-fade-in">
      <Label htmlFor="phone" className="text-base font-medium text-gray-800 dark:text-gray-200 truncate block">
        Phone Number or Code
      </Label>
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="phone"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Enter Phone Number or Code…"
          className={`
            h-16 text-2xl font-bold pl-4 pr-12
            transition-all duration-300 ease-in-out
            border-2 rounded-xl
            mobile-input touch-action-manipulation
            ${isFocused ? 'border-blue-500 ring-4 ring-blue-100 shadow-lg scale-[1.02] dark:ring-blue-900' : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'}
            focus:outline-none
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder:text-gray-500 dark:placeholder:text-gray-400
          `}
          style={{
            fontSize: '24px',
            fontWeight: '800',
            // Prevent zoom on iOS
            WebkitAppearance: 'none'
          }}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="tel"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          maxLength={12}
          readOnly={false}
          disabled={false}
        />
        
        {value && (
          <button
            type="button"
            onClick={clearPhone}
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
            `}
            aria-label="Clear phone number"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
      
      {/* Rwanda MoMo Helper */}
      <div className="flex items-center justify-between text-sm">
        {value && value.length >= 4 && (
          <span className="text-blue-600 dark:text-blue-400 font-semibold">
            {value.length >= 10 ? 'MoMo Number' : 'Pay Code'}
          </span>
        )}
      </div>
      
      {/* Validation hints */}
      {value && value.length > 0 && value.length < 4 && (
        <div className="text-xs text-orange-500 dark:text-orange-400">
          Enter at least 4 digits
        </div>
      )}
    </div>
  );
};

export default PhoneInput;
