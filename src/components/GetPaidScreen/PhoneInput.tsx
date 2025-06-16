
import React, { useRef, useCallback, useState } from 'react';
import { Phone, X } from 'lucide-react';
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
    onChange(e.target.value);
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
        MOMO Number/Code
      </Label>
      
      <div className="relative">
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
          <Input
            ref={inputRef}
            id="phone"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Enter MOMO Number/Code"
            className={`
              pl-10 pr-12 h-14 text-lg font-medium
              transition-all duration-200 ease-in-out
              border-2 rounded-xl
              ${isFocused 
                ? 'border-blue-500 ring-4 ring-blue-100 shadow-lg' 
                : 'border-gray-200 hover:border-gray-300'
              }
              focus:outline-none
            `}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
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
              onClick={clearPhone}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-400 hover:bg-gray-500 active:bg-gray-600 flex items-center justify-center transition-colors z-20"
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
