import { z } from 'zod';

// Environment variable validation
export function validateRequiredEnvVars(vars: string[]): void {
  const missing = vars.filter(varName => !Deno.env.get(varName));
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Common validation schemas
export const phoneNumberSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

export const emailSchema = z.string()
  .email('Invalid email format');

export const uuidSchema = z.string()
  .uuid('Invalid UUID format');

export const timestampSchema = z.string()
  .datetime('Invalid timestamp format');

// Payment validation schemas  
export const paymentAmountSchema = z.number()
  .positive('Amount must be positive')
  .max(1000000, 'Amount too large');

export const currencySchema = z.enum(['RWF', 'USD', 'EUR'], {
  errorMap: () => ({ message: 'Invalid currency code' })
});

// WhatsApp message validation
export const whatsappMessageSchema = z.object({
  to: phoneNumberSchema,
  type: z.enum(['text', 'image', 'document', 'audio', 'video']),
  content: z.string().min(1, 'Content cannot be empty').max(4096, 'Content too long'),
});

// Sanitization helpers
export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function sanitizeText(text: string): string {
  return text.replace(/[<>&"']/g, (char) => {
    const map: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#x27;'
    };
    return map[char] || char;
  });
}