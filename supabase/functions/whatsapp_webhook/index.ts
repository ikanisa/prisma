// supabase/functions/whatsapp_webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { securityManager, SecurityConfigs, InputSanitizer } from "../_shared/security.ts";
import { validateRequiredEnvVars, sanitizePhoneNumber } from "../_shared/validation.ts";
import { logger } from "../_shared/logger.ts";

// Validate required environment variables
validateRequiredEnvVars([
  'META_WABA_VERIFY_TOKEN',
  'META_WABA_WEBHOOK_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
]);

const VERIFY_TOKEN = Deno.env.get("META_WABA_VERIFY_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("META_WABA_WEBHOOK_SECRET")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

serve(async (req) => {
  const url = new URL(req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security check
    const securityCheck = await securityManager.checkRequestSecurity(req, SecurityConfigs.webhook);
    if (!securityCheck.allowed) {
      logger.warn('Security check failed for WhatsApp webhook', { 
        reason: securityCheck.reason,
        ip: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown'
      });
      return new Response(JSON.stringify({ error: securityCheck.reason }), { 
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', ...securityCheck.headers }
      });
    }

    // 1) META verification GET
    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        logger.info('WhatsApp webhook verification successful');
        return new Response(challenge, { status: 200, headers: corsHeaders });
      }
      
      logger.warn('WhatsApp webhook verification failed', { mode, token: token ? 'provided' : 'missing' });
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    // 2) Incoming messages POST
    if (req.method === "POST") {
      // Get raw body for signature verification
      const rawBody = await req.text();
      const signature = req.headers.get('x-hub-signature-256') || '';
      
      // Verify webhook signature
      if (!await securityManager.validateHmacSignature(rawBody, signature, WEBHOOK_SECRET)) {
        await securityManager.logSecurityEvent({
          type: 'invalid_signature',
          severity: 'high',
          clientIP: req.headers.get('cf-connecting-ip') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown',
          endpoint: '/whatsapp_webhook'
        });
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let body;
      try {
        body = JSON.parse(rawBody);
      } catch (error) {
        logger.error('Failed to parse webhook payload', error);
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Sanitize and validate payload
      const sanitizedBody = InputSanitizer.sanitizeObject(body);
      
      // Extract and process messages
      const entry = sanitizedBody.entry?.[0];
      const changes = entry?.changes?.[0];
      const messages = changes?.value?.messages;
      const contacts = changes?.value?.contacts;

      if (messages && messages.length > 0) {
        for (const m of messages) {
          try {
            const from = sanitizePhoneNumber(m.from || '');
            const to = sanitizePhoneNumber(changes.value?.metadata?.display_phone_number || '');
            const waId = InputSanitizer.sanitizeString(m.id || '', 255);
            const type = InputSanitizer.sanitizeString(m.type || 'text', 50);
            const bodyText = InputSanitizer.sanitizeString(m.text?.body || '', 4000);

            if (!from || !waId) {
              logger.warn('Invalid message data', { from, waId });
              continue;
            }

            // Store message
            const { error: insertError } = await supabase.from("whatsapp_messages").insert({
              wa_message_id: waId,
              from_number: from,
              to_number: to,
              direction: 'in',
              msg_type: type,
              body: bodyText,
              raw_json: m
            });

            if (insertError) {
              logger.error('Failed to insert WhatsApp message', insertError);
              continue;
            }

            // Update contact info if available
            const contact = contacts?.find((c: any) => c.wa_id === m.from);
            if (contact) {
              const contactName = InputSanitizer.sanitizeString(contact.profile?.name || '', 255);
              
              await supabase.from("contacts").upsert({
                phone_number: from,
                name: contactName,
                last_interaction: new Date().toISOString(),
                status: 'active'
              }, { onConflict: 'phone_number' });
            }

            // Upsert conversation
            await supabase.from("whatsapp_conversations")
              .upsert({
                user_number: from,
                last_message_at: new Date().toISOString()
              }, { onConflict: 'user_number' });

            // Trigger agent processing
            try {
              await supabase.functions.invoke('agent_router', {
                body: { wa_message_id: waId }
              });
            } catch (routerError) {
              logger.error('Failed to trigger agent router', routerError);
              // Don't fail the webhook - message was still received
            }

            logger.info('WhatsApp message processed successfully', { 
              messageId: waId, 
              from, 
              type 
            });

          } catch (messageError) {
            logger.error('Error processing individual message', messageError);
            // Continue processing other messages
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('WhatsApp webhook error', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});