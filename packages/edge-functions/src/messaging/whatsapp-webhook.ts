import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  createLogger, 
  validateRequiredEnvVars, 
  handleCorsPreflightRequest,
  createSuccessResponse,
  createErrorResponse,
  EdgeFunctionError,
  SecurityManager,
  whatsappMessageSchema,
  sanitizePhoneNumber
} from "../shared/index.ts";
import { z } from 'zod';

// Validate environment variables
validateRequiredEnvVars([
  'META_WABA_VERIFY_TOKEN',
  'META_WABA_TOKEN',
  'META_WABA_PHONE_ID',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
]);

const logger = createLogger('whatsapp-webhook');
const security = new SecurityManager({
  rateLimitMax: 1000, // Higher limit for webhook
  allowedOrigins: ['https://graph.facebook.com']
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// WhatsApp webhook verification
const verifyWebhook = (req: Request): Response => {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const VERIFY_TOKEN = Deno.env.get('META_WABA_VERIFY_TOKEN');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      logger.info('Webhook verified successfully');
      return new Response(challenge, { status: 200 });
    } else {
      logger.warn('Webhook verification failed', { mode, token });
      return createErrorResponse('Forbidden', 403);
    }
  }

  return createErrorResponse('Bad request', 400);
};

// Generate SHA256 hash for idempotency
const generateTxHash = async (msgId: string, toolName: string, args: any): Promise<string> => {
  const hashString = msgId + toolName + JSON.stringify(args);
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashString));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Send WhatsApp message with idempotency
const sendOnce = async (txHash: string, waId: string, payload: any) => {
  logger.info('Checking message idempotency', { txHash, waId });
  
  const { data: existing } = await supabase
    .from('outgoing_log')
    .select('tx_hash')
    .eq('tx_hash', txHash)
    .single();

  if (existing) {
    logger.info('Message already sent, skipping', { txHash });
    return;
  }

  // Send to WhatsApp API
  const response = await fetch(`https://graph.facebook.com/v18.0/${Deno.env.get('META_WABA_PHONE_ID')}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('META_WABA_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('WhatsApp API error', { status: response.status, error: errorText });
    throw new Error(`WhatsApp API error: ${response.status} ${errorText}`);
  }

  // Log successful send
  await supabase.from('outgoing_log').insert({
    tx_hash: txHash,
    wa_id: waId,
    payload: payload,
    delivery_status: 'sent'
  });

  logger.info('Message sent and logged', { txHash });
};

// Process incoming WhatsApp messages
const processMessage = async (body: any) => {
  logger.info('Processing WhatsApp webhook', { body });

  if (!body.entry?.[0]?.changes?.[0]?.value?.messages) {
    logger.debug('No messages in webhook payload');
    return { processed: false, reason: 'No messages' };
  }

  const message = body.entry[0].changes[0].value.messages[0];
  const contact = body.entry[0].changes[0].value.contacts?.[0];

  if (!message || !contact) {
    throw EdgeFunctionError.badRequest('Invalid message format');
  }

  const phoneNumber = sanitizePhoneNumber(contact.wa_id);
  const messageType = message.type;
  const messageId = message.id;
  const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

  // 🔒 IDEMPOTENCY CHECK: Prevent duplicate processing
  const { data: existing } = await supabase
    .from('processed_inbound')
    .select('msg_id')
    .eq('msg_id', messageId)
    .single();

  if (existing) {
    logger.info('Message already processed', { messageId });
    return { processed: true, reason: 'Duplicate message', message_id: messageId };
  }

  // Mark as processed
  await supabase.from('processed_inbound').insert({
    msg_id: messageId,
    wa_id: phoneNumber,
    metadata: {
      timestamp: message.timestamp,
      message_type: messageType
    }
  });

  let content = '';
  switch (messageType) {
    case 'text':
      content = message.text?.body || '';
      break;
    case 'image':
      content = message.image?.caption || 'Image received';
      break;
    case 'document':
      content = message.document?.filename || 'Document received';
      break;
    default:
      content = `${messageType} message received`;
  }

  // Store message in database
  const { error: dbError } = await supabase
    .from('unified_messages')
    .insert({
      id: messageId,
      conversation_id: `whatsapp_${phoneNumber}`,
      sender_phone: phoneNumber,
      content: security.sanitizeInput(content),
      message_type: messageType,
      platform: 'whatsapp',
      metadata: {
        wa_message_id: messageId,
        timestamp: message.timestamp,
        contact_name: contact.profile?.name
      },
      created_at: timestamp,
    });

  if (dbError) {
    logger.error('Failed to store message', dbError);
    throw EdgeFunctionError.internal('Failed to store message');
  }

  // Call message processor function
  try {
    const { error: processorError } = await supabase.functions.invoke('message-handler', {
      body: {
        message_id: messageId,
        phone_number: phoneNumber,
        content,
        message_type: messageType,
      }
    });

    if (processorError) {
      logger.warn('Message processor failed', processorError);
    }
  } catch (error) {
    logger.warn('Failed to invoke message processor', error);
  }

  logger.info('Message processed successfully', { messageId, phoneNumber });
  return { processed: true, message_id: messageId };
};

serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return handleCorsPreflightRequest();
    }

    // Webhook verification (GET)
    if (req.method === 'GET') {
      return verifyWebhook(req);
    }

    // Message processing (POST)
    if (req.method === 'POST') {
      // Rate limiting check
      const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
      if (!security.checkRateLimit(clientIp)) {
        throw EdgeFunctionError.rateLimit();
      }

      const body = await req.json();
      const result = await processMessage(body);

      return createSuccessResponse(result);
    }

    throw EdgeFunctionError.badRequest('Method not allowed');

  } catch (error) {
    logger.error('Webhook request failed', error);

    if (error instanceof EdgeFunctionError) {
      return createErrorResponse(error.message, error.statusCode, error.metadata);
    }

    return createErrorResponse('Internal server error', 500);
  }
});