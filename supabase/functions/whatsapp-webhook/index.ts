import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TPL, quickReplyMap, sendTemplate, logTemplateSend } from '../_shared/templates.ts';
import { decideResponse } from '../_shared/decideResponse.ts';
import { sendInteractive, sendPlain } from '../_shared/waSendHelpers.ts';
import { getState, setState } from '../_shared/conversationState.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// **FIX #6: ENVIRONMENT VARIABLES** - Support multiple env var formats
const verifyToken = Deno.env.get('META_WABA_VERIFY_TOKEN') || 
                   Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 
                   Deno.env.get('VERIFY_TOKEN') || 
                   'your_verify_token';

const accessToken = Deno.env.get('META_WABA_ACCESS_TOKEN') || 
                   Deno.env.get('WHATSAPP_TOKEN') || 
                   Deno.env.get('ACCESS_TOKEN');

const phoneNumberId = Deno.env.get('META_PHONE_NUMBER_ID') || 
                     Deno.env.get('PHONE_NUMBER_ID');

// **FIX #8: CIRCULAR CALL PREVENTION** - Track processing to prevent loops
const processingMessages = new Set<string>();

serve(async (req) => {
  console.log('🚀 Consolidated WhatsApp Webhook starting...');
  
  // **FIX #3 & #4: IMMEDIATE RESPONSE** - Respond to Meta immediately to prevent retries
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('🔐 Webhook verification request:', { mode, token });

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook verified successfully');
      return new Response(challenge, { headers: corsHeaders });
    } else {
      console.log('❌ Webhook verification failed');
      return new Response('Verification failed', { 
        status: 403,
        headers: corsHeaders 
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('Incoming WhatsApp payload:', JSON.stringify(body, null, 2));

      // **FIX #3 & #4: IMMEDIATE RESPONSE** - Process async, respond immediately
      processWebhookAsync(body).catch(error => {
        console.error("❌ Async webhook processing error:", error);
      });

      // Return immediate response to prevent Meta retries
      return new Response("EVENT_RECEIVED", { 
        status: 200,
        headers: corsHeaders 
      });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("EVENT_RECEIVED", { 
        status: 200, // Always return 200 to prevent Meta retries
        headers: corsHeaders 
      });
    }
  }

  return new Response("Method not allowed", { 
    status: 405,
    headers: corsHeaders 
  });
});

// **FIX #1 & #5: ATOMIC DUPLICATE PREVENTION** - Async processing with proper duplicate handling
async function processWebhookAsync(body: any) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Handle different webhook events
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;

        // Skip status updates
        if (value.statuses) {
          console.log('📨 Received status update, skipping processing');
          continue;
        }

        // Process messages
        if (value.messages) {
          for (const message of value.messages) {
            const messageId = message.id;
            const from = message.from;
            const messageType = message.type;
            const contactName = value.contacts?.[0]?.profile?.name || 'Unknown';

            // **FIX #8: CIRCULAR CALL PREVENTION** - Check if already processing
            if (processingMessages.has(messageId)) {
              console.log(`🔄 Message ${messageId} already being processed, skipping`);
              continue;
            }

            processingMessages.add(messageId);

            try {
              // **FIX #1: ATOMIC DUPLICATE PREVENTION** - Use upsert for safe insert
              const { data: upsertResult, error: upsertError } = await supabase
                .from('processed_inbound')
                .upsert({
                  msg_id: messageId,
                  wa_id: from,
                  processed_at: new Date().toISOString(),
                  metadata: { contact_name: contactName, message_type: messageType }
                }, {
                  onConflict: 'msg_id',
                  ignoreDuplicates: true
                })
                .select('msg_id');

              // If upsert returns no data, it means this was a duplicate
              if (!upsertResult || upsertResult.length === 0) {
                console.log(`⏭️ Duplicate message detected via upsert: ${messageId}`);
                continue;
              }

              if (upsertError) {
                console.error(`❌ Error upserting processed message: ${upsertError.message}`);
                continue;
              }

              console.log(`📨 Processing ${messageType} message from ${from}: ${message.text?.body || 'non-text'} [ID: ${messageId}]`);

              // Check for button responses first
              if (messageType === 'button' && message.button?.text) {
                const buttonText = message.button.text;
                
                // Look up button payload from database instead of hardcoded map
                const { data: buttonRow, error: buttonError } = await supabase
                  .from('action_buttons')
                  .select('payload')
                  .eq('label', buttonText)
                  .single();
                
                const payload = buttonRow?.payload || quickReplyMap[buttonText]; // Fallback to old map
                
                console.log(`🔘 Button pressed: "${buttonText}" -> payload: ${payload} (source: ${buttonRow ? 'DB' : 'fallback'})`);
                
                if (payload) {
                  await routeQuickReply(supabase, from, payload, contactName);
                  continue;
                }
              }
              
              // Check if this is a new user or session expired (24h)
              const isNewUser = await checkNewUser(supabase, from);
              const sessionExpired = await checkSessionExpired(supabase, from);
              
              if (isNewUser || sessionExpired) {
                // Use intelligent template routing for better experience
                const templateDecision = await getIntelligentTemplate(supabase, message.text?.body || '', from, sessionExpired);
                
                console.log(`🧠 Intelligent template for ${from}: ${templateDecision.templateName} (confidence: ${templateDecision.confidence})`);
                
                await sendTemplate(from, templateDecision.templateName);
                await logTemplateSend(supabase, from, templateDecision.templateName);
                continue;
              }

              if (messageType === 'text') {
                console.log(`Received text message from ${from}: ${message.text.body}`);
                
                // Use intelligent AI processor instead of hardcoded responses
                await processMessageWithIntelligentAI(
                  supabase,
                  from,
                  message.text.body,
                  messageType,
                  messageId,
                  contactName,
                  new Date(parseInt(message.timestamp) * 1000),
                  message
                );
              }
            } finally {
              // Always remove from processing set
              processingMessages.delete(messageId);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Async webhook processing error:", error);
  }
}

// Intelligent AI-powered message processing
async function processMessageWithIntelligentAI(
  supabase: any,
  from: string,
  text: string,
  messageType: string,
  messageId: string,
  contactName: string,
  timestamp: Date,
  rawMessage: any
) {
  console.log(`🧠 Processing ${messageType} message with intelligent AI from ${from}:`, text);
  
  try {
    // Call the intelligent WhatsApp processor
    const { data: aiResponse, error } = await supabase.functions.invoke('intelligent-whatsapp-processor', {
      body: { 
        message: text,
        phone: from,
        contactName: contactName,
        timestamp: timestamp.toISOString(),
        messageId: messageId
      }
    });

    if (error) {
      console.error(`❌ Intelligent AI processor error:`, error);
      await sendWhatsAppMessage(from, "🤖 I'm experiencing technical difficulties. Please try again in a moment.");
      return;
    }

    if (aiResponse?.success && aiResponse?.response) {
      console.log(`✅ Intelligent AI response received for ${from}:`, {
        intent: aiResponse.intent?.intent,
        domain: aiResponse.intent?.domain,
        confidence: aiResponse.intent?.confidence,
        response_type: aiResponse.response?.type
      });

      // Send the appropriate response type
      const response = aiResponse.response;
      
      if (response.type === 'media' && response.media_url) {
        // For media responses (QR codes, images)
        await sendWhatsAppMedia(from, response.media_url, response.message || '');
      } else if (response.buttons && response.buttons.length > 0) {
        // For interactive button responses
        await sendWhatsAppInteractive(from, response.message || 'Choose an option:', response.buttons);
      } else {
        // For text responses
        await sendWhatsAppMessage(from, response.message || 'How can I help you?');
      }

      // Update conversation state based on AI response
      if (aiResponse.intent?.domain) {
        await setState(from, { 
          stage: aiResponse.intent.domain,
          last_user_msg_at: timestamp.toISOString(),
          last_intent: aiResponse.intent.intent,
          last_confidence: aiResponse.intent.confidence
        });
      }

      // Update contact interaction
      await supabase.from('contacts').upsert({
        phone_number: from,
        name: contactName,
        last_interaction: timestamp.toISOString(),
        status: 'active'
      }, { onConflict: 'phone_number' });

    } else {
      console.error(`❌ Invalid AI response:`, aiResponse);
      await sendWhatsAppMessage(from, "🤖 I'm experiencing technical difficulties. Please try again in a moment.");
    }

  } catch (error) {
    console.error(`❌ Error in intelligent AI processing:`, error);
    await sendWhatsAppMessage(from, "🤖 I'm experiencing technical difficulties. Please try again in a moment.");
  }
}

// **FIX #2: CONTROLLED AGENT PROCESSING** - Single agent call with timeout and error handling
async function processMessageSafely(
  supabase: any,
  from: string,
  text: string,
  messageType: string,
  messageId: string,
  contactName: string,
  timestamp: Date,
  rawMessage: any
) {
  console.log(`🧠 Processing ${messageType} message from ${from}:`, text || 'non-text');
  
  try {
    // **FIX #2: SINGLE AGENT CALL** - Call omni-agent-router for intent detection and actions
    const timeoutMs = 8000; // 8 seconds max
    const agentPromise = supabase.functions.invoke('omni-agent-router', {
      body: { 
        message: text, 
        userId: from,
        phone: from,
        context: {
          phone: from,
          name: contactName,
          preferredLanguage: 'rw',
          lastInteraction: timestamp.toISOString(),
          conversationCount: 1,
          userType: 'returning'
        }
      }
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Agent timeout')), timeoutMs)
    );

    console.log(`🤖 Calling omni-agent-router for intent detection and actions...`);
    const { data: response, error } = await Promise.race([agentPromise, timeoutPromise]) as any;

    if (error) {
      console.error(`❌ AI agent error:`, error);
      await sendWhatsAppMessage(from, "🤖 I'm experiencing technical difficulties. Please try again in a moment.");
      return;
    }

    if (response?.success && response?.response) {
      console.log(`✅ AI agent response received:`, JSON.stringify({
        success: response.success,
        intent: response.intent,
        response_type: response.response?.response_type,
        message: response.response?.message?.substring(0, 100) + '...',
        media_url: response.response?.media_url
      }));

      // Extract the actual message from the response structure
      let finalMessage = '';
      
      if (response.response.response_type === 'media' && response.response.media_url) {
        // For media responses, send the image URL and message
        finalMessage = response.response.message || 'Here is your requested content:';
        // TODO: Implement media sending via WhatsApp API
        console.log(`📷 Media response detected: ${response.response.media_url}`);
      } else {
        finalMessage = response.response.message || response.response;
      }

      const truncatedResponse = finalMessage.length > 1000 
        ? finalMessage.substring(0, 1000) + '...' 
        : finalMessage;

      await sendWhatsAppMessage(from, truncatedResponse);
      console.log(`✅ Generated response for ${messageId}: ${truncatedResponse}`);
    } else {
      console.error(`❌ Invalid AI response:`, response);
      await sendWhatsAppMessage(from, "🤖 I'm experiencing technical difficulties. Please try again in a moment.");
    }

  } catch (error) {
    console.error(`❌ Error processing message:`, error);
    await sendWhatsAppMessage(from, "🤖 I'm experiencing technical difficulties. Please try again in a moment.");
  }
}

// Enhanced WhatsApp message sending with multiple formats
async function sendWhatsAppMessage(to: string, message: string) {
  if (!accessToken || !phoneNumberId) {
    console.error('❌ Missing WhatsApp credentials');
    return;
  }

  try {
    console.log(`📤 Sending text message to ${to} via phone number ID: ${phoneNumberId}`);
    
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ WhatsApp API error: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log('✅ WhatsApp message sent successfully');
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
  }
}

// Send WhatsApp media (images, QR codes)
async function sendWhatsAppMedia(to: string, mediaUrl: string, caption: string = '') {
  if (!accessToken || !phoneNumberId) {
    console.error('❌ Missing WhatsApp credentials for media');
    return;
  }

  try {
    console.log(`📸 Sending media to ${to}: ${mediaUrl}`);
    
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'image',
        image: {
          link: mediaUrl,
          caption: caption
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ WhatsApp media API error: ${response.status} - ${errorText}`);
      // Fallback to text message
      await sendWhatsAppMessage(to, caption || 'Media content');
      return;
    }

    console.log('✅ WhatsApp media sent successfully');
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp media:', error);
    // Fallback to text message
    await sendWhatsAppMessage(to, caption || 'Media content');
  }
}

// Send WhatsApp interactive message with buttons
async function sendWhatsAppInteractive(to: string, text: string, buttons: any[]) {
  if (!accessToken || !phoneNumberId) {
    console.error('❌ Missing WhatsApp credentials for interactive');
    return;
  }

  try {
    console.log(`🔘 Sending interactive message to ${to} with ${buttons.length} buttons`);
    
    const interactiveButtons = buttons.slice(0, 3).map((button, index) => ({
      type: 'reply',
      reply: {
        id: button.id || `btn_${index}`,
        title: button.title || button.text || button.label || `Option ${index + 1}`
      }
    }));

    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: text },
          action: {
            buttons: interactiveButtons
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ WhatsApp interactive API error: ${response.status} - ${errorText}`);
      // Fallback to text message
      await sendWhatsAppMessage(to, text);
      return;
    }

    console.log('✅ WhatsApp interactive message sent successfully');
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp interactive message:', error);
    // Fallback to text message
    await sendWhatsAppMessage(to, text);
  }
}

// Helper functions for user session management
async function checkNewUser(supabase: any, phone: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('phone_number')
      .eq('phone_number', phone)
      .single();
      
    return !data; // New user if no existing contact
  } catch (error) {
    console.log(`🆕 Treating ${phone} as new user due to query error`);
    return true;
  }
}

async function checkSessionExpired(supabase: any, phone: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('last_interaction')
      .eq('phone_number', phone)
      .single();
      
    if (!data?.last_interaction) return true;
    
    const lastInteraction = new Date(data.last_interaction);
    const now = new Date();
    const hoursSinceLastInteraction = (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceLastInteraction > 24; // 24-hour session timeout
  } catch (error) {
    console.log(`⏰ Treating ${phone} as expired session due to query error`);
    return true;
  }
}

// Quick reply routing function
async function routeQuickReply(supabase: any, phone: string, payload: string, contactName: string) {
  console.log(`🎯 Routing quick reply: ${payload} for ${phone}`);
  
  try {
    // Get button domain for stage advancement
    const { data: buttonRow } = await supabase
      .from('action_buttons')
      .select('domain')
      .eq('payload', payload)
      .single();

    // Track button click analytics
    await supabase.functions.invoke('template-analytics-tracker', {
      body: {
        events: [{
          eventType: 'clicked',
          templateName: 'quick_reply_button',
          userId: phone,
          metadata: { 
            payload,
            buttonText: Object.keys(quickReplyMap).find(key => quickReplyMap[key] === payload) 
          }
        }]
      }
    });

    // Route to omni-agent-router with the payload
    const { data: response, error } = await supabase.functions.invoke('omni-agent-router', {
      body: { 
        message: payload,
        userId: phone,
        phone: phone,
        quickReply: true,
        context: {
          phone: phone,
          name: contactName,
          preferredLanguage: 'rw',
          userType: 'returning'
        }
      }
    });

    if (error) {
      console.error(`❌ Quick reply routing error:`, error);
      await sendWhatsAppMessage(phone, "🤖 I'm experiencing technical difficulties. Please try again in a moment.");
      return;
    }

    if (response?.success && response?.response) {
      let finalMessage = response.response.message || response.response;
      
      // Handle media responses
      if (response.response.response_type === 'media' && response.response.media_url) {
        finalMessage = response.response.message || 'Here is your requested content:';
        console.log(`📷 Media response for quick reply: ${response.response.media_url}`);
        // TODO: Implement media sending via WhatsApp API
      }

      const truncatedResponse = finalMessage.length > 1000 
        ? finalMessage.substring(0, 1000) + '...' 
        : finalMessage;

      await sendWhatsAppMessage(phone, truncatedResponse);
      console.log(`✅ Quick reply response sent: ${payload} -> ${truncatedResponse.substring(0, 50)}...`);
      
      // **ADVANCE STAGE AFTER BUTTON TAP**
      if (buttonRow?.domain) {
        await setState(phone, { stage: buttonRow.domain });
        console.log(`📈 Advanced stage to: ${buttonRow.domain}`);
      }
      
      // Track conversion if this completes a flow
      if (['PAY_QR', 'PAX_REQUEST', 'DRV_GO_ONLINE'].includes(payload)) {
        await supabase.functions.invoke('template-analytics-tracker', {
          body: {
            events: [{
              eventType: 'converted',
              templateName: 'quick_reply_conversion',
              userId: phone,
              metadata: { payload, action: 'flow_completed' }
            }]
          }
        });
      }
    } else {
      console.error(`❌ Invalid quick reply response:`, response);
      await sendWhatsAppMessage(phone, "🤖 I'm experiencing technical difficulties. Please try again in a moment.");
    }
    
  } catch (error) {
    console.error(`❌ Error routing quick reply:`, error);
    await sendWhatsAppMessage(phone, "🤖 I'm experiencing technical difficulties. Please try again in a moment.");
  }
}

// Intelligent template selection
async function getIntelligentTemplate(supabase: any, message: string, userId: string, sessionExpired: boolean) {
  try {
    const { data: templateDecision } = await supabase.functions.invoke('intelligent-template-router', {
      body: {
        message,
        userId,
        sessionExpired,
        context: {
          phone: userId,
          preferredLanguage: 'en'
        }
      }
    });

    if (templateDecision?.success) {
      return {
        templateName: templateDecision.templateName,
        confidence: templateDecision.confidence,
        reasoning: templateDecision.reasoning
      };
    }
  } catch (error) {
    console.error('Error getting intelligent template:', error);
  }

  // Fallback to welcome template
  return {
    templateName: TPL.WELCOME,
    confidence: 0.5,
    reasoning: 'Fallback to welcome template'
  };
}