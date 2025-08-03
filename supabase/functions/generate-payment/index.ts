import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createErrorResponse, createSuccessResponse } from "../_shared/utils.ts";
import { validateRequiredEnvVars, validateRequestBody, ValidationPatterns } from "../_shared/validation.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

// Validate environment variables
validateRequiredEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const supabase = getSupabaseClient();

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    // Validate request body
    const validation = validateRequestBody(requestData, {
      amount: { required: true, type: 'number' },
      phone: { required: true, type: 'string', pattern: ValidationPatterns.phone },
      description: { type: 'string', maxLength: 100 }
    });

    if (!validation.isValid) {
      logger.warn('Invalid payment request', { errors: validation.errors, requestData });
      return createErrorResponse('Validation failed', { errors: validation.errors });
    }

    const { amount, phone, description = 'easyMO Payment' } = requestData;
    
    // Convert amount to number and validate it's positive
    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return createErrorResponse('Amount must be a positive number');
    }

    logger.info('Generating USSD payment request', { amount: paymentAmount, phone });

    // Generate unique payment reference for tracking only (no API processing)
    const paymentRef = `EMO${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Create USSD code for MTN Mobile Money Rwanda (P2P, no API)
    const ussdCode = `*182*1*1*${amount}*${phone}#`;
    const ussdLink = `tel:${encodeURIComponent(ussdCode)}`;

    // Generate QR code content
    const qrContent = {
      type: 'easymo_payment',
      reference: paymentRef,
      amount: paymentAmount,
      currency: 'RWF',
      phone: phone,
      ussd_code: ussdCode,
      action: 'receive'
    };

    logger.info('Generating QR code', { reference: paymentRef });

    // Generate QR code via qr-payment-generator function
    let qrCodeUrl = null;
    try {
      const qrResponse = await supabase.functions.invoke('qr-payment-generator', {
        body: {
          action: 'generate',
          amount: paymentAmount,
          phone: phone,
          type: 'receive',
          user_id: requestData.user_id || 'anonymous'
        }
      });

      if (qrResponse.data && qrResponse.data.qr_url) {
        qrCodeUrl = qrResponse.data.qr_url;
        logger.info('QR code generated successfully', { qrUrl: qrCodeUrl });
      } else {
        logger.warn('QR generation failed', qrResponse.error);
      }
    } catch (qrError) {
      logger.error('QR generation error', qrError);
    }

    // Insert payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        amount: paymentAmount,
        momo_code: phone,
        ussd_code: ussdCode,
        ussd_link: ussdLink,
        qr_code_url: qrCodeUrl,
        ref: paymentRef,
        purpose: 'qr_payment'
      })
      .select()
      .single();

    if (error) {
      logger.error('Payment creation error', error);
      return createErrorResponse('Failed to create payment record');
    }

    logger.info('Payment created successfully', { paymentId: payment.id, qrUrl: qrCodeUrl });

    return createSuccessResponse('Payment created successfully', { payment_id: payment.id, amount: paymentAmount, ussd_code: ussdCode, ussd_link: ussdLink, qr_code_url: qrCodeUrl, reference: paymentRef, instructions: `Dial ${ussdCode} to complete P2P mobile money payment (outside system)` });

  } catch (error) {
    logger.error('Payment generation error', error);
    return createErrorResponse('Internal server error', null, 500);
  }
}));
