import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Security: Content filtering function
function containsUnsafeContent(message: string): { safe: boolean; flaggedContent: string[] } {
  const flags: string[] = [];
  
  // Check for potential security threats
  const securityPatterns = [
    /script[\s\S]*>/i,
    /<[^>]*javascript:/i,
    /eval\s*\(/i,
    /on\w+\s*=/i
  ];
  
  for (const pattern of securityPatterns) {
    if (pattern.test(message)) {
      flags.push('potential_script_injection');
      break;
    }
  }
  
  // Check for spam indicators
  if (message.length > 2000) flags.push('excessive_length');
  if (/(.)\1{10,}/.test(message)) flags.push('repeated_characters');
  
  return { safe: flags.length === 0, flaggedContent: flags };
}

// Security logging function
async function logSecurityEvent(eventType: string, severity: string, details: any, supabase: any) {
  try {
    await supabase.from('security_events').insert({
      event_type: eventType,
      severity,
      endpoint: '/process-incoming-messages',
      details
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Handle both direct calls and webhook-style calls
    let messageData;
    if (req.method === 'POST') {
      const body = await req.json();
      messageData = body;
    }

<<<<<<< HEAD
    // Initialize Supabase client 
=======
    // Initialize Supabase client
>>>>>>> fe34c5e (fix: remove workspace config and allow package-lock; fix supabase client import)
    const supabase = supabaseClient;

    console.log('🔄 Processing incoming messages...')

    // STEP 1: Get unprocessed messages from the new table structure
    const { data: messages, error: fetchError } = await supabase
      .from('incoming_messages')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(1)

    if (fetchError) {
      throw new Error(`Failed to fetch messages: ${fetchError.message}`)
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No new messages to process' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const latestMessage = messages[0]
    console.log('📨 Processing message', {
      phone: latestMessage.from_number,
      messagePreview: latestMessage.message_text?.substring(0, 50)
    })

    // Upsert user in users table using WhatsApp data  
    console.log(`📞 Upserting user for wa_id: ${latestMessage.from_number}`);
    const { error: upsertError } = await supabase.from('users').upsert({
      wa_id: latestMessage.from_number,
      display_name: "WhatsApp User",
      language: 'en',
      source: 'whatsapp'
    }, { onConflict: 'wa_id' });

    if (upsertError) {
      console.error("Failed to upsert user:", upsertError);
    } else {
      console.log(`✅ User upserted successfully for wa_id: ${latestMessage.from_number}`);
    }

    // Validate message before processing
    if (typeof latestMessage.message_text !== 'string' || latestMessage.message_text.length > 2000) {
      console.log('⚠️ Skipping invalid message:', {
        phone: latestMessage.from_number,
        isString: typeof latestMessage.message_text === 'string',
        length: latestMessage.message_text?.length
      });

      // Mark as processed but don't send to AI
      await supabase
        .from('incoming_messages')
        .update({ 
          processed: true
        })
        .eq('id', latestMessage.id);

      return new Response(JSON.stringify({
        success: true,
        message: 'Invalid message skipped',
        phone_number: latestMessage.from_number,
        reason: 'Message validation failed',
        processed_at: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Security: Check message content safety
    const safetyCheck = containsUnsafeContent(latestMessage.message_text);
    if (!safetyCheck.safe) {
      await logSecurityEvent('unsafe_content_detected', 'medium', {
        phone: latestMessage.from_number,
        flaggedContent: safetyCheck.flaggedContent,
        messageLength: latestMessage.message_text.length
      }, supabase);
    }

    // STEP 2: Use modern Chat Completions API instead of Assistants
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      await logSecurityEvent('missing_openai_api_key', 'critical', {}, supabase);
      throw new Error('OPENAI_API_KEY environment variable is required')
    }

    // Generate AI response using GPT-4.1
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are easyMO, a helpful AI assistant for a WhatsApp-based super-app in Rwanda. 
            You help users with:
            - Mobile money payments
            - Finding and ordering produce from farmers
            - Booking rides and transportation
            - Discovering local events
            
            Always respond in a friendly, helpful manner. Keep responses concise and actionable.
            If users need specific services, guide them through the process step by step.`
          },
          {
            role: 'user',
            content: latestMessage.message_text
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const aiReply = openaiData.choices[0].message.content;
    
    console.log('🤖 AI Response generated', { 
      responseLength: aiReply.length,
      preview: aiReply.substring(0, 100)
    })

    // Store conversation messages
    await supabase.from('conversation_messages').insert({
      phone_number: latestMessage.from_number,
      sender: 'user',
      message_text: latestMessage.message_text,
      channel: 'whatsapp'
    });

    await supabase.from('conversation_messages').insert({
      phone_number: latestMessage.from_number,
      sender: 'assistant',
      message_text: aiReply,
      channel: 'whatsapp',
      model_used: 'gpt-4.1-2025-04-14'
    });

    // STEP 3: Send reply via WhatsApp API
    const whatsappPhoneId = Deno.env.get('META_WABA_PHONE_ID') || Deno.env.get('WHATSAPP_PHONE_ID')
    const whatsappToken = Deno.env.get('META_WABA_TOKEN') || Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    
    if (!whatsappPhoneId || !whatsappToken) {
      throw new Error('META_WABA_PHONE_ID and META_WABA_TOKEN environment variables are required')
    }

    // Send reply via WhatsApp API directly
    const whatsappResponse = await fetch(`https://graph.facebook.com/v20.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: latestMessage.from_number,
        type: "text",
        text: {
          body: aiReply
        }
      }),
    });

    if (whatsappResponse.ok) {
      console.log(`📤 Reply sent successfully to ${latestMessage.from_number}`);
    } else {
      console.error(`❌ Failed to send WhatsApp message: ${whatsappResponse.status}`);
    }

    // STEP 4: Mark message as processed
    const { error: updateError } = await supabase
      .from('incoming_messages')
      .update({ 
        processed: true
      })
      .eq('id', latestMessage.id)

    if (updateError) {
      throw new Error(`Failed to update message status: ${updateError.message}`)
    }

    console.log('✅ Message processed successfully', {
      phone: latestMessage.from_number,
      messageId: latestMessage.id
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'Message processed successfully',
      phone_number: latestMessage.from_number,
      original_message: latestMessage.message_text,
      ai_reply: aiReply,
      processed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error processing message:', error)
    
    // Log security event for processing failures
    try {
      const supabase = supabaseClient;
      await logSecurityEvent('message_processing_error', 'high', { 
        error: error.message 
      }, supabase);
    } catch (logError) {
      console.error('Failed to log error event:', logError);
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
