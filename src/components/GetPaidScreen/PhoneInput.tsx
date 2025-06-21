
import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import AIPhoneSuggestions from './AIPhoneSuggestions';
import { usePhoneInputHandlers } from '@/hooks/usePhoneInputHandlers';

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
  const {
    inputRef,
    isFocused,
    showSuggestions,
    suggestions,
    handleInputChange,
    handleFocus,
    handleBlur,
    handleSuggestionSelect,
    clearPhone
  } = usePhoneInputHandlers({ value, onChange, onFocus });

  return (
    <div className="space-y-3 animate-fade-in relative">
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
            h-16 text-2xl font-bold pl-4 pr-4
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
            caretColor: '#2563eb',
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
          autoComplete="tel"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          maxLength={12}
          readOnly={false}
          disabled={false}
        />

        <AIPhoneSuggestions
          suggestions={suggestions}
          onSelect={handleSuggestionSelect}
          isVisible={showSuggestions}
          isLoading={false}
        />
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
