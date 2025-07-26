import { useState, useCallback } from 'react';

interface SanitizationOptions {
  maxLength?: number;
  allowHtml?: boolean;
  allowNumbers?: boolean;
  allowSpecialChars?: boolean;
  customPattern?: RegExp;
}

export function useSecureInput(initialValue: string = '', options: SanitizationOptions = {}) {
  const {
    maxLength = 1000,
    allowHtml = false,
    allowNumbers = true,
    allowSpecialChars = true,
    customPattern
  } = options;

  const [value, setValue] = useState<string>(initialValue);
  const [isValid, setIsValid] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const sanitize = useCallback((input: string): string => {
    let sanitized = input;

    // Truncate to max length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Remove HTML if not allowed
    if (!allowHtml) {
      sanitized = sanitized
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/&lt;script/gi, '') // Remove encoded script tags
        .replace(/&gt;/gi, '>') // Decode basic entities safely
        .replace(/&lt;/gi, '<')
        .replace(/&quot;/gi, '"')
        .replace(/&#x27;/gi, "'")
        .replace(/&#x2F;/gi, '/')
        .replace(/&amp;/gi, '&'); // Decode amp last to avoid double decoding
    }

    // Remove numbers if not allowed
    if (!allowNumbers) {
      sanitized = sanitized.replace(/\d/g, '');
    }

    // Remove special characters if not allowed
    if (!allowSpecialChars) {
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
    }

    // Apply custom pattern if provided
    if (customPattern) {
      const matches = sanitized.match(customPattern);
      sanitized = matches ? matches.join('') : '';
    }

    return sanitized.trim();
  }, [maxLength, allowHtml, allowNumbers, allowSpecialChars, customPattern]);

  const validate = useCallback((input: string): { isValid: boolean; error: string } => {
    if (input.length === 0) {
      return { isValid: true, error: '' };
    }

    if (input.length > maxLength) {
      return { isValid: false, error: `Input exceeds maximum length of ${maxLength} characters` };
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /javascript:/i,
      /<script/i,
      /on\w+\s*=/i,
      /data:text\/html/i,
      /vbscript:/i,
      /expression\s*\(/i,
      /@import/i,
      /url\s*\(/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(input)) {
        return { isValid: false, error: 'Input contains potentially dangerous content' };
      }
    }

    return { isValid: true, error: '' };
  }, [maxLength]);

  const updateValue = useCallback((newValue: string) => {
    const sanitized = sanitize(newValue);
    const validation = validate(sanitized);
    
    setValue(sanitized);
    setIsValid(validation.isValid);
    setError(validation.error);
    
    return {
      value: sanitized,
      isValid: validation.isValid,
      error: validation.error
    };
  }, [sanitize, validate]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setIsValid(true);
    setError('');
  }, [initialValue]);

  return {
    value,
    isValid,
    error,
    updateValue,
    reset,
    sanitize
  };
}

// Specific hooks for common use cases
export function useSecureEmail() {
  return useSecureInput('', {
    maxLength: 254,
    allowHtml: false,
    allowSpecialChars: true,
    customPattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  });
}

export function useSecurePhoneNumber() {
  return useSecureInput('', {
    maxLength: 20,
    allowHtml: false,
    allowNumbers: true,
    allowSpecialChars: true,
    customPattern: /^[\+]?[0-9\-\(\)\s]{10,20}$/
  });
}

export function useSecureText(maxLength: number = 500) {
  return useSecureInput('', {
    maxLength,
    allowHtml: false,
    allowNumbers: true,
    allowSpecialChars: true
  });
}

export function useSecureName() {
  return useSecureInput('', {
    maxLength: 100,
    allowHtml: false,
    allowNumbers: false,
    allowSpecialChars: true,
    customPattern: /^[a-zA-Z\s\'-]{1,100}$/
  });
}