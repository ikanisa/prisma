import { supabaseClient } from "../client.ts";
/**
 * REFACTOR: Enhanced TypeScript type definitions
 * Consolidated domain models for all business contexts
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =======================================================================
// Shared Types and Interfaces for Edge Functions
// =======================================================================

// Standard response formats
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export type FunctionResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Logging interfaces
export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  function: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: string;
  requestId?: string;
  userId?: string;
}

export interface PerformanceMetrics {
  functionName: string;
  executionTime: number;
  memoryUsage?: number;
  timestamp: string;
  requestId?: string;
}

// Authentication and authorization
export interface AuthContext {
  userId?: string;
  role?: string;
  permissions?: string[];
  isAuthenticated: boolean;
}

// Database connection
export interface DatabaseConfig {
  url: string;
  poolSize?: number;
  timeout?: number;
}

// Rate limiting
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: any) => string;
}

// Input validation schemas (using Zod)
export interface ValidationSchema<T> {
  parse: (data: unknown) => T;
  safeParse: (data: unknown) => { success: boolean; data?: T; error?: any };
}

// Common error codes
export enum ErrorCodes {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD = 'DUPLICATE_RECORD',
  
  // External API errors
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED'
}

// Common HTTP status codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

// Environment variable types
export interface EnvironmentVariables {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY?: string;
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_ID?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
  [key: string]: string | undefined;
}

// Request context
export interface RequestContext {
  requestId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  startTime: number;
}

// Function configuration
export interface FunctionConfig {
  name: string;
  domain: string;
  version: string;
  requiresAuth: boolean;
  rateLimit?: RateLimitConfig;
  timeout?: number;
  memory?: number;
}

// Audit log entry
export interface AuditLogEntry {
  id: string;
  functionName: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    database: boolean;
    externalApis: boolean;
    memory: boolean;
    disk: boolean;
  };
  details?: Record<string, any>;
}

// ============================================================================
// Core Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================================================
// Unified Listings (Products, Produce, Properties, Vehicles)
// ============================================================================

export const ListingTypeSchema = z.enum(['product', 'produce', 'property', 'vehicle', 'hardware']);
export type ListingType = z.infer<typeof ListingTypeSchema>;

export const ListingStatusSchema = z.enum(['active', 'inactive', 'sold', 'archived']);
export type ListingStatus = z.infer<typeof ListingStatusSchema>;

export interface UnifiedListing {
  id: string;
  listing_type: ListingType;
  title: string;
  description?: string;
  price?: number;
  vendor_id?: string;
  metadata: Record<string, any>;
  location_gps?: { lat: number; lng: number };
  images: string[];
  tags: string[];
  status: ListingStatus;
  visibility: 'public' | 'private' | 'draft';
  featured: boolean;
  stock_quantity: number;
  unit_of_measure?: string;
  category?: string;
  subcategory?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// ============================================================================
// Unified Orders
// ============================================================================

export const OrderTypeSchema = z.enum(['marketplace', 'produce', 'pharmacy', 'hardware', 'services']);
export type OrderType = z.infer<typeof OrderTypeSchema>;

export const OrderStatusSchema = z.enum(['pending', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled', 'refunded']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const PaymentStatusSchema = z.enum(['pending', 'paid', 'failed', 'refunded']);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export interface OrderItem {
  listing_id: string;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  metadata?: Record<string, any>;
}

export interface UnifiedOrder {
  id: string;
  order_type: OrderType;
  customer_phone: string;
  customer_id?: string;
  vendor_id?: string;
  items: OrderItem[];
  listing_ids: string[];
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  total_amount: number;
  currency: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: string;
  payment_reference?: string;
  delivery_method?: string;
  delivery_address?: Record<string, any>;
  delivery_notes?: string;
  domain_metadata: Record<string, any>;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  cancelled_at?: string;
}

// ============================================================================
// Conversations & Messages
// ============================================================================

export const ChannelTypeSchema = z.enum(['whatsapp', 'telegram', 'web', 'phone', 'email']);
export type ChannelType = z.infer<typeof ChannelTypeSchema>;

export const SenderTypeSchema = z.enum(['user', 'agent', 'system', 'bot']);
export type SenderType = z.infer<typeof SenderTypeSchema>;

export const MessageTypeSchema = z.enum(['text', 'image', 'document', 'location', 'interactive']);
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const MessageStatusSchema = z.enum(['sent', 'delivered', 'read', 'failed']);
export type MessageStatus = z.infer<typeof MessageStatusSchema>;

export interface Conversation {
  id: string;
  contact_id: string;
  contact_phone?: string;
  channel: ChannelType;
  thread_id?: string;
  agent_id?: string;
  status: 'active' | 'closed' | 'archived';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_id: string;
  content: string;
  message_type: MessageType;
  metadata: Record<string, any>;
  thread_id?: string;
  reply_to_id?: string;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// WhatsApp Types (Legacy - keep for compatibility)
// ============================================================================

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

// ============================================================================
// User Domain Types
// ============================================================================

export const UserRoleSchema = z.enum(['admin', 'user', 'driver', 'farmer', 'business_owner', 'support']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export interface User {
  id: string;
  phone: string;
  momo_code: string;
  email?: string;
  credits: number;
  referral_code?: string;
  preferred_language: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface UserCreate {
  phone: string;
  momo_code: string;
  email?: string;
  credits?: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Driver Domain Types
// ============================================================================

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

// ============================================================================
// Product Domain Types (Legacy - migrating to UnifiedListing)
// ============================================================================

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

// ============================================================================
// Payment Types
// ============================================================================

export const PaymentMethodSchema = z.enum(['momo', 'cash', 'card', 'bank_transfer']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export interface PaymentRequest {
  amount: number;
  currency?: string;
  phone: string;
  description?: string;
  reference?: string;
  method?: PaymentMethod;
}

// ============================================================================
// Event Types
// ============================================================================

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

// ============================================================================
// Utility Types
// ============================================================================

export type SupportedLanguage = 'en' | 'rw' | 'fr';

export interface CoordinatePoint {
  latitude: number;
  longitude: number;
}

// ============================================================================
// Error Types
// ============================================================================

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

// ============================================================================
// Utility Functions
// ============================================================================

export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  };
}

export function createErrorResponse(error: string, message?: string, code?: string): ApiResponse {
  return {
    success: false,
    error,
    message,
    code
  };
}

export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle Rwanda numbers
  if (cleaned.startsWith('250')) {
    return cleaned;
  } else if (cleaned.startsWith('07') || cleaned.startsWith('08') || cleaned.startsWith('09')) {
    return '250' + cleaned;
  } else if (cleaned.length === 9) {
    return '250' + cleaned;
  }
  
  return cleaned;
}
