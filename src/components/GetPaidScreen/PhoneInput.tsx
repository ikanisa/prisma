
import React, { useState, useEffect } from 'react';
import { X, Bookmark, BookmarkCheck } from 'lucide-react';
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

const SAVED_PHONE_KEY = 'easymo_saved_phone';

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  onFocus,
  interacted
}) => {
  const [savedPhone, setSavedPhone] = useState<string>('');
  const [isPhoneSaved, setIsPhoneSaved] = useState<boolean>(false);

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

  // Load saved phone on component mount
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_PHONE_KEY);
    if (saved) {
      setSavedPhone(saved);
      setIsPhoneSaved(value === saved);
      // Auto-populate if no current value
      if (!value && saved) {
        onChange(saved);
      }
    }
  }, []);

  // Update saved status when value changes
  useEffect(() => {
    setIsPhoneSaved(value === savedPhone && value.length > 0);
  }, [value, savedPhone]);

  const handleSavePhone = () => {
    if (value && value.length >= 4) {
      localStorage.setItem(SAVED_PHONE_KEY, value);
      setSavedPhone(value);
      setIsPhoneSaved(true);
    }
  };

  const handleUnsavePhone = () => {
    localStorage.removeItem(SAVED_PHONE_KEY);
    setSavedPhone('');
    setIsPhoneSaved(false);
  };

  const handleBookmarkClick = () => {
    if (isPhoneSaved) {
      handleUnsavePhone();
    } else {
      handleSavePhone();
    }
  };

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
            h-16 text-2xl font-bold pl-4 pr-20
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
        
        {/* Bookmark/Save Icon */}
        {value && value.length >= 4 && (
          <button
            type="button"
            onClick={handleBookmarkClick}
            onMouseDown={e => e.preventDefault()}
            className={`
              absolute right-12 top-1/2 -translate-y-1/2 
              w-8 h-8 rounded-full 
              ${isPhoneSaved 
                ? 'bg-green-500 hover:bg-green-600 active:bg-green-700' 
                : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
              }
              dark:bg-opacity-90
              flex items-center justify-center 
              transition-all duration-200 
              mobile-button
              hover:scale-110 active:scale-95
              z-10
            `}
            aria-label={isPhoneSaved ? "Remove saved number" : "Save number for regular use"}
            title={isPhoneSaved ? "Remove saved number" : "Save for regular use"}
          >
            {isPhoneSaved ? (
              <BookmarkCheck className="w-4 h-4 text-white" />
            ) : (
              <Bookmark className="w-4 h-4 text-white" />
            )}
          </button>
        )}

        {/* Clear Button */}
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
              z-10
            `}
            aria-label="Clear phone number"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}

        <AIPhoneSuggestions
          suggestions={suggestions}
          onSelect={handleSuggestionSelect}
          isVisible={showSuggestions}
          isLoading={false}
        />
      </div>
      
      {/* Status Messages */}
      <div className="flex items-center justify-between text-sm">
        {savedPhone && value === savedPhone && (
          <div className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
            <BookmarkCheck className="w-3 h-3" />
            <span>Saved number</span>
          </div>
        )}
        {value && value.length >= 4 && value !== savedPhone && (
          <div className="text-blue-600 dark:text-blue-400 text-xs">
            Click bookmark to save for regular use
          </div>
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
