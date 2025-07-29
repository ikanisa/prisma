// Common types used across the easyMO platform
import { z } from 'zod';

export type Language = 'en' | 'fr' | 'rw';
export type Status = 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled';
export type Environment = 'development' | 'staging' | 'production';

export interface Timestamps {
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: Status;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: unknown;
}

// Location types
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location extends Coordinates {
  address?: string;
  city?: string;
  country?: string;
}

// File upload types
export interface FileUpload {
  filename: string;
  size: number;
  mimetype: string;
  url?: string;
  path?: string;
}

// Contact types
export interface Contact {
  id: string;
  phone_number: string;
  name?: string;
  email?: string;
  preferred_language: Language;
  status: Status;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  first_contact_date: string;
  last_interaction_date?: string;
  total_conversations: number;
  total_orders: number;
  total_spent: number;
}

// User types
export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  role?: string;
  status: Status;
  preferred_language: Language;
  credits: number;
  referral_code?: string;
  referred_by?: string;
}

// Business types
export type BusinessCategory = 'restaurant' | 'retail' | 'service' | 'pharmacy' | 'transport' | 'agriculture' | 'other';

export interface Business {
  id: string;
  name: string;
  category: BusinessCategory;
  phone_number: string;
  address?: string;
  description?: string;
  website?: string;
  status: Status;
  subscription_status: string;
  owner_user_id?: string;
  location_gps?: Coordinates;
  rating: number;
  reviews_count: number;
}

// Message types
export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contact';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type SenderRole = 'user' | 'agent' | 'system' | 'bot';

export interface Message {
  id: string;
  conversation_id?: string;
  phone_number: string;
  sender_role: SenderRole;
  message_text?: string;
  message_type: MessageType;
  message_status: MessageStatus;
  direction: 'inbound' | 'outbound';
  agent_id?: string;
  model_used?: string;
  confidence_score?: number;
  processing_time_ms?: number;
  media_url?: string;
  media_type?: string;
  media_size?: number;
  reply_to_message_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  delivered_at?: string;
  read_at?: string;
}

// Conversation types
export type ConversationType = 'support' | 'sales' | 'service' | 'bridge';
export type ConversationStatus = 'active' | 'paused' | 'completed' | 'archived';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface Conversation {
  id: string;
  phone_number: string;
  contact_name?: string;
  session_id: string;
  conversation_type: ConversationType;
  status: ConversationStatus;
  priority: Priority;
  assigned_agent?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  created_at: string;
  updated_at: string;
  last_message_at: string;
  total_messages: number;
  satisfaction_score?: number;
  resolution_time_minutes?: number;
}

// Payment types
export interface Payment {
  id: string;
  amount: number;
  currency: string;
  phone_number: string;
  reference?: string;
  description?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method: string;
  transaction_id?: string;
  created_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

// Order types
export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name?: string;
  product_image?: string;
}

export interface Order {
  id: string;
  buyer_phone: string;
  seller_phone?: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  delivery_address?: string;
  delivery_notes?: string;
  created_at: string;
  updated_at: string;
  estimated_delivery?: string;
  metadata?: Record<string, unknown>;
}

// Product types
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  category: string;
  subcategory?: string;
  stock_quantity?: number;
  unit?: string;
  image_urls?: string[];
  seller_phone?: string;
  business_id?: string;
  status: Status;
  featured: boolean;
  rating?: number;
  reviews_count: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// System metrics
export type MetricType = 'performance' | 'business' | 'technical' | 'security';

export interface SystemMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_type: MetricType;
  measurement_unit?: string;
  tags?: Record<string, unknown>;
  dimensions?: Record<string, unknown>;
  timestamp: string;
  source: string;
  environment: Environment;
  created_at: string;
}