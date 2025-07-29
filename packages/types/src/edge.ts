// Edge Function types for easyMO platform
import { z } from 'zod';
import type { ApiResponse, Message, Payment, Order, Conversation } from './common.js';

// Edge Function Request/Response Types
export interface EdgeFunctionContext {
  user_id?: string;
  phone_number?: string;
  request_id: string;
  function_name: string;
  environment: string;
  timestamp: string;
}

export interface EdgeFunctionResponse<T = unknown> extends ApiResponse<T> {
  execution_time_ms?: number;
  function_name: string;
  request_id: string;
}

// WhatsApp Webhook Types
export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'button' | 'interactive';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  document?: {
    id: string;
    filename: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  button?: {
    text: string;
    payload: string;
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
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  context?: {
    from: string;
    id: string;
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
          errors?: Array<{
            code: number;
            title: string;
            message: string;
          }>;
        }>;
      };
      field: 'messages';
    }>;
  }>;
}

// AI Agent Types
export interface AgentConfig {
  id: string;
  name: string;
  code: string;
  description?: string;
  system_prompt?: string;
  temperature: number;
  tools: string[];
  active: boolean;
  assistant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentPersona {
  id: string;
  agent_id: string;
  personality?: string;
  tone?: string;
  language: string;
  instructions?: string;
  updated_at: string;
}

export interface AgentExecutionLog {
  id: string;
  function_name: string;
  execution_time_ms: number;
  success_status: boolean;
  error_details?: string;
  input_data?: Record<string, unknown>;
  model_used?: string;
  user_id?: string;
  timestamp: string;
}

// Edge Function Input/Output Schemas
export const SendMessageInputSchema = z.object({
  phone_number: z.string().regex(/^\+[1-9]\d{1,14}$/),
  message_text: z.string().min(1).max(4096),
  message_type: z.enum(['text', 'image', 'document', 'audio', 'video']).default('text'),
  media_url: z.string().url().optional(),
  buttons: z.array(z.object({
    id: z.string(),
    title: z.string().max(20),
  })).max(3).optional(),
  list_items: z.array(z.object({
    id: z.string(),
    title: z.string().max(24),
    description: z.string().max(72).optional(),
  })).max(10).optional(),
});

export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const SendMessageOutputSchema = z.object({
  message_id: z.string(),
  status: z.enum(['sent', 'queued', 'failed']),
  error_message: z.string().optional(),
});

export type SendMessageOutput = z.infer<typeof SendMessageOutputSchema>;

export const ProcessPaymentInputSchema = z.object({
  amount: z.number().positive().int(),
  phone_number: z.string().regex(/^\+[1-9]\d{1,14}$/),
  reference: z.string().max(50).optional(),
  description: z.string().max(200).optional(),
  callback_url: z.string().url().optional(),
});

export type ProcessPaymentInput = z.infer<typeof ProcessPaymentInputSchema>;

export const ProcessPaymentOutputSchema = z.object({
  payment_id: z.string().uuid(),
  qr_code_url: z.string().url().optional(),
  ussd_code: z.string().optional(),
  status: z.enum(['pending', 'processing', 'failed']),
  expires_at: z.string().datetime().optional(),
});

export type ProcessPaymentOutput = z.infer<typeof ProcessPaymentOutputSchema>;

export const CreateOrderInputSchema = z.object({
  buyer_phone: z.string().regex(/^\+[1-9]\d{1,14}$/),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().positive().int(),
    unit_price: z.number().positive(),
  })).min(1),
  delivery_address: z.string().max(500).optional(),
  delivery_notes: z.string().max(300).optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export const CreateOrderOutputSchema = z.object({
  order_id: z.string().uuid(),
  total_amount: z.number(),
  estimated_delivery: z.string().datetime().optional(),
  status: z.enum(['pending', 'confirmed']),
});

export type CreateOrderOutput = z.infer<typeof CreateOrderOutputSchema>;

export const SearchListingsInputSchema = z.object({
  query: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radius_km: z.number().positive().max(50).default(10),
  }).optional(),
  price_range: z.object({
    min: z.number().min(0).optional(),
    max: z.number().positive().optional(),
  }).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

export type SearchListingsInput = z.infer<typeof SearchListingsInputSchema>;

export const SearchListingsOutputSchema = z.object({
  listings: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().optional(),
    price: z.number(),
    currency: z.string(),
    image_urls: z.array(z.string().url()),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().optional(),
    }).optional(),
    seller_info: z.object({
      name: z.string(),
      phone: z.string(),
      rating: z.number().optional(),
    }),
    distance_km: z.number().optional(),
  })),
  total_count: z.number().int(),
  has_more: z.boolean(),
});

export type SearchListingsOutput = z.infer<typeof SearchListingsOutputSchema>;

// Agent Router Types
export const AgentRouterInputSchema = z.object({
  message: z.string().min(1),
  phone_number: z.string().regex(/^\+[1-9]\d{1,14}$/),
  context: z.array(z.string()).default([]),
  user_data: z.record(z.unknown()).optional(),
});

export type AgentRouterInput = z.infer<typeof AgentRouterInputSchema>;

export const AgentRouterOutputSchema = z.object({
  response_text: z.string(),
  agent_used: z.string(),
  confidence_score: z.number().min(0).max(1),
  follow_up_actions: z.array(z.object({
    action: z.string(),
    parameters: z.record(z.unknown()),
  })).optional(),
  conversation_context: z.array(z.string()),
});

export type AgentRouterOutput = z.infer<typeof AgentRouterOutputSchema>;

// Analytics and Metrics Types
export const MetricsInputSchema = z.object({
  metric_name: z.string(),
  metric_value: z.number(),
  metric_type: z.enum(['performance', 'business', 'technical', 'security']),
  tags: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

export type MetricsInput = z.infer<typeof MetricsInputSchema>;

export const AnalyticsQueryInputSchema = z.object({
  metrics: z.array(z.string()),
  time_range: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  granularity: z.enum(['minute', 'hour', 'day', 'week', 'month']).default('hour'),
  filters: z.record(z.unknown()).optional(),
});

export type AnalyticsQueryInput = z.infer<typeof AnalyticsQueryInputSchema>;

// Error types specific to edge functions
export interface EdgeFunctionError {
  code: string;
  message: string;
  function_name: string;
  request_id: string;
  user_id?: string;
  phone_number?: string;
  timestamp: string;
  stack_trace?: string;
  context?: Record<string, unknown>;
}

// Performance monitoring for edge functions
export interface EdgeFunctionMetrics {
  function_name: string;
  execution_time_ms: number;
  memory_used_mb: number;
  cold_start: boolean;
  success: boolean;
  error_code?: string;
  timestamp: string;
  environment: string;
}