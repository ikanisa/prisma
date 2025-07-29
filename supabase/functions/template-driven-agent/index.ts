import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Comprehensive template system
const MESSAGE_TEMPLATES = {
  // Onboarding & Welcome
  onboarding: {
    welcome_new_user: {
      text: "🎉 Welcome to easyMO! Your WhatsApp super-app for payments, rides, shopping & more.\n\n✨ What can I help you with today?",
      quick_actions: ["💳 Generate QR", "🚖 Book Ride", "🛍️ Browse Products", "📍 Find Business"]
    },
    setup_profile: {
      text: "Let's set up your profile! 👤\n\nPlease share:\n• Your name\n• Preferred language (English/Kinyarwanda)\n• Location",
      quick_actions: ["🏠 Kigali", "🌍 Other Location", "🇬🇧 English", "🇷🇼 Kinyarwanda"]
    }
  },

  // Payment Services
  payments: {
    generate_qr: {
      text: "💳 Generate QR Payment Code\n\nHow much do you want to receive?",
      quick_actions: ["1000 RWF", "5000 RWF", "10000 RWF", "💰 Custom Amount"]
    },
    payment_success: {
      text: "✅ Payment Successful!\n\nAmount: {amount} RWF\nRef: {reference}\nTime: {timestamp}",
      quick_actions: ["📄 Receipt", "🔄 Another Payment", "💰 Check Balance"]
    },
    payment_failed: {
      text: "❌ Payment Failed\n\nReason: {reason}\n\nWould you like to try again?",
      quick_actions: ["🔄 Retry Payment", "💳 Different Method", "🎧 Get Help"]
    }
  },

  // Transportation
  transport: {
    book_ride: {
      text: "🚖 Book Your Ride\n\nWhere are you going?",
      quick_actions: ["📍 Use My Location", "🏢 Airport", "🏥 Hospital", "🏪 Market"]
    },
    ride_confirmed: {
      text: "✅ Ride Confirmed!\n\nDriver: {driver_name}\nCar: {car_model} - {plate}\nETA: {eta} minutes\n\nTrack: {tracking_link}",
      quick_actions: ["📞 Call Driver", "📍 Share Location", "❌ Cancel Ride"]
    },
    driver_arrived: {
      text: "🚗 Your driver has arrived!\n\nDriver: {driver_name}\nCar: {car_details}\nLocation: {pickup_location}",
      quick_actions: ["👋 I'm Coming", "📞 Call Driver", "⏰ 2 More Minutes"]
    }
  },

  // Business Discovery
  business: {
    find_nearby: {
      text: "🔍 Find Businesses Near You\n\nWhat are you looking for?",
      quick_actions: ["🍕 Restaurants", "🏥 Healthcare", "🛒 Shopping", "⛽ Gas Stations"]
    },
    business_details: {
      text: "📍 {business_name}\n\n⭐ {rating}/5 ({reviews} reviews)\n📍 {address}\n📞 {phone}\n🕒 {hours}\n\n{description}",
      quick_actions: ["📞 Call Now", "🧭 Get Directions", "⭐ Rate & Review", "📤 Share"]
    }
  },

  // Marketplace
  marketplace: {
    browse_products: {
      text: "🛒 Browse Products\n\nWhat are you shopping for today?",
      quick_actions: ["🥕 Fresh Produce", "🏠 Household Items", "👔 Fashion", "📱 Electronics"]
    },
    product_details: {
      text: "🛍️ {product_name}\n\n💰 {price} RWF\n📦 Available: {stock} units\n🏪 Seller: {seller_name}\n⭐ {rating}/5\n\n{description}",
      quick_actions: ["🛒 Add to Cart", "❤️ Save for Later", "📞 Contact Seller", "🔄 Similar Items"]
    },
    order_confirmed: {
      text: "✅ Order Confirmed!\n\nOrder #{order_id}\nTotal: {total} RWF\nDelivery: {delivery_time}\n\nTrack your order: {tracking_link}",
      quick_actions: ["📦 Track Order", "📄 Order Details", "🛒 Order Again"]
    }
  },

  // Support & Help
  support: {
    main_menu: {
      text: "🎧 How can I help you?\n\nChoose your issue category:",
      quick_actions: ["💳 Payment Issues", "🚖 Ride Problems", "🛒 Order Support", "🔧 Technical Help"]
    },
    escalate_human: {
      text: "🤝 Connecting you to a human agent...\n\nEstimated wait time: {wait_time} minutes\n\nTicket: #{ticket_id}",
      quick_actions: ["⏰ Get Update", "📝 Add Details", "❌ Cancel Request"]
    }
  },

  // Quick Services Menu
  quick_services: {
    main_menu: {
      type: "interactive",
      interactive: {
        type: "list",
        header: { type: "text", text: "🚀 Quick Services" },
        body: { text: "Choose from our available services:" },
        footer: { text: "Select to get started" },
        action: {
          button: "View Services",
          sections: [
            {
              title: "💰 Financial Services",
              rows: [
                { id: "generate_qr", title: "💳 Generate QR Payment", description: "Create QR code for receiving money" },
                { id: "check_balance", title: "💰 Check Balance", description: "View your account balance" },
                { id: "send_money", title: "📤 Send Money", description: "Transfer money to contacts" }
              ]
            },
            {
              title: "🚗 Transportation",
              rows: [
                { id: "book_ride", title: "🚖 Book Ride", description: "Request a ride to your destination" },
                { id: "driver_status", title: "🚙 Driver Status", description: "Check driver availability" },
                { id: "ride_history", title: "📊 Ride History", description: "View your past trips" }
              ]
            },
            {
              title: "🛒 Marketplace",
              rows: [
                { id: "browse_products", title: "🛍️ Browse Products", description: "View available products" },
                { id: "my_orders", title: "📦 My Orders", description: "Check your order status" },
                { id: "add_to_cart", title: "🛒 Shopping Cart", description: "View items in cart" }
              ]
            },
            {
              title: "🏢 Business Services",
              rows: [
                { id: "find_business", title: "🔍 Find Business", description: "Discover nearby businesses" },
                { id: "business_hours", title: "🕒 Business Hours", description: "Check opening hours" },
                { id: "make_reservation", title: "📅 Make Reservation", description: "Book appointments" }
              ]
            }
          ]
        }
      }
    }
  }
};

// Intent classification with template mapping
async function classifyIntentAndGetTemplate(message: string, userContext: any) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: `You are an intent classifier for easyMO. Analyze the user message and return the most appropriate template category and action.

Available templates:
- onboarding: welcome_new_user, setup_profile
- payments: generate_qr, payment_success, payment_failed
- transport: book_ride, ride_confirmed, driver_arrived
- business: find_nearby, business_details
- marketplace: browse_products, product_details, order_confirmed
- support: main_menu, escalate_human
- quick_services: main_menu

User context: ${JSON.stringify(userContext)}

Return JSON: {"category": "template_category", "action": "template_action", "confidence": 0.9, "parameters": {}, "use_template": true}`
        },
        {
          role: 'user',
          content: message
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// Get user context for personalization
async function getUserContext(phoneNumber: string) {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    const { data: recentOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_phone', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentRides } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('passenger_phone', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(3);

    return {
      profile: profile || null,
      recentOrders: recentOrders || [],
      recentRides: recentRides || [],
      isNewUser: !profile,
      preferredLanguage: profile?.preferred_language || 'en'
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return { isNewUser: true, preferredLanguage: 'en' };
  }
}

// Apply template with dynamic content
function applyTemplate(template: any, parameters: any = {}) {
  if (typeof template === 'string') {
    return template.replace(/\{(\w+)\}/g, (match, key) => parameters[key] || match);
  }
  
  return template;
}

// Send template-based response
async function sendTemplateResponse(phoneNumber: string, template: any, parameters: any = {}) {
  const processedTemplate = applyTemplate(template, parameters);
  
  try {
    await supabase.functions.invoke('send_whatsapp_message_secure', {
      body: {
        to: phoneNumber,
        payload: processedTemplate.type === 'interactive' ? processedTemplate : undefined,
        body: processedTemplate.type !== 'interactive' ? processedTemplate.text || processedTemplate : undefined,
        message_id: `template_${Date.now()}`,
        tool_name: 'template_agent'
      }
    });

    console.log('✅ Template message sent successfully');
  } catch (error) {
    console.error('❌ Failed to send template message:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, message, message_id, platform = 'whatsapp' } = await req.json();

    if (!phone_number || !message) {
      return new Response(
        JSON.stringify({ error: 'phone_number and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎯 Template-driven agent processing: ${phone_number} - ${message}`);

    // Get user context
    const userContext = await getUserContext(phone_number);
    
    // Classify intent and get appropriate template
    const classification = await classifyIntentAndGetTemplate(message, userContext);
    
    console.log('🧠 Intent classification:', classification);

    if (classification.use_template && classification.category && classification.action) {
      const template = MESSAGE_TEMPLATES[classification.category]?.[classification.action];
      
      if (template) {
        console.log('📋 Using template:', classification.category, classification.action);
        
        // Send template-based response
        await sendTemplateResponse(phone_number, template, classification.parameters);
        
        // Log the interaction
        await supabase.from('conversation_messages').insert({
          conversation_id: `whatsapp_${phone_number}`,
          sender: 'agent',
          content: template.text || 'Interactive template sent',
          message_type: template.type || 'text',
          metadata: {
            template_used: `${classification.category}.${classification.action}`,
            confidence: classification.confidence,
            parameters: classification.parameters
          }
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            template_used: `${classification.category}.${classification.action}`,
            confidence: classification.confidence
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback to AI-generated response if no template found
    console.log('🤖 No suitable template found, generating AI response...');
    
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are easyMO's WhatsApp AI assistant. Keep responses concise and helpful. Always suggest relevant quick actions.

User context: ${JSON.stringify(userContext)}

Available services: Payments, Transportation, Marketplace, Business Discovery, Support.

End responses with relevant quick action suggestions.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    const aiData = await aiResponse.json();
    const responseText = aiData.choices[0].message.content;

    // Send AI-generated response
    await supabase.functions.invoke('send_whatsapp_message_secure', {
      body: {
        to: phone_number,
        body: responseText,
        message_id: message_id || `ai_${Date.now()}`,
        tool_name: 'ai_fallback'
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        response_type: 'ai_generated',
        template_used: false
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Template-driven agent error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});