import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { assistantSDK, getOpenAI } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_ASSISTANT_ID = Deno.env.get('OPENAI_ASSISTANT_ID');


serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, sessionId } = await req.json();

    if (!OPENAI_API_KEY || !OPENAI_ASSISTANT_ID) {
      throw new Error('OpenAI API key or Assistant ID not configured');
    }

    console.log('📞 Starting assistant conversation', { sessionId, messageLength: message?.length });

    // Create a thread if sessionId is not provided using OpenAI SDK
    let threadId = sessionId;
    if (!threadId) {
      const thread = await assistantSDK.createThread();
      threadId = thread.id;
      console.log('🧵 Created new thread:', threadId);
    }

    // Add user message to thread with context
    const messageContent = context 
      ? `Context: ${context}\n\nUser Question: ${message}`
      : message;

    const addMessageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: messageContent
      })
    });

    if (!addMessageResponse.ok) {
      throw new Error(`Failed to add message: ${addMessageResponse.statusText}`);
    }

    console.log('💬 Added message to thread');

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: OPENAI_ASSISTANT_ID,
        instructions: `You are a senior fullstack developer assistant specializing in:
        1. Code interpretation and debugging
        2. Error analysis and fixing
        3. WhatsApp Business API integration
        4. React/TypeScript development
        5. Supabase edge functions
        6. Database troubleshooting
        
        Provide practical, actionable solutions with code examples when relevant.
        Focus on helping with WhatsApp chat setup and integration issues.
        Always consider security best practices and efficient implementation patterns.`
      })
    });

    if (!runResponse.ok) {
      throw new Error(`Failed to run assistant: ${runResponse.statusText}`);
    }

    const run = await runResponse.json();
    console.log('🏃 Started assistant run:', run.id);

    // Poll for completion
    let runStatus = run;
    let attempts = 0;
    const maxAttempts = 30;

    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      if (attempts >= maxAttempts) {
        throw new Error('Assistant run timeout');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check run status: ${statusResponse.statusText}`);
      }

      runStatus = await statusResponse.json();
      attempts++;
      console.log(`⏳ Run status: ${runStatus.status} (attempt ${attempts})`);
    }

    if (runStatus.status === 'failed') {
      throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Assistant run ended with status: ${runStatus.status}`);
    }

    // Get the assistant's response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse.ok) {
      throw new Error(`Failed to get messages: ${messagesResponse.statusText}`);
    }

    const messages = await messagesResponse.json();
    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');

    if (!assistantMessage) {
      throw new Error('No assistant response found');
    }

    const responseText = assistantMessage.content[0]?.text?.value || 'No response generated';
    console.log('✅ Assistant response received');

    // Log conversation for debugging
    await supabase.from('conversation_messages').insert({
      phone_number: sessionId || 'code-assistant',
      channel: 'code-assistant',
      sender: 'user',
      message_text: message,
      created_at: new Date().toISOString()
    });

    await supabase.from('conversation_messages').insert({
      phone_number: sessionId || 'code-assistant',
      channel: 'code-assistant',
      sender: 'assistant',
      message_text: responseText,
      model_used: 'assistant-' + OPENAI_ASSISTANT_ID,
      created_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      response: responseText,
      threadId: threadId,
      status: 'success'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Code assistant error:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      status: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});