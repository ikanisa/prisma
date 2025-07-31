// Shared validation utilities
import { z } from 'zod';

// Rwanda phone number validation
export const rwandaPhoneSchema = z.string().regex(
  /^\+250[0-9]{9}$/,
  'Invalid Rwanda phone number format. Use +250XXXXXXXXX'
);

// Currency validation
export const currencySchema = z.enum(['RWF', 'USD', 'EUR']);

// Amount validation for Rwanda (minimum 100 RWF)
export const amountSchema = z.number().min(100, 'Minimum amount is 100 RWF');

// Language validation
export const languageSchema = z.enum(['en', 'rw', 'fr', 'sw']);

// Status validation
export const statusSchema = z.enum(['active', 'inactive', 'pending', 'completed', 'failed', 'cancelled']);

// User role validation
export const userRoleSchema = z.enum(['admin', 'user', 'driver', 'business_owner', 'agent', 'moderator']);

// WhatsApp message type validation
export const whatsappMessageTypeSchema = z.enum([
  'text', 'image', 'audio', 'video', 'document', 'location', 'contact', 'template', 'interactive'
]);

// Location validation for Rwanda
export const rwandaLocationSchema = z.object({
  latitude: z.number().min(-2.9).max(-1.0),  // Rwanda's latitude range
  longitude: z.number().min(28.8).max(30.9), // Rwanda's longitude range
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.enum(['Kigali', 'Northern', 'Southern', 'Eastern', 'Western']),
  country: z.literal('Rwanda'),
  postal_code: z.string().optional(),
});

// Common validation functions
export function validatePhoneNumber(phone: string): boolean {
  return rwandaPhoneSchema.safeParse(phone).success;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateAmount(amount: number, currency: string = 'RWF'): boolean {
  const minAmounts = { RWF: 100, USD: 1, EUR: 1 };
  const minAmount = minAmounts[currency as keyof typeof minAmounts] || 100;
  return amount >= minAmount;
}

export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle different input formats
  if (digits.startsWith('250')) {
    return '+' + digits;
  } else if (digits.startsWith('07') || digits.startsWith('08') || digits.startsWith('09')) {
    return '+250' + digits;
  } else if (digits.length === 9) {
    return '+250' + digits;
  }
  
  return phone; // Return original if no pattern matches
}

export function normalizeAmount(amount: number, currency: string = 'RWF'): number {
  // Round to 2 decimal places for non-RWF currencies, whole numbers for RWF
  if (currency === 'RWF') {
    return Math.round(amount);
  }
  return Math.round(amount * 100) / 100;
}