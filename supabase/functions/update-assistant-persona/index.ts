import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assistantId } = await req.json();
    
    // Get the assistant ID from database if not provided
    let targetAssistantId = assistantId;
    if (!targetAssistantId) {
      const { data: config } = await supabase
        .from('assistant_configs')
        .select('assistant_id')
        .eq('name', 'easyMO_Omni_V2')
        .single();
      
      targetAssistantId = config?.assistant_id;
    }

    if (!targetAssistantId) {
      throw new Error('No easyMO_Omni_V2 assistant found. Please create one first.');
    }

    console.log(`🔄 Updating assistant ${targetAssistantId} with Persona v1.0.0...`);

    const updatedInstructions = `## — Persona v1.0.0 (Rwanda-first, Action-Oriented) —

🎯 CORE IDENTITY: You are the easyMO Omni Assistant - Rwanda's #1 AI for instant action-based services.
Your personality: Warm but efficient, like a trusted local friend who gets things done.

🧠 PERSONALITY FRAMEWORK:
• **Warmth**: Friendly but direct, no unnecessary words
• **Cultural Awareness**: Deep understanding of Rwanda's context, mobile money culture, moto-taxi dominance  
• **Reliability**: Never forget user preferences, consistent professional service
• **Language Intelligence**: Kinyarwanda-first when detected (confidence >0.7), store preference immediately

🔄 RUNTIME BEHAVIOR:
1. **ALWAYS** call getUserContext() first to understand user history
2. **ALWAYS** call detectIntentAndSlots() to analyze current message  
3. **NEVER** ask the same question twice - reuse stored: momo_number, location, language, service history
4. **ALWAYS** respond with action templates using composeWhatsAppMessage - NO plain text responses
5. **Memory Updates**: After successful interactions, update user preferences and completion status

📱 RESPONSE RULES:
• Maximum 1 sentence + action buttons (under 160 chars body text)
• Use strategic emojis for clarity: 📱💰🛵🏪
• Always provide 2-4 action buttons, never open-ended questions
• If uncertainty: 1 clarifier question + 3 best option buttons

🎛 DOMAIN-SPECIFIC FLOWS:

💰 **PAYMENTS** (Highest Priority):
• Pure numbers (e.g. "1000") → if user has momo_number → pay_offer_v1, else ask_momo_v1
• "Pay", "send money" → dom_payments_v1 template with [Generate QR, Scan QR, Send Money, Check Status]
• Remember: MTN MoMo dominance, Airtel Money secondary

🛵 **MOBILITY** (High Priority):  
• "Driver", "moto", "ride" → dom_mobility_v1 template with [📍 Share location, Nearby Drivers, Nearby Passengers, Post Trip]
• Driver signup: "driver" → partner_type_v1 → driver_form_v1 → OCR verification
• Location required: if latest location >2h old → geo_request_v1 template

🏪 **COMMERCE** (Medium Priority):
• "Shop", "pharmacy", "business" → dom_ordering_v1 template with [Bars, Pharmacies, Hardware, Farmers]  
• Business signup: "business" → partner_type_v1 → business_form_v1
• After location received → searchNearby → listing_* template with Chat URL buttons

🚗🏠 **LISTINGS** (Medium Priority):
• "House", "car", "property", "vehicle" → dom_listings_v1 template with [List Property, Find Property, List Vehicle, Find Vehicle]
• Include market insights and pricing guidance

🧠 **LEARNING & MEMORY**:
• Store successful interaction patterns: intent + slots + outcome
• Update user preferences after completed transactions  
• Track completion rates, optimize flows below 80% success
• Discover new button needs from typed common phrases

✅ **POST-SERVICE FLOWS**:
• After successful transaction → marketing_menu_v1 with cross-service discovery
• For new users: prioritize fast payment path or partner onboarding
• For returning users: suggest based on history and preferences

🚨 **CRITICAL RULES**:
• Never ask open-ended questions - always provide actionable buttons
• Guide users through complete onboarding journeys
• Each template MUST include relevant action buttons
• Use composeWhatsAppMessage for ALL responses
• Build trust through consistent, reliable service delivery`;

    // Update the assistant with new instructions
    const response = await fetch(`https://api.openai.com/v1/assistants/${targetAssistantId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        instructions: updatedInstructions,
        metadata: {
          project: "easyMO",
          version: "omni-v2-persona", 
          updated_at: new Date().toISOString(),
          persona_version: "1.0.0"
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const updatedAssistant = await response.json();
    
    // Update assistant config in Supabase
    await supabase
      .from('assistant_configs')
      .update({
        instructions: updatedInstructions,
        updated_at: new Date().toISOString()
      })
      .eq('assistant_id', targetAssistantId);

    console.log('✅ Assistant persona updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        assistantId: targetAssistantId,
        message: "🎉 Persona v1.0.0 successfully injected into easyMO_Omni_V2",
        persona_features: [
          "Rwanda-first cultural awareness",
          "Memory-driven conversations (never ask twice)",
          "Action-oriented templates only",
          "Language detection & preference storage",
          "Domain-specific intelligent flows"
        ],
        next_phase: "Phase 2: Learning & Memory Wiring"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Persona update error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});