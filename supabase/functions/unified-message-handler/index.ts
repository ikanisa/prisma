import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface UnifiedMessage {
  platform: 'whatsapp' | 'telegram' | 'web';
  sender: string;
  content: string;
  messageId: string;
  contactName?: string;
  timestamp: string;
  metadata?: any;
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { platform, payload } = await req.json();
    console.log(`📨 Processing ${platform} message`);

    let unifiedMessage: UnifiedMessage;

    if (platform === 'whatsapp') {
      // Handle WhatsApp Business API format
      const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      const contact = payload.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];

      if (!message || message.type !== 'text') {
        console.log('⏭️ Skipping non-text message');
        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      unifiedMessage = {
        platform: 'whatsapp',
        sender: message.from,
        content: message.text.body,
        messageId: message.id,
        contactName: contact?.profile?.name,
        timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
        metadata: { whatsapp: message }
      };
    } else if (platform === 'telegram') {
      // Handle Telegram format
      const message = payload.message;
      if (!message?.text) {
        console.log('⏭️ Skipping non-text Telegram message');
        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      unifiedMessage = {
        platform: 'telegram',
        sender: message.from.id.toString(),
        content: message.text,
        messageId: message.message_id.toString(),
        contactName: `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim(),
        timestamp: new Date(message.date * 1000).toISOString(),
        metadata: { telegram: message }
      };
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Rate limiting check
    const isLimited = await checkRateLimit(supabase, unifiedMessage.sender);
    if (isLimited) {
      console.log(`⏱️ Rate limited: ${unifiedMessage.sender}`);
      return new Response(JSON.stringify({ success: false, reason: 'rate_limited' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log incoming message to unified message_logs table
    await logMessage(supabase, unifiedMessage);

    // Process with AI
    const { error } = await supabase.functions.invoke('ai-processor', {
      body: {
        message: unifiedMessage,
        processingStartTime: Date.now()
      }
    });

    if (error) {
      console.error('❌ AI processor error:', error);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Unified handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function logMessage(supabase: any, message: UnifiedMessage) {
  try {
    // Insert into unified message_logs table
    const { error } = await supabase
      .from('message_logs')
      .insert([{
        platform: message.platform,
        sender_id: message.sender,
        contact_name: message.contactName,
        message_content: message.content,
        message_id: message.messageId,
        timestamp: message.timestamp,
        processed: false,
        metadata: message.metadata
      }]);

    if (error) {
      console.error('Failed to log message:', error);
    } else {
      console.log(`✅ Message logged: ${message.platform} from ${message.sender}`);
    }
  } catch (error) {
    console.error('Failed to log message:', error);
  }
}

async function checkRateLimit(supabase: any, senderId: string): Promise<boolean> {
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    
    const { count } = await supabase
      .from('message_logs')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', senderId)
      .gte('timestamp', oneMinuteAgo);

    // Allow max 15 messages per minute per sender
    return (count ?? 0) >= 15;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return false; // Default to allow if check fails
  }
}