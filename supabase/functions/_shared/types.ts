/**
 * REFACTOR: Centralized TypeScript type definitions
 * Replaces scattered 'any' types with proper domain models
 */

// WhatsApp Message Types
export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'interactive';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: WhatsAppMessage[];
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: 'messages';
    }>;
  }>;
}

// User Domain Types
export interface User {
  id: string;
  phone: string;
  momo_code: string;
  credits: number;
  created_at: string;
  updated_at?: string;
}

export interface UserCreate {
  phone: string;
  momo_code: string;
  credits?: number;
}

// Driver Domain Types
export interface Driver {
  id: string;
  user_id: string;
  full_name: string | null;
  momo_code: string;
  momo_number: string | null;
  vehicle_plate: string | null;
  plate_number: string | null;
  is_online: boolean;
  location_gps: any; // PostGIS geometry type
  driver_kind: 'moto' | 'car' | 'bus' | null;
  subscription_status: 'trial' | 'active' | 'inactive';
  created_at: string;
}

export interface DriverTripCreate {
  driver_id: string;
  from_text: string;
  to_text: string;
  origin: any; // PostGIS point
  destination: any; // PostGIS point
  seats: number;
  price_rwf: number;
  departure_time?: string;
  status?: 'active' | 'completed' | 'cancelled';
}

// Product Domain Types
export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  category?: string;
  vendor_id?: string;
  stock_quantity?: number;
  created_at: string;
}

// Conversation Domain Types
export interface ConversationMessage {
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  message: string;
  ts?: string;
}

// Agent Response Types
export interface AgentResponse {
  message: string;
  action?: 'redirect' | 'collect_payment' | 'show_products' | 'create_trip';
  data?: Record<string, any>;
  requiresHuman?: boolean;
}

// Payment Types
export interface PaymentRequest {
  amount: number;
  phone: string;
  description?: string;
  reference?: string;
}

// Event Types
export interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  event_date?: string;
  price?: number;
  organizer_user_id?: string;
  category?: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Utility Types
export type SupportedLanguage = 'en' | 'rw' | 'fr';

export interface CoordinatePoint {
  latitude: number;
  longitude: number;
}

// Error Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface BusinessError extends Error {
  code: string;
  statusCode?: number;
  details?: Record<string, any>;
}