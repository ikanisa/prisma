import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateRequiredEnvVars, OpenAIEnv, SupabaseEnv } from '../_shared/env.ts';
import { logger } from '../_shared/logger.ts';

// Validate environment variables at startup
const envValidation = validateRequiredEnvVars();
if (!envValidation.isValid) {
  throw new Error(`Missing required environment variables: ${envValidation.missing.join(', ')}`);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, phone, contactName } = await req.json();
    
    console.log(`🧠 Processing intelligent WhatsApp message from ${phone}: ${message?.substring(0, 100)}...`);
    
    
    // Analyze user intent with OpenAI
    const intentAnalysis = await analyzeUserIntent(message, phone);
    console.log(`🎯 Intent analysis:`, intentAnalysis);
    
    // Execute appropriate action based on intent
    const response = await executeIntentAction(supabase, intentAnalysis, message, phone, contactName);
    
    console.log(`✅ Generated intelligent response for ${phone}`);
    
    return new Response(JSON.stringify({
      success: true,
      intent: intentAnalysis,
      response
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Intelligent WhatsApp processor error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      fallback_response: "🤖 I'm experiencing technical difficulties. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function analyzeUserIntent(message: string, phone: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OpenAIEnv.getApiKey()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [{
          role: 'system',
          content: `You are an intelligent intent classifier for easyMO, Rwanda's WhatsApp super-app.

RWANDA CONTEXT:
- Currency: Rwandan Francs (RWF)
- Mobile money: MTN MoMo, Airtel Money (dominant payment methods)
- Transport: Motos are primary urban transport
- Language: Users mix Kinyarwanda, English, French
- Location: East Africa, hilly terrain, tech-forward economy

CORE CAPABILITIES:
🏦 PAYMENTS: Generate QR codes, send money, receive payments, view history
🏍️ TRANSPORT: Book rides, go online as driver, find nearby drivers
🏪 BUSINESSES: Find nearby pharmacies, bars, restaurants, hardware stores (1800+ in database)
🛒 COMMERCE: Order from businesses, browse products, place orders
🏠 LISTINGS: Property rentals, vehicle sales, marketplace items
❓ SUPPORT: Help, human handoff, technical issues

INTELLIGENT ACTIONS REQUIRED:
- For location requests (pharmacy, bars, hardware): Must request user location first
- For payment requests: Extract amount, generate QR with user's phone as MoMo number
- For business searches: Use location-based search with user coordinates
- For ride requests: Request pickup/destination locations

RESPONSE FORMAT (JSON only):
{
  "intent": "payment_generate_qr|business_search|ride_request|general_help|...",
  "domain": "payments|transport|commerce|support|...",
  "confidence": 0.0-1.0,
  "entities": {
    "amount": number,
    "business_type": "pharmacy|bar|hardware|restaurant",
    "location_needed": boolean,
    "action_required": "request_location|generate_qr|search_businesses|..."
  },
  "requires_location": boolean
}`
        }, {
          role: 'user',
          content: `User message: "${message}"`
        }],
        temperature: 0.1,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
    
  } catch (error) {
    console.error('Intent analysis failed:', error);
    return {
      intent: 'general_help',
      domain: 'support',
      confidence: 0.3,
      entities: {},
      requires_location: false
    };
  }
}

async function executeIntentAction(supabase: any, intent: any, message: string, phone: string, contactName: string) {
  switch (intent.intent) {
    case 'payment_generate_qr':
      return await handlePaymentQR(supabase, intent, message, phone);
    
    case 'business_search':
      return await handleBusinessSearch(supabase, intent, message, phone);
    
    case 'ride_request':
      return await handleRideRequest(supabase, intent, message, phone);
    
    case 'location_share':
      return await handleLocationShare(supabase, intent, message, phone);
    
    default:
      return await generateIntelligentResponse(message, phone, intent);
  }
}

async function handlePaymentQR(supabase: any, intent: any, message: string, phone: string) {
  try {
    const amount = intent.entities?.amount || extractAmount(message);
    
    if (!amount) {
      return {
        type: 'text',
        message: '💰 To generate a payment QR code, please tell me the amount.\n\nExample: "Get paid 5000 RWF" or "Generate QR for 2000"'
      };
    }
    
    // Generate USSD code for Rwanda MoMo
    const ussdCode = `*182*1*2*${phone}*${amount}#`;
    
    // Call QR payment generator service
    const { data: qrResponse } = await supabase.functions.invoke('qr-payment-generator', {
      body: { 
        amount: amount,
        user_phone: phone,
        currency: 'RWF',
        description: 'Payment via easyMO',
        transaction_type: 'request'
      }
    });
    
    if (qrResponse?.qr_code_svg) {
      return {
        type: 'media',
        media_url: `data:image/svg+xml;base64,${btoa(qrResponse.qr_code_svg)}`,
        message: `🎯 Your payment QR is ready!\n\n💰 Amount: ${amount} RWF\n📱 Show this to the payer\n\n⚡ Payment will be instant!\n\n📱 USSD: ${ussdCode}`
      };
    } else {
      return {
        type: 'text',
        message: `💰 Payment details ready!\n\nAmount: ${amount} RWF\n📱 USSD Code: ${ussdCode}\n\nShare this USSD code with the payer to complete the transaction.`
      };
    }
    
  } catch (error) {
    console.error('Payment QR generation error:', error);
    return {
      type: 'text',
      message: '❌ Sorry, I couldn\'t generate your payment QR. Please try again.'
    };
  }
}

async function handleBusinessSearch(supabase: any, intent: any, message: string, phone: string) {
  try {
    const businessType = intent.entities?.business_type || 'business';
    
    // Check if user has shared location
    const { data: userLocation } = await supabase
      .from('user_locations')
      .select('lat, lng')
      .eq('user_id', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!userLocation) {
      return {
        type: 'text',
        message: `📍 To find nearby ${businessType}s, I need your location.\n\nPlease tap the 📎 button below and select "Location" to share your current location. This will help me find the closest ${businessType}s to you.`,
        buttons: [{
          type: 'quick_reply',
          reply: {
            id: 'share_location',
            title: '📍 Share Location'
          }
        }]
      };
    }
    
    // Search for nearby businesses
    const { data: searchResults } = await supabase.functions.invoke('search-nearby', {
      body: {
        waId: phone,
        domain: businessType,
        radiusKm: 5
      }
    });
    
    if (searchResults?.results?.length > 0) {
      const businesses = searchResults.results.slice(0, 5);
      let responseText = `🏪 Found ${businesses.length} nearby ${businessType}s:\n\n`;
      
      businesses.forEach((business: any, index: number) => {
        responseText += `${index + 1}. **${business.name}**\n`;
        responseText += `   📍 ${business.distance}km away\n`;
        if (business.address) responseText += `   📧 ${business.address}\n`;
        if (business.wa_number) responseText += `   📱 ${business.wa_number}\n`;
        responseText += '\n';
      });
      
      return {
        type: 'text',
        message: responseText
      };
    } else {
      return {
        type: 'text',
        message: `😔 No ${businessType}s found within 5km of your location. Try expanding your search area or check if your location is accurate.`
      };
    }
    
  } catch (error) {
    console.error('Business search error:', error);
    return {
      type: 'text',
      message: `❌ Sorry, I couldn't search for ${intent.entities?.business_type || 'businesses'} right now. Please try again.`
    };
  }
}

async function handleRideRequest(supabase: any, intent: any, message: string, phone: string) {
  return {
    type: 'text',
    message: '🚗 To book a ride, I need your pickup location.\n\nPlease tap the 📎 button and select "Location" to share where you want to be picked up from.'
  };
}

async function handleLocationShare(supabase: any, intent: any, message: string, phone: string) {
  return {
    type: 'text',
    message: '📍 Thank you for sharing your location! Now I can help you find nearby businesses and services.\n\nWhat would you like to find?\n• Pharmacy\n• Restaurant\n• Hardware store\n• Bar\n• Or something else?'
  };
}

async function generateIntelligentResponse(message: string, phone: string, intent: any) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OpenAIEnv.getApiKey()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [{
          role: 'system',
          content: `You are easyMO's helpful AI assistant for Rwanda. 

PERSONALITY: Friendly, efficient, Rwanda-focused
RESPONSE STYLE: Keep responses SHORT (1-2 sentences max), actionable

CORE SERVICES:
💰 Payments - Generate QR codes for MoMo payments
🏍️ Transport - Book moto rides, find drivers  
🏪 Businesses - Find pharmacies, bars, hardware stores (1800+ locations)
🛒 Commerce - Order from local businesses
🏠 Listings - Property & vehicle marketplace

CRITICAL: 
- For location requests, ask user to share location first
- For payments, extract amount and generate QR/USSD codes
- Always provide specific next steps
- Use Rwandan context (RWF currency, MoMo payments, motos)`
        }, {
          role: 'user',
          content: `User intent: ${intent.intent} (confidence: ${intent.confidence})
User message: "${message}"`
        }],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    const data = await response.json();
    return {
      type: 'text',
      message: data.choices[0].message.content
    };
    
  } catch (error) {
    console.error('Response generation error:', error);
    return {
      type: 'text',
      message: '👋 Hi! I\'m easyMO\'s AI assistant. I can help you with payments, finding businesses, booking rides, and more. What do you need help with?'
    };
  }
}

function extractAmount(message: string): number | null {
  const patterns = [
    /(\d{1,3}(?:,\d{3})*)\s*(?:rwf|frw|francs?)/i,
    /(?:rwf|frw|francs?)\s*(\d{1,3}(?:,\d{3})*)/i,
    /(\d{1,3}(?:,\d{3})*)/
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const amount = parseInt(match[1].replace(/,/g, ''));
      if (amount > 0 && amount <= 10000000) {
        return amount;
      }
    }
  }
  
  return null;
}