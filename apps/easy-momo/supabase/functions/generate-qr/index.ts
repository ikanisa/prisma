
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateQRCodeDataURL } from './qr-generator.ts';
import { generateUSSDAndMethod, executeBackgroundOperations } from './database-operations.ts';
import { validateInput, createErrorResponse, createSuccessResponse, corsHeaders } from './validation.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { receiver, amount, sessionId } = await req.json();

    // Validate input
    const validation = validateInput(receiver, amount, sessionId);
    if (!validation.isValid) {
      return validation.errorResponse!;
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate USSD and detect payment method
    const { ussdData, methodData } = await generateUSSDAndMethod(
      supabaseClient,
      receiver,
      parseInt(amount)
    );

    // Handle USSD generation error
    if (ussdData.error) {
      console.error('USSD generation error:', ussdData.error);
      return createErrorResponse(
        'Failed to generate USSD string',
        'USSD_GENERATION_FAILED',
        ussdData.error.message
      );
    }

    // Handle method detection error
    if (methodData.error) {
      console.error('Method detection error:', methodData.error);
      return createErrorResponse(
        'Failed to detect payment method',
        'METHOD_DETECTION_FAILED',
        methodData.error.message
      );
    }

    const ussdString = ussdData.data;
    const telUri = `tel:${encodeURIComponent(ussdString)}`;
    console.log('Generated tel URI:', telUri);

    // Generate QR code
    const qrCodeDataURL = await generateQRCodeDataURL(telUri);

    // Execute background operations (don't await to speed up response)
    executeBackgroundOperations(
      supabaseClient,
      sessionId,
      receiver,
      parseInt(amount),
      ussdString,
      qrCodeDataURL,
      methodData.data
    );

    // Return immediate response with QR data
    return createSuccessResponse({
      qrCodeImage: qrCodeDataURL,
      qrCodeUrl: qrCodeDataURL,
      ussdString,
      telUri,
      paymentId: null
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      error.message
    );
  }
});
