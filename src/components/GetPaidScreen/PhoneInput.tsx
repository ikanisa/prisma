
import React, { useRef, useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import RecentContactsDropdown from '../RecentContactsDropdown';
import { useRecentContacts } from '../RecentContacts';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  showLabel: boolean;
  interacted: boolean;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  onFocus,
  showLabel,
  interacted
}) => {
  const [showRecentContacts, setShowRecentContacts] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { contacts } = useRecentContacts();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric input, max 12 characters
    const numericValue = e.target.value.replace(/\D/g, '').slice(0, 12);
    onChange(numericValue);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowRecentContacts(true);
    onFocus();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsFocused(false);
      setShowRecentContacts(false);
    }, 150);
  }, []);

  const handleSelectContact = useCallback((selectedPhone: string) => {
    onChange(selectedPhone);
    setShowRecentContacts(false);
    setIsFocused(false);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [onChange]);

  const clearPhone = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }, [onChange]);

  return (
    <div className="space-y-3">
      <Label 
        htmlFor="phone" 
        className={`text-sm font-semibold text-gray-700 transition-opacity duration-200 ${
          showLabel ? 'opacity-100' : 'opacity-0'
        }`}
      >
        MoMo Number/Pay Code
      </Label>
      
      <div className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            id="phone"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Enter MoMo Number or Pay Code"
            className={`
              h-14 text-lg font-medium pr-12
              transition-all duration-200 ease-in-out
              border-2 rounded-xl
              ${isFocused 
                ? 'border-blue-500 ring-4 ring-blue-100 shadow-lg' 
                : 'border-gray-200 hover:border-gray-300'
              }
              focus:outline-none mobile-input
            `}
            style={{ fontSize: '16px' }}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
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
              onMouseDown={(e) => e.preventDefault()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-400 hover:bg-gray-500 active:bg-gray-600 flex items-center justify-center transition-colors z-20 mobile-button"
              aria-label="Clear phone number"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        <RecentContactsDropdown
          contacts={contacts}
          onSelectContact={handleSelectContact}
          isVisible={showRecentContacts && contacts.length > 0}
        />
      </div>
    </div>
  );
};

export default PhoneInput;
