import { useState, useCallback } from 'react';

interface SecurityValidationConfig {
  maxLength?: number;
  allowHtml?: boolean;
  allowSpecialChars?: boolean;
  requireNumbers?: boolean;
  requireLetters?: boolean;
  minPasswordStrength?: 'weak' | 'medium' | 'strong';
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedValue: string;
  securityScore: number;
}

export function useSecurityValidation(config: SecurityValidationConfig = {}) {
  const [validationCache, setValidationCache] = useState<Map<string, ValidationResult>>(new Map());

  const validateAndSanitize = useCallback((input: string, type: 'text' | 'email' | 'phone' | 'password' | 'url' = 'text'): ValidationResult => {
    // Check cache first
    const cacheKey = `${type}-${input}-${JSON.stringify(config)}`;
    if (validationCache.has(cacheKey)) {
      return validationCache.get(cacheKey)!;
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let securityScore = 100;
    let sanitizedValue = input;

    // Basic length validation
    if (config.maxLength && input.length > config.maxLength) {
      errors.push(`Input exceeds maximum length of ${config.maxLength} characters`);
      sanitizedValue = input.substring(0, config.maxLength);
      securityScore -= 20;
    }

    // XSS and injection pattern detection
    const dangerousPatterns = [
      { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, name: 'Script tags', severity: 'high' },
      { pattern: /javascript:/gi, name: 'JavaScript protocol', severity: 'high' },
      { pattern: /on\w+\s*=/gi, name: 'Event handlers', severity: 'medium' },
      { pattern: /data:text\/html/gi, name: 'HTML data URLs', severity: 'high' },
      { pattern: /<iframe[\s\S]*?>/gi, name: 'Iframe tags', severity: 'medium' },
      { pattern: /eval\s*\(/gi, name: 'Eval functions', severity: 'high' },
      { pattern: /expression\s*\(/gi, name: 'CSS expressions', severity: 'medium' },
      { pattern: /vbscript:/gi, name: 'VBScript protocol', severity: 'high' },
      { pattern: /&#x/gi, name: 'Hex entities', severity: 'low' },
      { pattern: /\\\\/gi, name: 'Double backslashes', severity: 'low' }
    ];

    // SQL injection patterns
    const sqlPatterns = [
      { pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, name: 'SQL keywords', severity: 'high' },
      { pattern: /(\b(OR|AND)\s+[\w"']+\s*(=|LIKE)\s*[\w"']+)/gi, name: 'SQL conditions', severity: 'medium' },
      { pattern: /(--|\/\*|\*\/|;)/g, name: 'SQL comments/terminators', severity: 'medium' },
      { pattern: /(\b\d+\s*=\s*\d+\b)/g, name: 'Boolean SQL injection', severity: 'high' }
    ];

    // Check dangerous patterns
    [...dangerousPatterns, ...sqlPatterns].forEach(({ pattern, name, severity }) => {
      if (pattern.test(input)) {
        if (severity === 'high') {
          errors.push(`Potentially dangerous ${name} detected`);
          securityScore -= 40;
        } else if (severity === 'medium') {
          warnings.push(`Suspicious ${name} detected`);
          securityScore -= 20;
        } else {
          warnings.push(`Minor ${name} detected`);
          securityScore -= 10;
        }
        
        // Remove dangerous content if not allowed
        if (!config.allowHtml || severity === 'high') {
          sanitizedValue = sanitizedValue.replace(pattern, '');
        }
      }
    });

    // Type-specific validation
    switch (type) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedValue)) {
          errors.push('Invalid email format');
          securityScore -= 30;
        }
        break;

      case 'phone':
        // Rwanda phone number validation
        const phonePattern = /^(\+250|250|0)[0-9]{9}$/;
        if (!phonePattern.test(sanitizedValue.replace(/\s+/g, ''))) {
          errors.push('Invalid phone number format for Rwanda');
          securityScore -= 30;
        }
        sanitizedValue = sanitizedValue.replace(/\s+/g, ''); // Remove spaces
        break;

      case 'password':
        const passwordValidation = validatePassword(sanitizedValue, config.minPasswordStrength);
        errors.push(...passwordValidation.errors);
        warnings.push(...passwordValidation.warnings);
        securityScore -= passwordValidation.penalty;
        break;

      case 'url':
        try {
          const url = new URL(sanitizedValue);
          if (!['http:', 'https:'].includes(url.protocol)) {
            errors.push('Only HTTP and HTTPS URLs are allowed');
            securityScore -= 40;
          }
        } catch {
          errors.push('Invalid URL format');
          securityScore -= 30;
        }
        break;
    }

    // Final sanitization
    if (!config.allowSpecialChars) {
      sanitizedValue = sanitizedValue.replace(/[<>'"&]/g, '');
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue,
      securityScore: Math.max(0, securityScore)
    };

    // Cache the result
    setValidationCache(prev => new Map(prev).set(cacheKey, result));

    return result;
  }, [config, validationCache]);

  const clearCache = useCallback(() => {
    setValidationCache(new Map());
  }, []);

  return {
    validateAndSanitize,
    clearCache
  };
}

function validatePassword(password: string, minStrength: 'weak' | 'medium' | 'strong' = 'medium') {
  const errors: string[] = [];
  const warnings: string[] = [];
  let penalty = 0;

  // Basic requirements
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
    penalty += 40;
  }

  if (password.length < 12 && minStrength !== 'weak') {
    warnings.push('Password should be at least 12 characters for better security');
    penalty += 10;
  }

  // Character requirements
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
    penalty += 20;
  }

  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
    penalty += 20;
  }

  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
    penalty += 20;
  }

  if (!hasSpecialChars && minStrength === 'strong') {
    errors.push('Password must contain at least one special character');
    penalty += 20;
  } else if (!hasSpecialChars) {
    warnings.push('Consider adding special characters for stronger security');
    penalty += 10;
  }

  // Common patterns
  const commonPatterns = [
    /(.)\1{2,}/g, // Repeated characters
    /123456|654321|qwerty|password|admin/gi, // Common sequences
    /(.{1,3})\1{2,}/g // Repeated patterns
  ];

  commonPatterns.forEach(pattern => {
    if (pattern.test(password)) {
      warnings.push('Password contains common patterns - consider making it more unique');
      penalty += 15;
    }
  });

  return { errors, warnings, penalty };
}

export default useSecurityValidation;