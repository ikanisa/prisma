// Authentication utilities for easyMO platform

export interface AuthUser {
  id: string;
  phone?: string;
  email?: string;
  role?: string;
}

export interface AuthContext {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

/**
 * Checks if current user has admin privileges
 */
export function isAdminUser(user: AuthUser | null): boolean {
  return user?.role === 'admin' || false;
}

/**
 * Validates phone number format for WhatsApp
 */
export function validatePhoneNumber(phone: string): boolean {
  // Basic validation for international phone numbers
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Normalizes phone number to international format
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Add + if missing
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  return normalized;
}

/**
 * Generates a secure random referral code
 */
export function generateReferralCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}