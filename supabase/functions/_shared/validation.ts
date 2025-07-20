/**
 * REFACTOR: Centralized Zod validation schemas
 * Eliminates inconsistent validation across edge functions
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// WhatsApp Webhook Validation
export const WhatsAppMessageSchema = z.object({
  from: z.string().min(1),
  id: z.string().min(1),
  timestamp: z.string(),
  type: z.enum(['text', 'image', 'audio', 'video', 'document', 'location', 'interactive']),
  text: z.object({
    body: z.string()
  }).optional(),
  image: z.object({
    id: z.string(),
    mime_type: z.string(),
    sha256: z.string(),
    caption: z.string().optional()
  }).optional(),
  interactive: z.object({
    type: z.enum(['button_reply', 'list_reply']),
    button_reply: z.object({
      id: z.string(),
      title: z.string()
    }).optional(),
    list_reply: z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional()
    }).optional()
  }).optional()
});

export const WhatsAppWebhookSchema = z.object({
  object: z.literal('whatsapp_business_account'),
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      value: z.object({
        messaging_product: z.literal('whatsapp'),
        metadata: z.object({
          display_phone_number: z.string(),
          phone_number_id: z.string()
        }),
        contacts: z.array(z.object({
          profile: z.object({
            name: z.string()
          }),
          wa_id: z.string()
        })).optional(),
        messages: z.array(WhatsAppMessageSchema).optional(),
        statuses: z.array(z.object({
          id: z.string(),
          status: z.enum(['sent', 'delivered', 'read', 'failed']),
          timestamp: z.string(),
          recipient_id: z.string()
        })).optional()
      }),
      field: z.literal('messages')
    }))
  }))
});

// User Validation
export const UserCreateSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  momo_code: z.string().min(1),
  credits: z.number().int().min(0).default(60)
});

export const PhoneNumberSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .transform((phone) => {
    // Normalize phone number (Rwanda-specific)
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('250')) {
      return '+' + cleaned;
    } else if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '+250' + cleaned.substring(1);
    }
    return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
  });

// Driver Validation
export const DriverTripCreateSchema = z.object({
  driver_id: z.string().uuid(),
  from_text: z.string().min(1).max(100),
  to_text: z.string().min(1).max(100),
  seats: z.number().int().min(1).max(50),
  price_rwf: z.number().int().min(100).max(1000000),
  departure_time: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
});

export const CoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

// Payment Validation
export const PaymentRequestSchema = z.object({
  amount: z.number().int().min(100).max(1000000),
  phone: PhoneNumberSchema,
  description: z.string().max(200).optional(),
  reference: z.string().max(50).optional()
});

// Message Validation
export const ConversationMessageSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  message: z.string().min(1).max(5000)
});

// Generic API Request Validation
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

export const ApiRequestSchema = z.object({
  pagination: PaginationSchema.optional()
});

// Input Sanitization
export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/script/gi, 'scr1pt') // Basic XSS prevention
    .replace(/javascript:/gi, 'js:')
    .trim()
    .substring(0, 1000); // Limit length
}

// Validation Helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  errors: z.ZodError;
} {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

// Error Response Helper
export function createValidationErrorResponse(errors: z.ZodError): Response {
  const formattedErrors = errors.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));

  return new Response(JSON.stringify({
    success: false,
    error: 'Validation failed',
    details: formattedErrors
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}