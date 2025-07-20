/**
 * REFACTOR: Streamlined WhatsApp webhook handler
 * Reduced from 575 LOC to ~150 LOC using modular agents
 * Implements signature verification and proper error handling
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// REFACTOR: Import shared modules
import { corsHeaders, validateRequiredEnvVars } from "../_shared/cors.ts";
import { getWhatsAppClient } from "../_shared/whatsapp.ts";
import { getSupabaseClient, db } from "../_shared/supabase.ts";
import { AgentRouter } from "../_shared/agents.ts";
import { validateWebhookSignature, checkRateLimit, logSecurityEvent, sanitizeInput } from "../_shared/security.ts";

// SECURITY: Validate required environment variables
validateRequiredEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const whatsapp = getWhatsAppClient();
const supabase = getSupabaseClient();
const agentRouter = new AgentRouter();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📱 WhatsApp webhook received');

    // SECURITY: Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const isAllowed = await checkRateLimit(clientIP, 1000, 60); // 1000 requests per hour
    if (!isAllowed) {
      await logSecurityEvent('rate_limit_exceeded', { client_ip: clientIP });
      return new Response('Rate limit exceeded', { status: 429 });
    }

    // SECURITY: Verify webhook signature with enhanced validation
    const rawBody = await req.text();
    const signature = req.headers.get('X-Hub-Signature-256') || '';
    const webhookSecret = Deno.env.get('WHATSAPP_WEBHOOK_SECRET');
    
    if (webhookSecret) {
      const isValidSignature = await validateWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValidSignature) {
        await logSecurityEvent('invalid_webhook_signature', { 
          client_ip: clientIP,
          signature_provided: !!signature 
        });
        console.warn('🚨 Invalid webhook signature');
        return new Response('Unauthorized', { status: 401 });
      }
    } else {
      console.warn('⚠️ No webhook secret configured - signature verification disabled');
    }

    // Parse and validate webhook payload
    const parseResult = whatsapp.parseWebhookPayload(rawBody);
    if (!parseResult.isValid) {
      console.error('Invalid webhook payload:', parseResult.error);
      return new Response('Bad Request', { status: 400 });
    }

    const { messages } = parseResult;
    if (!messages || messages.length === 0) {
      console.log('No messages in webhook payload');
      return new Response('OK', { 
        status: 200, 
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Process each message
    for (const message of messages) {
      await processMessage(message);
    }

    return new Response('OK', { 
      status: 200, 
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: corsHeaders
    });
  }
});

async function processMessage(message: any) {
  try {
    const phone = message.from?.replace(/[\s+]/g, '') || '';
    const rawMessage = message.text?.body || '';
    const messageText = sanitizeInput(rawMessage);
    
    if (!messageText || !phone) {
      console.log('Empty message or phone received, skipping');
      return;
    }

    // Log message processing attempt
    await logSecurityEvent('message_processing', {
      phone,
      message_length: messageText.length,
      original_length: rawMessage.length,
      sanitized: messageText !== rawMessage
    });

    console.log(`📞 Processing message from ${phone}: "${messageText}"`);

    // Get or create user
    let user = await db.getUserByPhone(phone);
    if (!user) {
      user = await db.createUser({
        phone,
        momo_code: phone,
        credits: 60
      });
      console.log('👤 Created new user:', user.id);
    }

    // Log incoming message
    await db.logConversation({
      user_id: user.id,
      role: 'user',
      message: messageText
    });

    // Update contact interaction
    await db.updateContactInteraction(phone);

    // Route message to appropriate agent
    const response = await agentRouter.routeMessage(messageText, user);

    // Log assistant response
    await db.logConversation({
      user_id: user.id,
      role: 'assistant',
      message: response.message
    });

    // Send response via WhatsApp
    await whatsapp.sendTextMessage(phone, response.message);

    // Handle any required actions
    if (response.action) {
      await handleAgentAction(response.action, response.data, user, phone);
    }

    // Check if human handoff is required
    if (response.requiresHuman) {
      await triggerHumanHandoff(user, messageText, phone);
    }

    console.log('✅ Message processed successfully');

  } catch (error) {
    console.error('❌ Message processing error:', error);
    
    // Send fallback message on error
    try {
      await whatsapp.sendTextMessage(
        message.from?.replace(/[\s+]/g, '') || '',
        "🤖 Sorry, I'm having technical difficulties. Please try again in a moment or contact support: +250 788 000 000"
      );
    } catch (fallbackError) {
      console.error('Failed to send fallback message:', fallbackError);
    }
  }
}

async function handleAgentAction(action: string, data: any, user: any, phone: string) {
  try {
    switch (action) {
      case 'collect_payment':
        console.log('Payment collection requested for user:', user.id);
        break;
      case 'show_products':
        console.log('Product browsing for user:', user.id);
        break;
      case 'create_trip':
        console.log('Trip created:', data?.trip?.id);
        break;
      case 'redirect':
        console.log('Redirect action for user:', user.id);
        break;
      default:
        console.log('Unknown action:', action);
    }
  } catch (error) {
    console.error('Action handling error:', error);
  }
}

async function triggerHumanHandoff(user: any, message: string, phone: string) {
  try {
    const ticketId = `EASY-${Date.now().toString().slice(-6)}`;
    
    const { error } = await supabase
      .from('conversations')
      .insert({
        contact_id: phone,
        channel: 'whatsapp',
        status: 'active',
        handoff_requested: true,
        handoff_reason: 'User requested human support',
        handoff_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to create support ticket:', error);
    } else {
      console.log(`🎧 Human handoff triggered for user ${user.id}, ticket: ${ticketId}`);
    }
  } catch (error) {
    console.error('Human handoff error:', error);
  }
}