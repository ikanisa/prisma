import { serve } from 'https://deno.land/std@0.170.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client 
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('🔄 Processing incoming messages...')

    // STEP 1: Get the first new message
    const { data: messages, error: fetchError } = await supabase
      .from('incoming_messages')
      .select('*')
      .eq('status', 'received')
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
      phone: latestMessage.phone_number,
      messagePreview: latestMessage.message.substring(0, 50)
    })

    // Security: Check message content safety
    const safetyCheck = containsUnsafeContent(latestMessage.message);
    if (!safetyCheck.safe) {
      await logSecurityEvent('unsafe_content_detected', 'medium', {
        phone: latestMessage.phone_number,
        flaggedContent: safetyCheck.flaggedContent,
        messageLength: latestMessage.message.length
      }, supabase);
      
      // Log the safety issue
      await supabase.from('message_safety_log').insert({
        phone_number: latestMessage.phone_number,
        message_content: latestMessage.message.slice(0, 500), // Truncate for safety
        safety_score: 0.5,
        flagged_content: safetyCheck.flaggedContent,
        action_taken: 'flagged_and_processed'
      });
    }

    // STEP 2: Get AI response using OpenAI Assistant
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      await logSecurityEvent('missing_openai_api_key', 'critical', {}, supabase);
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
    
    // Security: Use environment variable for assistant ID instead of hardcoded value
    const assistantId = Deno.env.get('OPENAI_ASSISTANT_ID') || 'asst_anmQpZHZJxr1JjrlohSyPSx1'

    // Create a thread and add the user message
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: latestMessage.message
          }
        ]
      })
    })

    if (!threadResponse.ok) {
      throw new Error(`Failed to create thread: ${threadResponse.statusText}`)
    }

    const thread = await threadResponse.json()
    console.log(`🧵 Created thread: ${thread.id}`)

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId
      })
    })

    if (!runResponse.ok) {
      throw new Error(`Failed to run assistant: ${runResponse.statusText}`)
    }

    const run = await runResponse.json()
    console.log(`🤖 Started assistant run: ${run.id}`)

    // Wait for completion (with timeout)
    let attempts = 0
    const maxAttempts = 30
    let runStatus = run.status

    while (runStatus === 'queued' || runStatus === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Assistant run timed out')
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      })

      if (!statusResponse.ok) {
        throw new Error(`Failed to check run status: ${statusResponse.statusText}`)
      }

      const statusData = await statusResponse.json()
      runStatus = statusData.status
      attempts++
    }

    if (runStatus !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus}`)
    }

    // Get the assistant's response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    })

    if (!messagesResponse.ok) {
      throw new Error(`Failed to get messages: ${messagesResponse.statusText}`)
    }

    const messagesData = await messagesResponse.json()
    const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant')
    
    if (!assistantMessage || !assistantMessage.content[0]?.text?.value) {
      throw new Error('No assistant response found')
    }

    const aiReply = assistantMessage.content[0].text.value
    console.log('🤖 AI Response generated', { 
      responseLength: aiReply.length,
      preview: aiReply.substring(0, 100)
    })

    // STEP 3: Store and send reply via WhatsApp API
    const whatsappPhoneId = Deno.env.get('META_WABA_PHONE_ID') || Deno.env.get('WHATSAPP_PHONE_ID')
    const whatsappToken = Deno.env.get('META_WABA_TOKEN') || Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    
    if (!whatsappPhoneId || !whatsappToken) {
      throw new Error('META_WABA_PHONE_ID and META_WABA_TOKEN environment variables are required')
    }

    // Store outgoing message
    const { data: outgoingData, error: outgoingError } = await supabase
      .from('outgoing_messages')
      .insert({
        to_number: latestMessage.phone_number,
        message_text: aiReply,
        status: 'pending'
      })
      .select()
      .single()

    if (outgoingError) {
      throw new Error(`Failed to store outgoing message: ${outgoingError.message}`)
    }

    // Send via WhatsApp using the send function
    const { data: sendData, error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
      body: {
        to_number: latestMessage.phone_number,
        message_text: aiReply
      }
    })

    if (sendError || !sendData?.success) {
      console.error('❌ Failed to send WhatsApp message:', sendError || sendData)
      
      // Update outgoing message status to failed
      await supabase
        .from('outgoing_messages')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', outgoingData.id)
        
      throw new Error(`Failed to send WhatsApp message: ${sendError?.message || sendData?.error}`)
    }
    
    // Update outgoing message status to sent
    await supabase
      .from('outgoing_messages')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', outgoingData.id)
    
    console.log('📤 WhatsApp message sent successfully')

    // STEP 4: Mark message as processed
    const { error: updateError } = await supabase
      .from('incoming_messages')
      .update({ 
        status: 'processed',
        updated_at: new Date().toISOString()
      })
      .eq('id', latestMessage.id)

    if (updateError) {
      throw new Error(`Failed to update message status: ${updateError.message}`)
    }

    console.log('✅ Message processed successfully', {
      phone: latestMessage.phone_number,
      messageId: latestMessage.id
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'Message processed successfully',
      phone_number: latestMessage.phone_number,
      original_message: latestMessage.message,
      ai_reply: aiReply,
      processed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error processing message:', error)
    
    // Log security event for processing failures
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
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