/**
 * Production-ready validation utilities
 * Centralized validation logic for edge functions
 */

import { logger } from './logger.ts';

// Environment validation
export function validateRequiredEnvVars(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !Deno.env.get(varName));
  
  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(error, null, { missingVars: missing });
    throw new Error(error);
  }
  
  logger.info('Environment validation passed', { validatedVars: requiredVars });
}

// Request validation schemas
export interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: string[];
  };
}

export function validateRequestBody(data: any, schema: ValidationSchema): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Required field check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required`);
      continue;
    }
    
    // Skip further validation if field is not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }
    
    // Type validation
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push(`Field '${field}' must be of type ${rules.type}, got ${actualType}`);
        continue;
      }
    }
    
    // String-specific validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`Field '${field}' must be at least ${rules.minLength} characters long`);
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`Field '${field}' must be at most ${rules.maxLength} characters long`);
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`Field '${field}' does not match required pattern`);
      }
      
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`Field '${field}' must be one of: ${rules.enum.join(', ')}`);
      }
    }
  }
  
  if (errors.length > 0) {
    logger.warn('Request validation failed', { errors, data });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Common validation patterns
export const ValidationPatterns = {
  phone: /^\+?[1-9]\d{1,14}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  whatsappNumber: /^\+\d{1,15}$/,
  rwandaPhone: /^(\+250|250)?[0-9]{9}$/
};

// Sanitization utilities
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, 10000); // Prevent extremely long inputs
}

export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Rwanda-specific formatting
  if (cleaned.startsWith('250')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+250' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+') && cleaned.length === 9) {
    return '+250' + cleaned;
  }
  
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
}