import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResponseRequest {
  originalMessage: {
    sender: string;
    content: string;
    channel: string;
    messageId: string;
    contactName?: string;
    timestamp: string;
  };
  aiResponse: {
    content: string;
    confidence: number;
    modelUsed: string;
    reasoning: string;
    memoryUpdated: boolean;
    suggestedActions?: string[];
  };
  processingMetadata: {
    processingTime: number;
    memoryConfidence: number;
    conversationContext: any;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('=== RESPONSE ENGINE PHASE 3 START ===');
    
    const { originalMessage, aiResponse, processingMetadata }: ResponseRequest = await req.json();
    const engineStartTime = Date.now();
    
    console.log('Processing response delivery:', {
      channel: originalMessage.channel,
      sender: originalMessage.sender,
      responseLength: aiResponse.content.length,
      confidence: aiResponse.confidence,
      memoryUpdated: aiResponse.memoryUpdated
    });

    // STEP 1: Optimize response for channel-specific delivery
    console.log('Step 1: Optimizing response for channel...');
    const optimizedResponse = await optimizeResponseForChannel(
      aiResponse.content,
      originalMessage.channel,
      aiResponse.confidence
    );

    // STEP 2: Determine delivery strategy based on context
    console.log('Step 2: Determining delivery strategy...');
    const deliveryStrategy = determineDeliveryStrategy(
      originalMessage,
      aiResponse,
      processingMetadata
    );

    // STEP 3: Execute smart delivery via channel gateway
    console.log('Step 3: Executing smart delivery...');
    const deliveryResult = await executeSmartDelivery(
      supabase,
      originalMessage,
      optimizedResponse,
      deliveryStrategy
    );

    // STEP 4: Log conversation with enhanced metadata
    console.log('Step 4: Logging enhanced conversation...');
    const conversationId = await logEnhancedConversation(
      supabase,
      originalMessage,
      aiResponse,
      deliveryResult,
      processingMetadata
    );

    // STEP 5: Update contact intelligence
    console.log('Step 5: Updating contact intelligence...');
    await updateContactIntelligence(
      supabase,
      originalMessage.sender,
      aiResponse,
      deliveryResult
    );

    // STEP 6: Trigger follow-up actions if needed
    if (aiResponse.suggestedActions && aiResponse.suggestedActions.length > 0) {
      console.log('Step 6: Scheduling follow-up actions...');
      await scheduleFollowUpActions(
        supabase,
        originalMessage.sender,
        aiResponse.suggestedActions,
        conversationId
      );
    }

    const totalProcessingTime = Date.now() - engineStartTime;
    
    console.log('=== RESPONSE ENGINE PHASE 3 SUCCESS ===');
    console.log(`Response delivery completed in ${totalProcessingTime}ms`);
    console.log(`Conversation logged: ${conversationId}`);
    console.log(`Delivery strategy: ${deliveryStrategy.method}`);

    return new Response(JSON.stringify({
      success: true,
      conversationId: conversationId,
      deliveryStrategy: deliveryStrategy.method,
      responseOptimized: true,
      processingTime: totalProcessingTime,
      followUpActionsScheduled: aiResponse.suggestedActions?.length || 0
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('=== RESPONSE ENGINE PHASE 3 ERROR ===');
    console.error('Error:', error);

    // Log execution error
    await supabase
      .from('agent_execution_log')
      .insert([{
        function_name: 'response-engine-phase3',
        success_status: false,
        error_details: error.message,
        timestamp: new Date().toISOString(),
        execution_time_ms: Date.now() - engineStartTime
      }]);

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function optimizeResponseForChannel(
  content: string,
  channel: string,
  confidence: number
): Promise<string> {
  // Channel-specific optimizations
  switch (channel) {
    case 'whatsapp':
      // WhatsApp optimizations: emojis, shorter paragraphs, clear CTAs
      return optimizeForWhatsApp(content, confidence);
    case 'telegram':
      // Telegram optimizations: markdown support, longer messages OK
      return optimizeForTelegram(content, confidence);
    case 'sms':
      // SMS optimizations: character limits, concise messaging
      return optimizeForSMS(content);
    default:
      return content;
  }
}

function optimizeForWhatsApp(content: string, confidence: number): string {
  let optimized = content;
  
  // Add confidence-based emojis
  if (confidence > 0.8) {
    optimized = '✅ ' + optimized;
  } else if (confidence < 0.6) {
    optimized = '🤔 ' + optimized;
  }
  
  // Ensure clear call-to-action
  if (!optimized.includes('?') && !optimized.includes('try')) {
    optimized += '\n\n💬 Need help getting started?';
  }
  
  return optimized;
}

function optimizeForTelegram(content: string, confidence: number): string {
  // Telegram supports markdown, so we can enhance formatting
  let optimized = content;
  
  // Add markdown formatting for key points
  optimized = optimized.replace(/easyMO/g, '*easyMO*');
  optimized = optimized.replace(/Rwanda/g, '*Rwanda*');
  
  return optimized;
}

function optimizeForSMS(content: string): string {
  // SMS has character limits, so we need to be concise
  if (content.length > 160) {
    const summary = content.substring(0, 140) + '...';
    return summary + '\n\nReply for more info';
  }
  return content;
}

function determineDeliveryStrategy(
  originalMessage: any,
  aiResponse: any,
  metadata: any
): { method: string; priority: string; timing: string } {
  // High confidence and immediate response
  if (aiResponse.confidence > 0.8) {
    return {
      method: 'immediate',
      priority: 'high',
      timing: 'instant'
    };
  }
  
  // Medium confidence - add slight delay for natural feel
  if (aiResponse.confidence > 0.6) {
    return {
      method: 'delayed',
      priority: 'medium',
      timing: '2-3 seconds'
    };
  }
  
  // Lower confidence - may need human review
  return {
    method: 'reviewed',
    priority: 'low',
    timing: 'queue for review'
  };
}

async function executeSmartDelivery(
  supabase: any,
  originalMessage: any,
  optimizedResponse: string,
  strategy: any
) {
  try {
    // Add natural delay for better user experience
    if (strategy.timing === '2-3 seconds') {
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
    
    // Use existing response-sender function for actual delivery
    const { data, error } = await supabase.functions.invoke('response-sender', {
      body: {
        channel: originalMessage.channel,
        recipient: originalMessage.sender,
        message: optimizedResponse,
        meta: {
          priority: strategy.priority,
          delivery_method: strategy.method
        }
      }
    });

    if (error) {
      console.error('Response sender error:', error);
      throw new Error(`Delivery failed: ${error.message}`);
    }

    return {
      success: true,
      deliveryMethod: strategy.method,
      messageId: data?.message_id,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Smart delivery failed:', error);
    throw error;
  }
}

async function logEnhancedConversation(
  supabase: any,
  originalMessage: any,
  aiResponse: any,
  deliveryResult: any,
  metadata: any
) {
  try {
    // Log enhanced conversation messages
    const { data, error } = await supabase
      .from('conversation_messages')
      .insert([
        {
          phone_number: originalMessage.sender,
          channel: originalMessage.channel,
          sender: 'user',
          message_text: originalMessage.content,
          created_at: new Date().toISOString()
        },
        {
          phone_number: originalMessage.sender,
          channel: originalMessage.channel,
          sender: 'agent',
          message_text: aiResponse.content,
          model_used: aiResponse.modelUsed,
          confidence_score: aiResponse.confidence,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    return data?.[0]?.id || 'conversation_logged';
  } catch (error) {
    console.error('Error logging enhanced conversation:', error);
    return null;
  }
}

async function updateContactIntelligence(
  supabase: any,
  contactId: string,
  aiResponse: any,
  deliveryResult: any
) {
  try {
    await supabase
      .from('user_contacts')
      .upsert([{
        phone: contactId,
        name: 'Unknown',
        source: 'whatsapp',
        category: aiResponse.confidence > 0.8 ? 'engaged' : 'prospect',
        created_at: new Date().toISOString()
      }], { onConflict: 'phone' });
  } catch (error) {
    console.error('Error updating contact intelligence:', error);
  }
}

async function scheduleFollowUpActions(
  supabase: any,
  contactId: string,
  actions: string[],
  conversationId: string
) {
  try {
    // Log suggested actions for admin review
    await supabase
      .from('conversation_learning_log')
      .insert([{
        user_id: contactId,
        learning_summary: `Follow-up actions suggested: ${actions.join(', ')}`,
        confidence_level: 0.7,
        improvement_note: `Conversation: ${conversationId}`,
        timestamp: new Date().toISOString()
      }]);
  } catch (error) {
    console.error('Error scheduling follow-up actions:', error);
  }
}