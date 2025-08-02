import { supabaseClient } from "./client.ts";

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, message, images, user_context } = await req.json();
    
    console.log(`🏠 Property Agent processing message from ${phone_number}: "${message}"`);

    // Determine intent
    const intent = await analyzePropertyIntent(message, user_context);
    console.log(`📋 Detected intent: ${intent.action}`);

    let response;
    switch (intent.action) {
      case 'list_property':
        response = await handlePropertyListing(phone_number, message, images, intent.data);
        break;
      case 'search_properties':
        response = await handlePropertySearch(phone_number, message, intent.data);
        break;
      case 'property_details':
        response = await handlePropertyDetails(phone_number, intent.data.property_id);
        break;
      case 'contact_landlord':
        response = await handleContactLandlord(phone_number, intent.data.property_id, message);
        break;
      case 'rent_buy_process':
        response = await handlePropertyTransaction(phone_number, intent.data);
        break;
      case 'schedule_viewing':
        response = await handleScheduleViewing(phone_number, intent.data);
        break;
      default:
        response = await handleGeneralPropertyQuery(phone_number, message);
    }

    // Send WhatsApp response
    if (response.message) {
      await sendWhatsAppMessage(phone_number, response.message);
    }

    // Handle follow-up actions
    if (response.actions) {
      for (const action of response.actions) {
        await handlePropertyAction(phone_number, action);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      intent: intent.action,
      response: response.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Property Agent error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function analyzePropertyIntent(message: string, context: any) {
  if (!openAIApiKey) {
    return { action: 'general_query', data: {} };
  }

  const prompt = `Analyze this property-related message and determine the user's intent:

Message: "${message}"
User Context: ${JSON.stringify(context)}

Determine the action from these options:
- list_property: User wants to list their property for sale/rent
- search_properties: User is looking for properties to buy/rent
- property_details: User wants details about a specific property
- contact_landlord: User wants to contact a property owner
- rent_buy_process: User wants to proceed with renting/buying
- schedule_viewing: User wants to schedule a property viewing
- general_query: General question about properties

Extract relevant data like property type, location, price range, bedrooms, etc.

Respond with JSON: {"action": "intent", "data": {extracted_data}}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Intent analysis error:', error);
    return { action: 'general_query', data: {} };
  }
}

async function handlePropertyListing(phone: string, message: string, images: any[], intentData: any) {
  console.log('🏠 Processing property listing request');

  // Start guided listing process
  const { data: existingSession } = await supabase
    .from('conversation_flows')
    .select('*')
    .eq('phone_number', phone)
    .eq('flow_name', 'property_listing')
    .eq('status', 'active')
    .single();

  if (!existingSession) {
    // Start new listing session
    await supabase
      .from('conversation_flows')
      .insert({
        phone_number: phone,
        flow_name: 'property_listing',
        current_step: 'property_type',
        flow_data: { intent_data: intentData },
        status: 'active'
      });

    return {
      message: "🏠 Great! I'll help you list your property. Let's start:\n\n" +
               "What type of property are you listing?\n" +
               "• House\n• Apartment\n• Room\n• Land/Plot\n• Commercial space\n• Other\n\n" +
               "Just tell me the type!"
    };
  }

  // Continue existing session
  return await continuePropertyListingFlow(phone, message, images, existingSession);
}

async function continuePropertyListingFlow(phone: string, message: string, images: any[], session: any) {
  const currentStep = session.current_step;
  const flowData = session.flow_data || {};

  let nextStep = '';
  let responseMessage = '';
  let actions = [];

  switch (currentStep) {
    case 'property_type':
      flowData.property_type = message.toLowerCase();
      nextStep = 'location';
      responseMessage = "Perfect! Where is your property located?\n\nPlease provide:\n• District/City\n• Sector/Neighborhood\n• Nearby landmarks\n\nExample: 'Kimisagara, Nyarugenge, near KBC'";
      break;

    case 'location':
      flowData.location = message;
      nextStep = 'action_type';
      responseMessage = "Great location! Are you looking to:\n• Rent\n• Sell\n• Both\n\nWhich option?";
      break;

    case 'action_type':
      flowData.action_type = message.toLowerCase();
      nextStep = 'bedrooms';
      responseMessage = "How many bedrooms does your property have?\n\nOptions:\n• Studio (0 bedrooms)\n• 1 bedroom\n• 2 bedrooms\n• 3+ bedrooms\n\nJust tell me the number!";
      break;

    case 'bedrooms':
      flowData.bedrooms = parseInt(message) || 0;
      nextStep = 'bathrooms';
      responseMessage = "How many bathrooms/toilets are there?\n\nExample: 1, 2, or 3";
      break;

    case 'bathrooms':
      flowData.bathrooms = parseInt(message) || 1;
      nextStep = 'furnished';
      responseMessage = "Is the property furnished?\n\n• Fully furnished\n• Partially furnished\n• Unfurnished\n\nWhich one?";
      break;

    case 'furnished':
      flowData.furnished = message.toLowerCase().includes('furnished');
      flowData.furnished_level = message.toLowerCase();
      nextStep = 'price';
      responseMessage = flowData.action_type.includes('rent') 
        ? "What's your monthly rent? (in RWF)\n\nExample: 150000"
        : "What's your selling price? (in RWF)\n\nExample: 45000000";
      break;

    case 'price':
      if (flowData.action_type.includes('rent')) {
        flowData.price_month = parseInt(message);
      } else {
        flowData.price_total = parseInt(message);
      }
      nextStep = 'images';
      responseMessage = "Perfect! Now please send me photos of your property:\n\n" +
                       "• Exterior/Front view\n• Living room\n• Bedrooms\n• Kitchen\n• Bathroom\n• Any special features\n\n" +
                       "Send at least 3-5 clear photos!";
      break;

    case 'images':
      if (images && images.length > 0) {
        flowData.images = [...(flowData.images || []), ...images];
        
        if (flowData.images.length >= 3) {
          nextStep = 'description';
          responseMessage = "Excellent photos! Now give me a description of your property:\n\n" +
                           "Include details like:\n• Condition (new, good, needs renovation)\n• Special features (garden, parking, security)\n• Utilities included\n• Any restrictions";
        } else {
          responseMessage = `Great! I have ${flowData.images.length} photos. Please send ${3 - flowData.images.length} more photos to complete your listing.`;
        }
      } else {
        responseMessage = "I didn't receive any images. Please send photos of your property to continue.";
      }
      break;

    case 'description':
      flowData.description = message;
      nextStep = 'contact_info';
      responseMessage = "Almost done! What's the best way for interested tenants/buyers to contact you?\n\n" +
                       "Your WhatsApp number will be included automatically. Any other contact preferences?";
      break;

    case 'contact_info':
      flowData.contact_info = message;
      nextStep = 'completed';
      
      // Create the property listing
      const propertyData = {
        owner_phone: phone,
        title: `${flowData.bedrooms} bedroom ${flowData.property_type} in ${flowData.location}`,
        description: flowData.description,
        action: flowData.action_type.includes('sell') ? 'sale' : 'rent',
        price_month: flowData.price_month || null,
        price_total: flowData.price_total || null,
        bedrooms: flowData.bedrooms,
        bathrooms: flowData.bathrooms,
        furnished: flowData.furnished,
        imgs: flowData.images || [],
        status: 'published',
        metadata: {
          property_type: flowData.property_type,
          contact_info: flowData.contact_info,
          location: flowData.location,
          furnished_level: flowData.furnished_level
        }
      };

      const { data: newProperty, error } = await supabase
        .from('tbl_properties')
        .insert(propertyData)
        .select()
        .single();

      if (error) {
        console.error('Property listing creation error:', error);
        responseMessage = "Sorry, there was an error creating your listing. Please try again.";
      } else {
        responseMessage = `🎉 Fantastic! Your property is now listed!\n\n` +
                         `🏠 **${newProperty.title}**\n` +
                         `💰 Price: ${flowData.action_type.includes('rent') ? flowData.price_month + ' RWF/month' : flowData.price_total + ' RWF'}\n` +
                         `📍 Location: ${flowData.location}\n` +
                         `🛏️ ${flowData.bedrooms} bed, ${flowData.bathrooms} bath\n\n` +
                         `Your listing is now live and potential tenants/buyers can contact you directly!\n\n` +
                         `I'll notify you when someone shows interest! 🏠✨`;
        
        actions = [{
          type: 'listing_created',
          property_id: newProperty.id
        }];
      }
      break;
  }

  // Update session
  await supabase
    .from('conversation_flows')
    .update({
      current_step: nextStep,
      flow_data: flowData,
      status: nextStep === 'completed' ? 'completed' : 'active',
      completed_at: nextStep === 'completed' ? new Date().toISOString() : null
    })
    .eq('id', session.id);

  return { message: responseMessage, actions };
}

async function handlePropertySearch(phone: string, message: string, intentData: any) {
  console.log('🔍 Processing property search request');

  // Extract search parameters
  const searchParams = {
    property_type: intentData.property_type || null,
    action: intentData.action || null, // rent or sale
    max_price: intentData.max_price || null,
    location: intentData.location || null,
    bedrooms: intentData.bedrooms || null,
    min_bedrooms: intentData.min_bedrooms || null,
    max_bedrooms: intentData.max_bedrooms || null
  };

  // Build query
  let query = supabase
    .from('tbl_properties')
    .select('*')
    .eq('status', 'published');

  if (searchParams.action) {
    query = query.eq('action', searchParams.action);
  }

  if (searchParams.bedrooms) {
    query = query.eq('bedrooms', searchParams.bedrooms);
  } else {
    if (searchParams.min_bedrooms) {
      query = query.gte('bedrooms', searchParams.min_bedrooms);
    }
    if (searchParams.max_bedrooms) {
      query = query.lte('bedrooms', searchParams.max_bedrooms);
    }
  }

  if (searchParams.max_price) {
    if (searchParams.action === 'rent') {
      query = query.lte('price_month', searchParams.max_price);
    } else {
      query = query.lte('price_total', searchParams.max_price);
    }
  }

  if (searchParams.location) {
    query = query.or(`title.ilike.%${searchParams.location}%,metadata->>location.ilike.%${searchParams.location}%`);
  }

  query = query.limit(5);

  const { data: properties, error } = await query;

  if (error) {
    console.error('Property search error:', error);
    return {
      message: "Sorry, I couldn't search for properties right now. Please try again."
    };
  }

  if (!properties || properties.length === 0) {
    return {
      message: "🔍 I couldn't find any properties matching your criteria. Try adjusting your search:\n\n" +
               "• Different price range\n• Different location\n• Different number of bedrooms\n• Different property type\n\n" +
               "Or ask me to search again with different criteria!"
    };
  }

  let responseMessage = `🏠 Found ${properties.length} properties for you:\n\n`;

  properties.forEach((property, index) => {
    const price = property.action === 'rent' 
      ? `${property.price_month} RWF/month`
      : `${property.price_total} RWF`;
    
    responseMessage += `${index + 1}. **${property.title}**\n`;
    responseMessage += `   💰 ${price}\n`;
    responseMessage += `   🛏️ ${property.bedrooms} bed, ${property.bathrooms} bath\n`;
    responseMessage += `   📍 ${property.metadata?.location || 'Location not specified'}\n`;
    responseMessage += `   📱 Type "details ${property.id}" for more info\n`;
    responseMessage += `   💬 Type "contact ${property.id}" to reach owner\n`;
    responseMessage += `   👁️ Type "viewing ${property.id}" to schedule visit\n\n`;
  });

  responseMessage += "Need to refine your search? Just tell me what you're looking for! 🔍";

  return { message: responseMessage };
}

async function handlePropertyDetails(phone: string, propertyId: string) {
  const { data: property, error } = await supabase
    .from('tbl_properties')
    .select('*')
    .eq('id', propertyId)
    .eq('status', 'published')
    .single();

  if (error || !property) {
    return {
      message: "Sorry, I couldn't find that property. It might have been rented/sold or is no longer available."
    };
  }

  const price = property.action === 'rent' 
    ? `${property.price_month} RWF/month`
    : `${property.price_total} RWF`;

  let message = `🏠 **${property.title}**\n\n`;
  message += `💰 **Price:** ${price}\n`;
  message += `🛏️ **Bedrooms:** ${property.bedrooms}\n`;
  message += `🚿 **Bathrooms:** ${property.bathrooms}\n`;
  message += `🏠 **Furnished:** ${property.furnished ? 'Yes' : 'No'}\n`;
  message += `📍 **Location:** ${property.metadata?.location || 'Not specified'}\n\n`;
  
  if (property.description) {
    message += `📝 **Description:**\n${property.description}\n\n`;
  }

  message += `💬 Interested? Type "contact ${property.id}" to chat with the owner!\n`;
  message += `👁️ Want to visit? Type "viewing ${property.id}" to schedule!\n`;
  message += `🔄 Want to see more properties? Just ask me to search again!`;

  return { message };
}

async function handleContactLandlord(phone: string, propertyId: string, tenantMessage: string) {
  const { data: property, error } = await supabase
    .from('tbl_properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (error || !property) {
    return {
      message: "Sorry, I couldn't find that property to connect you with the owner."
    };
  }

  // Create conversation bridge
  const { data: bridge, error: bridgeError } = await supabase
    .from('conversation_bridges')
    .insert({
      buyer_phone: phone,
      seller_phone: property.owner_phone,
      item_type: 'property',
      item_id: propertyId,
      status: 'active',
      initial_message: tenantMessage
    })
    .select()
    .single();

  if (bridgeError) {
    console.error('Bridge creation error:', bridgeError);
    return {
      message: "Sorry, I couldn't connect you with the property owner right now. Please try again."
    };
  }

  // Notify property owner
  const ownerMessage = `🏠 **New inquiry about your ${property.title}!**\n\n` +
                      `👤 Potential ${property.action === 'rent' ? 'tenant' : 'buyer'} is interested and says:\n"${tenantMessage}"\n\n` +
                      `Reply to this message to chat directly with them!\n` +
                      `💡 I'll facilitate your conversation and help with any questions.`;

  await sendWhatsAppMessage(property.owner_phone, ownerMessage);

  // Confirm to tenant/buyer
  const tenantResponse = `✅ **I've connected you with the property owner!**\n\n` +
                        `🏠 **Property:** ${property.title}\n` +
                        `👤 **Owner:** ${property.owner_phone}\n\n` +
                        `Your message has been sent to them. They'll respond here soon!\n` +
                        `💬 When they reply, you can chat directly through me.`;

  return { message: tenantResponse };
}

async function handleScheduleViewing(phone: string, viewingData: any) {
  // Implementation for scheduling property viewings
  return {
    message: "👁️ Great! I'll help you schedule a viewing. This feature is coming soon!\n\n" +
             "For now, please coordinate directly with the property owner for:\n" +
             "• Viewing date and time\n• Meeting location\n• Any specific requirements\n\n" +
             "I'm here to help facilitate the conversation!"
  };
}

async function handlePropertyTransaction(phone: string, transactionData: any) {
  // Implementation for rent/buy process
  return {
    message: "🏠 Excellent! I'll help you complete this rental/purchase. This feature is coming soon!\n\n" +
             "For now, please coordinate directly with the property owner for:\n" +
             "• Lease agreement/purchase contract\n• Payment details\n• Move-in arrangements\n• Documentation\n\n" +
             "I'm here to help if you need assistance!"
  };
}

async function handleGeneralPropertyQuery(phone: string, message: string) {
  if (!openAIApiKey) {
    return {
      message: "I'm here to help with properties! You can:\n\n" +
               "🏠 List your property for sale/rent\n" +
               "🔍 Search for properties to buy/rent\n" +
               "💬 Contact property owners\n" +
               "👁️ Schedule property viewings\n\n" +
               "What would you like to do?"
    };
  }

  const prompt = `You are a helpful property marketplace assistant. The user asked: "${message}"

Provide a helpful response about properties, real estate, buying, selling, renting, or general property advice.
Keep it concise and friendly. If they want to search or list properties, guide them to be more specific.

Maximum 200 characters.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 100
      }),
    });

    const data = await response.json();
    return { message: data.choices[0].message.content };
  } catch (error) {
    console.error('AI response error:', error);
    return {
      message: "I'm here to help with properties! What would you like to do? 🏠"
    };
  }
}

async function handlePropertyAction(phone: string, action: any) {
  switch (action.type) {
    case 'listing_created':
      // Log listing creation
      await supabase
        .from('agent_execution_log')
        .insert({
          function_name: 'whatsapp-property-agent',
          user_id: phone,
          input_data: { action: 'listing_created', property_id: action.property_id },
          execution_time_ms: 0,
          success_status: true,
          timestamp: new Date().toISOString()
        });
      break;
  }
}

async function sendWhatsAppMessage(to: string, message: string) {
  if (!whatsappToken || !whatsappPhoneId) {
    console.log('WhatsApp not configured, would send:', message);
    return;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
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
      const error = await response.text();
      console.error('WhatsApp API error:', error);
    }
  } catch (error) {
    console.error('WhatsApp send error:', error);
  }
}
