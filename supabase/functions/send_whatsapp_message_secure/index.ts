import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
// SECURE VERSION: Replaces hardcoded secrets with centralized utilities
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { securityManager, SecurityConfigs } from "../_shared/security.ts";
import { WhatsAppEnv, SupabaseEnv, validateRequiredEnvVars } from "../_shared/env.ts";
import { validateMessageContent, validateWhatsAppNumber } from "../_shared/validation.ts";
import { logger } from "../_shared/logger.ts";

// Validate required environment variables at startup
validateRequiredEnvVars([
  'META_WABA_TOKEN',
  'META_WABA_PHONE_ID',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
]);


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate SHA256 hash for idempotency
async function generateTxHash(msgId: string, toolName: string, args: any): Promise<string> {
  const hashString = msgId + toolName + JSON.stringify(args);
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashString));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Send WhatsApp message with idempotency protection
async function sendOnce(txHash: string, waId: string, payload: any): Promise<{ sent: boolean; messageId?: string }> {
  logger.info('Checking message idempotency', { txHash, waId });
  
  const { data: existing } = await supabase
    .from('outgoing_log')
    .select('tx_hash')
    .eq('tx_hash', txHash)
    .single();

  if (existing) {
    logger.info('Message already sent, skipping', { txHash });
    return { sent: false }; // Already sent
  }

  logger.info('Sending new message', { txHash });
  
  try {
    // Send to WhatsApp API with timeout
    const whatsappResponse = await Promise.race([
      fetch(`https://graph.facebook.com/v20.0/${WhatsAppEnv.getPhoneId()}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WhatsAppEnv.getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('WhatsApp API timeout')), 10000)
      )
    ]);

    const responseData = await whatsappResponse.json();
    
    if (!whatsappResponse.ok) {
      logger.error("WhatsApp API error", { 
        status: whatsappResponse.status, 
        error: responseData.error?.message 
      });
      throw new Error(`WhatsApp API error: ${whatsappResponse.status}`);
    }

    const messageId = responseData.messages?.[0]?.id;
    
    // Log successful send in outgoing_log
    await supabase.from('outgoing_log').insert({
      tx_hash: txHash,
      wa_id: waId,
      payload: payload,
      delivery_status: 'sent'
    });

    logger.info('Message sent and logged', { txHash, messageId });
    return { sent: true, messageId };
    
  } catch (error) {
    logger.error('Failed to send message', { txHash, error });
    
    // Log failed attempt
    await supabase.from('outgoing_log').insert({
      tx_hash: txHash,
      wa_id: waId,
      payload: payload,
      delivery_status: 'failed'
    });
    
    throw error;
  }
}

// Check if banner should be sent (throttle to once per hour)
async function shouldSendBanner(waId: string): Promise<boolean> {
  const { data: contact } = await supabase
    .from('contacts')
    .select('last_banner_ts')
    .eq('phone_number', waId)
    .single();

  if (!contact?.last_banner_ts) {
    return true;
  }

  const lastBanner = new Date(contact.last_banner_ts);
  const now = new Date();
  const hoursSinceLastBanner = (now.getTime() - lastBanner.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastBanner >= 1;
}

// Update banner timestamp
async function updateBannerTimestamp(waId: string) {
  await supabase
    .from('contacts')
    .update({ last_banner_ts: new Date().toISOString() })
    .eq('phone_number', waId);
}

serve(withErrorHandling(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security check with rate limiting
    const securityCheck = await securityManager.checkRequestSecurity(req, SecurityConfigs.api);
    if (!securityCheck.allowed) {
      logger.warn('Security check failed for WhatsApp message send', { 
        reason: securityCheck.reason,
        ip: req.headers.get('cf-connecting-ip') || 'unknown'
      });
      
      return new Response(JSON.stringify({ error: securityCheck.reason }), { 
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', ...securityCheck.headers }
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requestBody = await req.json();
    const { 
      to, 
      body, 
      message_id = Date.now().toString(), 
      tool_name = 'secure_send',
      check_banner_throttle = false,
      payload // Allow custom payload instead of just text
    } = requestBody;

    if (!to || (!body && !payload)) {
      return new Response(JSON.stringify({ 
        error: "Missing required parameters: 'to' and ('body' or 'payload')" 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate and sanitize phone number
    const phoneValidation = validateWhatsAppNumber(to);
    if (!phoneValidation.isValid) {
      return new Response(JSON.stringify({ 
        error: `Invalid phone number: ${phoneValidation.error}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const sanitizedPhone = phoneValidation.sanitized!;

    // Prepare WhatsApp API payload
    let messagePayload: any;
    
    if (payload) {
      // Use custom payload if provided
      messagePayload = { ...payload, to: sanitizedPhone };
    } else {
      // Validate and sanitize message content for text messages
      const messageValidation = validateMessageContent(body);
      if (!messageValidation.isValid) {
        return new Response(JSON.stringify({ 
          error: `Invalid message content: ${messageValidation.error}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const sanitizedBody = messageValidation.sanitized!;
      
      messagePayload = {
        messaging_product: "whatsapp",
        to: sanitizedPhone,
        type: "text",
        text: { body: sanitizedBody }
      };
    }

    logger.info('Sending WhatsApp message with idempotency', { 
      to: sanitizedPhone.substring(0, 8) + '***', // Partial masking for logs
      messageId: message_id,
      toolName: tool_name
    });

    // Generate transaction hash for idempotency
    const txHash = await generateTxHash(message_id, tool_name, messagePayload);

    // Check banner throttle if requested
    if (check_banner_throttle) {
      const shouldSend = await shouldSendBanner(sanitizedPhone);
      if (!shouldSend) {
        logger.info('Banner throttled', { phone: sanitizedPhone.substring(0, 8) + '***' });
        return new Response(JSON.stringify({ 
          success: false, 
          reason: 'Banner throttled', 
          tx_hash: txHash 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Send message with idempotency protection
    const result = await sendOnce(txHash, sanitizedPhone, messagePayload);

    // Update banner timestamp if this was a banner message and it was sent
    if (check_banner_throttle && result.sent) {
      await updateBannerTimestamp(sanitizedPhone);
    }

    const duration = Date.now() - startTime;
    logger.info('WhatsApp message process completed', { 
      messageId: result.messageId,
      sent: result.sent,
      duration: `${duration}ms`,
      txHash
    });

    return new Response(JSON.stringify({
      success: true,
      sent: result.sent,
      messageId: result.messageId,
      tx_hash: txHash,
      duration
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Error in secure WhatsApp message sender", error, { duration: `${duration}ms` });
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});