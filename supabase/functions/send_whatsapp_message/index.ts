// supabase/functions/send_whatsapp_message/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOKEN = Deno.env.get("META_WABA_TOKEN")!;
const PHONE_ID = Deno.env.get("META_WABA_PHONE_ID")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Validate required environment variables
if (!TOKEN || !PHONE_ID || !supabaseUrl || !supabaseKey) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation and sanitization
function validateAndSanitizeInput(to: string, body: string) {
  // Validate phone number format
  const phoneRegex = /^\+?[1-9]\d{10,14}$/;
  if (!phoneRegex.test(to.replace(/\s+/g, ''))) {
    throw new Error("Invalid phone number format");
  }

  // Sanitize and validate message body
  if (typeof body !== 'string' || body.length === 0) {
    throw new Error("Message body must be a non-empty string");
  }

  if (body.length > 4000) {
    throw new Error("Message body too long (max 4000 characters)");
  }

  // Remove potentially dangerous content
  const sanitizedBody = body
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .substring(0, 4000);

  return {
    to: to.replace(/\s+/g, ''),
    body: sanitizedBody
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Check rate limit
    const { data: rateLimitResult } = await supabase.rpc('check_rate_limit', {
      identifier: clientIP,
      max_requests: 60,
      window_seconds: 3600
    });

    if (rateLimitResult && !rateLimitResult.allowed) {
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded",
        retry_after: rateLimitResult.reset_time
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate request size
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10000) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requestData = await req.json();
    const { to, body } = requestData;

    if (!to || !body) {
      return new Response(JSON.stringify({ error: "Missing required parameters: 'to' and 'body'" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate and sanitize input
    const { to: sanitizedTo, body: sanitizedBody } = validateAndSanitizeInput(to, body);

    // Content moderation check
    const { data: moderationResult } = await supabase.rpc('moderate_content', {
      content: sanitizedBody
    });

    if (moderationResult && !moderationResult.is_safe) {
      return new Response(JSON.stringify({ 
        error: "Message content not allowed",
        flags: moderationResult.flags
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = {
      messaging_product: "whatsapp",
      to: sanitizedTo,
      type: "text",
      text: { body: sanitizedBody }
    };

    const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (!res.ok) {
      // Log error without exposing sensitive details
      console.error("WhatsApp API error:", { status: res.status, error: data.error?.message });
      
      return new Response(JSON.stringify({ 
        error: "Failed to send message",
        status: res.status
      }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log success without sensitive data
    console.log("Message sent successfully", { 
      messageId: data.messages?.[0]?.id,
      status: "sent"
    });

    return new Response(JSON.stringify({
      success: true,
      messageId: data.messages?.[0]?.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // Log error without sensitive information
    console.error("Error in send_whatsapp_message:", error.message);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});