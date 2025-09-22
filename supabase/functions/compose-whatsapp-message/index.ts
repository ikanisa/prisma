import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppButton {
  type: 'reply' | 'quick_reply' | 'url';
  title?: string;
  text?: string;
  payload?: string;
  url?: string;
  reply?: {
    id: string;
    title: string;
  };
}

interface ComposeRequest {
  mode: 'text' | 'interactive' | 'template' | 'image';
  recipient: string;
  template?: string;
  content?: any;
  amount?: number;
  body_text?: string;
  button_options?: WhatsAppButton[];
  template_name?: string;
  template_params?: Record<string, string>;
  image_url?: string;
  header_text?: string;
  footer_text?: string;
}

serve(withErrorHandling(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: ComposeRequest = await req.json();
    const { mode, recipient, template, content, amount, body_text, button_options, template_name, template_params, image_url, header_text, footer_text } = request;
    const to = recipient || request.to;
    
    console.log('🔧 Composing WhatsApp message:', { mode, to, template });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    let payload: any;
    
    if (mode === 'template' && template) {
      // Get template from database
      const { data: templateData, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('template_name', template)
        .single();
        
      if (error || !templateData) {
        console.warn(`Template ${template} not found, using fallback`);
        // Fallback to text message
        payload = {
          messaging_product: "whatsapp",
          to: to.replace(/\D/g, ''),
          type: "text",
          text: {
            body: content?.text || body_text || "Hello from easyMO!"
          }
        };
      } else {
        let messageText = templateData.template_content;
        
        // Replace variables in template
        if (template === 'pay_offer_v1' && amount) {
          messageText = messageText.replace('{{1}}', amount.toString());
        }
        if (template === 'summary_confirm_v1' && content?.details_summary) {
          messageText = messageText.replace('{{1}}', content.details_summary);
        }
        
        if (templateData.buttons && templateData.buttons.length > 0) {
          payload = {
            messaging_product: "whatsapp",
            to: to.replace(/\D/g, ''),
            type: "interactive",
            interactive: {
              type: "button",
              body: {
                text: messageText
              },
              action: {
                buttons: templateData.buttons.slice(0, 3).map((btn: any) => ({
                  type: "reply",
                  reply: {
                    id: btn.payload,
                    title: btn.text.substring(0, 20) // WhatsApp button title limit
                  }
                }))
              }
            }
          };
        } else {
          payload = {
            messaging_product: "whatsapp", 
            to: to.replace(/\D/g, ''),
            type: "text",
            text: {
              body: messageText
            }
          };
        }
      }
    } else if (mode === 'interactive' && (content || button_options)) {
      payload = {
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ''),
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: body_text || content?.text || "Choose an option:"
          }
        }
      };

      if (header_text) {
        payload.interactive.header = {
          type: "text",
          text: header_text
        };
      }

      if (footer_text) {
        payload.interactive.footer = {
          text: footer_text
        };
      }

      if (button_options && button_options.length > 0) {
        payload.interactive.action = {
          buttons: button_options.slice(0, 3).map((btn, idx) => ({
            type: "reply",
            reply: {
              id: btn.payload || btn.reply?.id || `btn_${idx}`,
              title: btn.title || btn.text || btn.reply?.title || `Option ${idx + 1}`
            }
          }))
        };
      }
    } else if (mode === 'image') {
      payload = {
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ''),
        type: "image",
        image: {
          link: image_url
        }
      };
      
      if (body_text) {
        payload.image.caption = body_text;
      }
    } else {
      // Default text message
      payload = {
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ''),
        type: "text",
        text: {
          body: content?.text || body_text || "Hello from easyMO!"
        }
      };
    }

    // Log the outgoing message to the outbound_queue table
    const messageLogData = {
      recipient_phone: to,
      message_type: mode,
      message_payload: payload,
      template_name: template_name || null,
      status: 'composed',
      metadata: {
        composed_at: new Date().toISOString(),
        button_count: button_options?.length || 0,
        has_template_params: !!(template_params && Object.keys(template_params).length > 0)
      }
    };

    const { error: logError } = await supabase
      .from('outbound_queue')
      .insert([messageLogData]);

    if (logError) {
      console.warn('Failed to log message to outbound_queue:', logError.message);
    }

    console.log('WhatsApp message composed successfully:', {
      type: payload.type,
      to: payload.to,
      hasButtons: !!(button_options && button_options.length > 0)
    });

    return new Response(JSON.stringify({
      success: true,
      payload,
      message_type: mode,
      button_count: button_options?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compose-whatsapp-message function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});