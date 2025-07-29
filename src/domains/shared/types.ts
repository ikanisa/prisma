// Shared types across all domains
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Rwanda-specific types
export interface RwandaLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  province: typeof RWANDA_PROVINCES[number];
  country: 'Rwanda';
  postal_code?: string;
}

export interface RwandaPhoneNumber {
  number: string; // Format: +250XXXXXXXXX
  country_code: '+250';
  is_whatsapp: boolean;
  is_verified: boolean;
}

export const RWANDA_PROVINCES = [
  'Kigali',
  'Northern', 
  'Southern',
  'Eastern',
  'Western'
] as const;

export const SUPPORTED_LANGUAGES = [
  'en', // English
  'rw', // Kinyarwanda
  'fr', // French  
  'sw'  // Swahili
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
export type RwandaProvince = typeof RWANDA_PROVINCES[number];