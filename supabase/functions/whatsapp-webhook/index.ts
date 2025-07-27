import { serve } from 'https://deno.land/std@0.170.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Security Fix: Accept either WHATSAPP_VERIFY_TOKEN or META_WABA_VERIFY_TOKEN
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || Deno.env.get('META_WABA_VERIFY_TOKEN')

// CORS headers for security
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

// Input sanitization function
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  // Remove potentially dangerous characters and limit length
  return input.slice(0, 1000).replace(/[<>\"'&]/g, '');
}

// Security logging function
async function logSecurityEvent(eventType: string, severity: string, details: any, req: Request) {
  try {
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    await supabase.from('security_events').insert({
      event_type: eventType,
      severity,
      ip_address: clientIP,
      user_agent: userAgent,
      endpoint: '/whatsapp-webhook',
      details
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

function extractMessageText(message: any): string {
  if (message.text?.body) {
    return sanitizeInput(message.text.body);
  }
  if (message.type === "reaction" && message.reaction?.emoji) {
    return `Reaction: ${sanitizeInput(message.reaction.emoji)}`;
  }
  if (message.type === "image" && message.image?.caption) {
    return sanitizeInput(message.image.caption);
  }
  if (message.type === "sticker") {
    return "[Sticker received]";
  }
  if (Array.isArray(message.errors) && message.errors.length > 0) {
    const err = message.errors[0];
    return `[Unsupported message] ${sanitizeInput(err.title) ?? "Unknown"}`;
  }
  return `[${sanitizeInput(message.type) ?? "unknown"} message received]`;
}

// Input validation function
function validateMessageInput(messageText: string): { valid: boolean; error?: string } {
  if (typeof messageText !== 'string') {
    return { valid: false, error: 'Message must be a string' };
  }
  if (messageText.length > 2000) {
    return { valid: false, error: 'Message exceeds 2000 character limit' };
  }
  return { valid: true };
}

// Rate limiting function (10-second per-sender limit)
async function checkRateLimit(phoneNumber: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    const { data: lastMessage, error } = await supabase
      .from('incoming_messages')
      .select('created_at')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Rate limit check error:', error);
      return { allowed: true }; // Allow on error to avoid blocking
    }

    if (lastMessage) {
      const lastMessageTime = new Date(lastMessage.created_at).getTime();
      const now = Date.now();
      const timeDiff = now - lastMessageTime;
      
      if (timeDiff < 10000) { // 10 seconds
        return { 
          allowed: false, 
          error: `Rate limit exceeded. Please wait ${Math.ceil((10000 - timeDiff) / 1000)} seconds.` 
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: true }; // Allow on error to avoid blocking
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { method, url } = req
  const { searchParams } = new URL(url)

  // Security: Check if verify token is configured
  if (!VERIFY_TOKEN) {
    await logSecurityEvent('missing_verify_token', 'critical', { method, url }, req);
    return new Response('Configuration Error', { status: 500 });
  }

  // ✅ STEP 1: Meta verification
  if (method === 'GET') {
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    // Security: Log verification attempts
    await logSecurityEvent('webhook_verification', mode === 'subscribe' && token === VERIFY_TOKEN ? 'low' : 'medium', 
      { mode, token_match: token === VERIFY_TOKEN }, req);

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200, headers: corsHeaders })
    } else {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }
  }

  // ✅ STEP 2: Handle incoming messages
  if (method === 'POST') {
    try {
      const body = await req.json()
      console.log('📥 Webhook payload:', JSON.stringify(body, null, 2))

      const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
      if (message) {
        const phone = sanitizeInput(message.from)
        const messageText = extractMessageText(message)

        console.log('📞 Processing message:', { phone, messageText, type: message.type })

        // Rate limiting check
        const rateLimitCheck = await checkRateLimit(phone);
        if (!rateLimitCheck.allowed) {
          await logSecurityEvent('rate_limit_exceeded', 'medium', 
            { phone, error: rateLimitCheck.error }, req);
          return new Response(JSON.stringify({ error: rateLimitCheck.error }), { 
            status: 429, 
            headers: corsHeaders 
          });
        }

        // Input validation
        const validationResult = validateMessageInput(messageText);
        if (!validationResult.valid) {
          await logSecurityEvent('invalid_input_received', 'medium', 
            { phone, error: validationResult.error, messageLength: messageText.length }, req);
          return new Response(JSON.stringify({ error: validationResult.error }), { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // Log potential safety concerns for long messages
        if (messageText.length > 500) {
          await logSecurityEvent('long_message_received', 'low', 
            { phone, length: messageText.length }, req);
        }

        // Log message for safety monitoring
        await supabase.from('message_safety_log').insert({
          phone_number: phone,
          message_content: messageText,
          safety_score: 1.0,
          action_taken: 'processed'
        });

        // Save to Supabase with status 'received' for processing
        const { data, error } = await supabase.from('incoming_messages').insert({
          phone_number: phone,
          message: messageText,
          status: 'received'
        })

        if (error) {
          console.error('❌ Insert failed:', error.message)
          await logSecurityEvent('database_insert_failed', 'medium', { error: error.message, phone }, req);
          // Don't return error to WhatsApp - we want to acknowledge receipt
        } else {
          console.log('✅ Message saved to incoming_messages:', data)
        }
      } else {
        console.log('⚠️ No valid message found in payload')
        await logSecurityEvent('invalid_webhook_payload', 'low', { bodyKeys: Object.keys(body || {}) }, req);
      }

      return new Response('OK', { status: 200, headers: corsHeaders })
    } catch (err) {
      console.error('❌ Webhook error:', err.message)
      await logSecurityEvent('webhook_processing_error', 'high', { error: err.message }, req);
      return new Response('Error', { status: 500, headers: corsHeaders })
    }
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
})