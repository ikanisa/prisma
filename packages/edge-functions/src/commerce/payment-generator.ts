import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  createLogger, 
  validateRequiredEnvVars, 
  handleCorsPreflightRequest,
  createSuccessResponse,
  createErrorResponse,
  EdgeFunctionError,
  paymentAmountSchema,
  currencySchema,
  phoneNumberSchema
} from "../shared/index.ts";
import { z } from 'zod';

// Validate environment variables
validateRequiredEnvVars([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
]);

const logger = createLogger('payment-generator');
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Payment request schema
const paymentRequestSchema = z.object({
  amount: paymentAmountSchema,
  currency: currencySchema.default('RWF'),
  description: z.string().min(1).max(255),
  recipient_phone: phoneNumberSchema,
  sender_phone: phoneNumberSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  recipient_phone: string;
  sender_phone?: string;
  metadata?: Record<string, any>;
}

class PaymentGenerator {
  async generatePayment(request: PaymentRequest) {
    logger.info('Generating payment', { amount: request.amount, currency: request.currency });

    try {
      // Generate unique payment ID
      const paymentId = crypto.randomUUID();
      const paymentCode = this.generatePaymentCode();
      
      // Create payment record
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          id: paymentId,
          amount: request.amount,
          currency: request.currency,
          description: request.description,
          recipient_phone: request.recipient_phone,
          sender_phone: request.sender_phone,
          payment_code: paymentCode,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create payment record', error);
        throw EdgeFunctionError.internal('Failed to create payment');
      }

      logger.info('Payment generated successfully', { paymentId, paymentCode });

      return {
        payment_id: paymentId,
        payment_code: paymentCode,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        qr_code_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/qr-generator?payment_id=${paymentId}`,
      };

    } catch (error) {
      logger.error('Payment generation failed', error);
      throw error instanceof EdgeFunctionError ? error : EdgeFunctionError.internal('Payment generation failed');
    }
  }

  private generatePaymentCode(): string {
    // Generate 8-digit payment code
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  try {
    if (req.method !== 'POST') {
      throw EdgeFunctionError.badRequest('Only POST method allowed');
    }

    const body = await req.json();
    const validatedRequest = paymentRequestSchema.parse(body);

    const generator = new PaymentGenerator();
    const result = await generator.generatePayment(validatedRequest);

    return createSuccessResponse(result);

  } catch (error) {
    logger.error('Request failed', error);

    if (error instanceof z.ZodError) {
      return createErrorResponse('Validation failed', 422, { errors: error.errors });
    }

    if (error instanceof EdgeFunctionError) {
      return createErrorResponse(error.message, error.statusCode, error.metadata);
    }

    return createErrorResponse('Internal server error', 500);
  }
});