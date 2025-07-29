// SECURE VERSION: Replaces hardcoded secrets with centralized utilities
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

const supabase = createClient(SupabaseEnv.getUrl(), SupabaseEnv.getServiceRoleKey());

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    const { to, body } = requestBody;

    if (!to || !body) {
      return new Response(JSON.stringify({ 
        error: "Missing required parameters: 'to' and 'body'" 
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

    // Validate and sanitize message content
    const messageValidation = validateMessageContent(body);
    if (!messageValidation.isValid) {
      return new Response(JSON.stringify({ 
        error: `Invalid message content: ${messageValidation.error}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const sanitizedPhone = phoneValidation.sanitized!;
    const sanitizedBody = messageValidation.sanitized!;

    logger.info('Sending WhatsApp message', { 
      to: sanitizedPhone.substring(0, 8) + '***', // Partial masking for logs
      messageLength: sanitizedBody.length 
    });

    // Prepare WhatsApp API payload
    const payload = {
      messaging_product: "whatsapp",
      to: sanitizedPhone,
      type: "text",
      text: { body: sanitizedBody }
    };

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
      
      return new Response(JSON.stringify({ 
        error: "Failed to send message",
        status: whatsappResponse.status
      }), {
        status: whatsappResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log message to database for audit trail
    const messageId = responseData.messages?.[0]?.id;
    if (messageId) {
      try {
        await supabase.from("whatsapp_messages").insert({
          wa_message_id: messageId,
          from_number: WhatsAppEnv.getPhoneId(),
          to_number: sanitizedPhone,
          direction: 'out',
          body: sanitizedBody,
          msg_type: 'text',
          status: 'sent',
          raw_json: responseData
        });
      } catch (dbError) {
        logger.error("Failed to log message to database", dbError);
        // Don't fail the request - message was sent successfully
      }
    }

    const duration = Date.now() - startTime;
    logger.info('WhatsApp message sent successfully', { 
      messageId,
      duration: `${duration}ms`,
      status: "sent"
    });

    return new Response(JSON.stringify({
      success: true,
      messageId,
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