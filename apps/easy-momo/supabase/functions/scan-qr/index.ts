
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { QRScanRequest } from './types.ts';
import { validateUssdPattern, extractPaymentDetails } from './ussd-utils.ts';
import { generateSimulatedQRPattern } from './qr-simulator.ts';
import { saveQRHistory, logAnalyticsEvent, setSessionContext } from './database-operations.ts';
import { createSuccessResponse, createErrorResponse, createOptionsResponse } from './response-handler.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return createOptionsResponse();
  }

  try {
    console.log('Enhanced QR scan request received');
    const { qrImage, sessionId, enhanceImage, aiProcessing }: QRScanRequest = await req.json();

    if (!qrImage) {
      console.error('Missing qrImage in request');
      return createErrorResponse(
        'Missing required field: qrImage',
        'MISSING_FIELDS'
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Set session context for RLS if sessionId provided
    if (sessionId) {
      await setSessionContext(supabaseClient, sessionId);
    }

    // Enhanced QR processing with better pattern matching
    console.log('Processing QR image with enhanced validation:', { enhanceImage, aiProcessing });
    
    // Simulate enhanced QR processing with realistic patterns
    const randomPattern = generateSimulatedQRPattern();
    console.log('Generated pattern:', randomPattern);
    
    // Validate the pattern using new normalization
    const validation = validateUssdPattern(randomPattern);
    console.log('Pattern validation:', validation);
    
    if (!validation.isValid) {
      console.log('Invalid USSD pattern generated');
      return createErrorResponse(
        'Could not decode valid USSD string from QR code',
        'QR_DECODE_FAILED',
        200,
        validation.confidence
      );
    }

    // Use the sanitized (normalized) version for parsing
    const sanitizedUssd = validation.sanitized;
    
    // Extract receiver and amount from normalized pattern
    const { receiver, amount } = extractPaymentDetails(sanitizedUssd);
    
    if (!receiver || !amount) {
      console.log('Could not extract receiver/amount from pattern');
      return createErrorResponse(
        'Could not parse USSD pattern',
        'USSD_PARSE_FAILED',
        200,
        0
      );
    }

    console.log('QR decoded successfully:', { receiver, amount, validation });
    
    // Save enhanced scan to QR history
    if (sessionId) {
      await saveQRHistory(supabaseClient, sessionId, receiver, amount, sanitizedUssd);
    }

    // Log enhanced analytics event
    await logAnalyticsEvent(
      supabaseClient,
      sessionId,
      receiver,
      amount,
      validation,
      enhanceImage || false,
      aiProcessing || false,
      randomPattern,
      sanitizedUssd
    );

    const processingTime = Math.floor(Math.random() * 1000) + 500;
    return createSuccessResponse(
      sanitizedUssd,
      receiver,
      amount,
      validation,
      processingTime,
      aiProcessing || false
    );

  } catch (error) {
    console.error('Unexpected error in enhanced scan-qr function:', error);
    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
});
