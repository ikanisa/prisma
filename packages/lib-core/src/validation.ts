// Validation utilities using Zod for easyMO platform
import { z } from 'zod';

// Common validation schemas
export const PhoneNumberSchema = z.string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format')
  .transform(phone => phone.replace(/\s+/g, ''));

export const EmailSchema = z.string().email('Invalid email format');

export const RWFAmountSchema = z.number()
  .positive('Amount must be positive')
  .max(10000000, 'Amount too large') // 10M RWF max
  .int('Amount must be a whole number');

export const LanguageSchema = z.enum(['en', 'fr', 'rw']);

export const StatusSchema = z.enum(['active', 'inactive', 'pending', 'completed', 'cancelled']);

// WhatsApp message validation
export const WhatsAppMessageSchema = z.object({
  phone_number: PhoneNumberSchema,
  message_text: z.string().min(1, 'Message cannot be empty').max(4096, 'Message too long'),
  message_type: z.enum(['text', 'image', 'document', 'audio', 'video', 'location', 'contact']).default('text'),
  media_url: z.string().url().optional(),
});

// User creation/update validation
export const UserSchema = z.object({
  phone: PhoneNumberSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  email: EmailSchema.optional(),
  preferred_language: LanguageSchema.default('en'),
  status: StatusSchema.default('active'),
});

// Payment validation
export const PaymentSchema = z.object({
  amount: RWFAmountSchema,
  phone_number: PhoneNumberSchema,
  description: z.string().max(200, 'Description too long').optional(),
  reference: z.string().max(50, 'Reference too long').optional(),
});

// Order validation
export const OrderItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit_price: RWFAmountSchema,
});

export const OrderSchema = z.object({
  buyer_phone: PhoneNumberSchema,
  items: z.array(OrderItemSchema).min(1, 'At least one item required'),
  delivery_address: z.string().min(5, 'Delivery address required').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

// Event validation
export const EventSchema = z.object({
  title: z.string().min(3, 'Title too short').max(100, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  start_date: z.string().datetime('Invalid start date'),
  end_date: z.string().datetime('Invalid end date'),
  location: z.string().max(200, 'Location too long').optional(),
  max_attendees: z.number().int().positive().optional(),
  ticket_price: RWFAmountSchema.optional(),
});

// Trip/ride validation
export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  address: z.string().max(200, 'Address too long').optional(),
});

export const TripSchema = z.object({
  driver_phone: PhoneNumberSchema,
  origin: LocationSchema,
  destination: LocationSchema,
  departure_time: z.string().datetime('Invalid departure time'),
  available_seats: z.number().int().min(1).max(8, 'Invalid seat count'),
  price_per_seat: RWFAmountSchema,
  notes: z.string().max(300, 'Notes too long').optional(),
});

// Business validation
export const BusinessSchema = z.object({
  name: z.string().min(2, 'Business name too short').max(100, 'Business name too long'),
  category: z.enum(['restaurant', 'retail', 'service', 'pharmacy', 'transport', 'agriculture', 'other']),
  phone_number: PhoneNumberSchema,
  address: z.string().max(200, 'Address too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  website: z.string().url('Invalid website URL').optional(),
});

// Contact validation
export const ContactSchema = z.object({
  phone_number: PhoneNumberSchema,
  name: z.string().max(100, 'Name too long').optional(),
  contact_type: z.enum(['prospect', 'customer', 'vendor', 'partner', 'support']).default('prospect'),
  tags: z.array(z.string().max(50)).optional(),
  custom_fields: z.record(z.unknown()).optional(),
});

// Agent configuration validation
export const AgentConfigSchema = z.object({
  name: z.string().min(2, 'Agent name too short').max(50, 'Agent name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  system_prompt: z.string().max(2000, 'System prompt too long').optional(),
  temperature: z.number().min(0).max(2, 'Temperature must be between 0 and 2').default(0.3),
  tools: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

/**
 * Validates data against a Zod schema and returns formatted errors
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: true; 
  data: T; 
} | { 
  success: false; 
  errors: string[]; 
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => 
    `${err.path.join('.')}: ${err.message}`
  );
  
  return { success: false, errors };
}

/**
 * Creates a validation middleware for edge functions
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    const result = validateData(schema, data);
    
    if (!result.success) {
      throw new Error(`Validation failed: ${result.errors.join(', ')}`);
    }
    
    return result.data;
  };
}

/**
 * Validates and sanitizes HTML content
 */
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Validates file upload constraints
 */
export const FileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename required').max(255, 'Filename too long'),
  size: z.number().max(10 * 1024 * 1024, 'File too large (max 10MB)'),
  mimetype: z.enum([
    'image/jpeg',
    'image/png', 
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
  ], { errorMap: () => ({ message: 'Unsupported file type' }) }),
});