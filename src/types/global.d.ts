declare namespace easyMO {
  // Currency types for Rwanda
  type Currency = 'RWF' | 'USD' | 'EUR';
  
  // Common status types
  type Status = 'active' | 'inactive' | 'pending' | 'completed' | 'failed' | 'cancelled';
  
  // User roles across the platform
  type UserRole = 'admin' | 'user' | 'driver' | 'business_owner' | 'agent' | 'moderator';
  
  // WhatsApp message types
  type WhatsAppMessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact' | 'template' | 'interactive';
  
  // Payment methods
  type PaymentMethod = 'momo' | 'card' | 'bank' | 'cash' | 'crypto';
  
  // Agent domains
  type AgentDomain = 'payments' | 'transport' | 'commerce' | 'support' | 'onboarding' | 'general';
  
  // System configurations
  interface SystemConfig {
    whatsapp: {
      webhook_url: string;
      verify_token: string;
      business_phone_id: string;
    };
    payments: {
      default_currency: Currency;
      minimum_amount: number;
      maximum_amount: number;
    };
    ai: {
      default_model: string;
      temperature: number;
      max_tokens: number;
    };
  }
  
  // Common API response structure
  interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    metadata?: Record<string, any>;
  }
  
  // Pagination interface
  interface PaginationParams {
    page: number;
    limit: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }
  
  interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }
  
  // Location interface for Rwanda
  interface Location {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    province?: string;
    country: 'Rwanda';
    postal_code?: string;
  }
  
  // Phone number format for Rwanda
  interface PhoneNumber {
    number: string; // Format: +250XXXXXXXXX
    country_code: '+250';
    is_whatsapp: boolean;
    is_verified: boolean;
  }
  
  // Common date fields
  interface Timestamps {
    created_at: string;
    updated_at: string;
    deleted_at?: string;
  }
  
  // Base entity interface
  interface BaseEntity extends Timestamps {
    id: string;
  }
  
  // Error types
  interface ValidationError {
    field: string;
    message: string;
    code: string;
  }
  
  interface ApiError {
    code: string;
    message: string;
    details?: Record<string, any>;
    validation_errors?: ValidationError[];
  }
  
  // File upload interface
  interface FileUpload {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    url?: string;
    error?: string;
  }
  
  // Agent conversation context
  interface ConversationContext {
    user_id: string;
    session_id: string;
    current_intent?: string;
    current_domain?: AgentDomain;
    conversation_history: Array<{
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
    }>;
    user_preferences?: Record<string, any>;
    location?: Location;
  }
  
  // WhatsApp template parameters
  interface TemplateParams {
    [key: string]: string | number;
  }
  
  // System metrics
  interface SystemMetrics {
    active_users: number;
    total_messages: number;
    success_rate: number;
    avg_response_time: number;
    last_updated: string;
  }
}

// Global constants
declare const RWANDA_PROVINCES: readonly [
  'Kigali',
  'Northern',
  'Southern', 
  'Eastern',
  'Western'
];

declare const SUPPORTED_LANGUAGES: readonly [
  'en', // English
  'rw', // Kinyarwanda  
  'fr', // French
  'sw'  // Swahili
];

// Augment global Window interface for browser APIs
declare global {
  interface Window {
    easyMO: {
      config: easyMO.SystemConfig;
      user?: {
        id: string;
        role: easyMO.UserRole;
        permissions: string[];
      };
    };
  }
}

export {};