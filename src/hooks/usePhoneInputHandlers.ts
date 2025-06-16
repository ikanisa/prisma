
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAIPhoneSuggestions } from './useAIPhoneSuggestions';
import { formatPhoneInput } from '@/utils/phoneValidation';
import { getSessionId } from '@/utils/sessionManager';
import { triggerHapticFeedback } from '@/utils/hapticFeedback';

interface UsePhoneInputHandlersProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
}

export const usePhoneInputHandlers = ({ value, onChange, onFocus }: UsePhoneInputHandlersProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { suggestions, getSuggestions, clearSuggestions } = useAIPhoneSuggestions();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = formatPhoneInput(e.target.value);
    onChange(numericValue);
    
    if (numericValue.length > 0) {
      triggerHapticFeedback();
      
      if (numericValue.length >= 2) {
        const sessionId = getSessionId();
        getSuggestions(numericValue, sessionId);
        setShowSuggestions(true);
      } else {
        clearSuggestions();
        setShowSuggestions(false);
      }
    } else {
      clearSuggestions();
      setShowSuggestions(false);
    }
  }, [onChange, getSuggestions, clearSuggestions]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus();
    triggerHapticFeedback();
    
    if (value.length >= 2) {
      setShowSuggestions(true);
    }
  }, [onFocus, value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  }, []);

  const handleSuggestionSelect = useCallback((selectedPhone: string) => {
    onChange(selectedPhone);
    setShowSuggestions(false);
    triggerHapticFeedback();
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }, [onChange]);

  const clearPhone = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
    clearSuggestions();
    setShowSuggestions(false);
    triggerHapticFeedback();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }, [onChange, clearSuggestions]);

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return {
    inputRef,
    isFocused,
    showSuggestions,
    suggestions,
    handleInputChange,
    handleFocus,
    handleBlur,
    handleSuggestionSelect,
    clearPhone
  };
};
