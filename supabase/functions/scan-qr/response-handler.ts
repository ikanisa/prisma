
import { QRScanResponse } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function createSuccessResponse(
  sanitizedUssd: string,
  receiver: string,
  amount: string,
  validation: any,
  processingTime: number,
  aiProcessing: boolean
): Response {
  const response: QRScanResponse = {
    success: true,
    ussdString: sanitizedUssd,
    ussdCode: sanitizedUssd,
    parsedReceiver: receiver,
    parsedAmount: parseInt(amount),
    confidence: validation.confidence,
    processingTime,
    method: aiProcessing ? 'ai_enhanced' : 'standard',
    validation: {
      isValid: validation.isValid,
      country: validation.country,
      provider: validation.provider,
      patternType: validation.patternType
    }
  };

  console.log('Returning enhanced successful response:', response);

  return new Response(
    JSON.stringify(response),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

export function createErrorResponse(
  error: string,
  code: string,
  status: number = 400,
  confidence?: number
): Response {
  const response: QRScanResponse = {
    success: false,
    error,
    code,
    ...(confidence !== undefined && { confidence })
  };

  return new Response(
    JSON.stringify(response),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

export function createOptionsResponse(): Response {
  return new Response('ok', { headers: corsHeaders });
}
