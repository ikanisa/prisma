import { supabaseClient } from "../client.ts";
export function validateRequiredEnvVars(requiredVars: string[]) {
  const missing = requiredVars.filter(varName => !Deno.env.get(varName));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export const ValidationPatterns = {
  phone: /^(\+?250|0)?[7-9][0-9]{8}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  amount: /^\d+(\.\d{1,2})?$/
};

interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

interface ValidationSchema {
  [key: string]: ValidationRule;
}

export function validateRequestBody(data: any, schema: ValidationSchema) {
  const errors: string[] = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Check required fields
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    // Skip validation if field is not provided and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }
    
    // Type validation
    if (rules.type) {
      const actualType = typeof value;
      if (rules.type === 'number' && actualType !== 'number') {
        if (isNaN(Number(value))) {
          errors.push(`${field} must be a number`);
          continue;
        }
      } else if (rules.type !== actualType) {
        errors.push(`${field} must be of type ${rules.type}`);
        continue;
      }
    }
    
    // Pattern validation
    if (rules.pattern && typeof value === 'string') {
      if (!rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
    }
    
    // String length validation
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be no more than ${rules.maxLength} characters`);
      }
    }
    
    // Number range validation
    if (typeof value === 'number') {
      if (rules.min && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }
      if (rules.max && value > rules.max) {
        errors.push(`${field} must be no more than ${rules.max}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
