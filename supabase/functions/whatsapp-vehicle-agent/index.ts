
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
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
    
    console.log(`🚗 Vehicle Agent processing message from ${phone_number}: "${message}"`);

    // Determine intent
    const intent = await analyzeVehicleIntent(message, user_context);
    console.log(`📋 Detected intent: ${intent.action}`);

    let response;
    switch (intent.action) {
      case 'list_vehicle':
        response = await handleVehicleListing(phone_number, message, images, intent.data);
        break;
      case 'search_vehicles':
        response = await handleVehicleSearch(phone_number, message, intent.data);
        break;
      case 'vehicle_details':
        response = await handleVehicleDetails(phone_number, intent.data.vehicle_id);
        break;
      case 'contact_seller':
        response = await handleContactSeller(phone_number, intent.data.vehicle_id, message);
        break;
      case 'rent_buy_process':
        response = await handleVehicleTransaction(phone_number, intent.data);
        break;
      default:
        response = await handleGeneralVehicleQuery(phone_number, message);
    }

    // Send WhatsApp response
    if (response.message) {
      await sendWhatsAppMessage(phone_number, response.message);
    }

    // Handle follow-up actions
    if (response.actions) {
      for (const action of response.actions) {
        await handleVehicleAction(phone_number, action);
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
    console.error('❌ Vehicle Agent error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function analyzeVehicleIntent(message: string, context: any) {
  if (!openAIApiKey) {
    return { action: 'general_query', data: {} };
  }

  const prompt = `Analyze this vehicle-related message and determine the user's intent:

Message: "${message}"
User Context: ${JSON.stringify(context)}

Determine the action from these options:
- list_vehicle: User wants to list their vehicle for sale/rent
- search_vehicles: User is looking for vehicles to buy/rent
- vehicle_details: User wants details about a specific vehicle
- contact_seller: User wants to contact a vehicle owner
- rent_buy_process: User wants to proceed with renting/buying
- general_query: General question about vehicles

Extract relevant data like vehicle type, location, price range, etc.

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

async function handleVehicleListing(phone: string, message: string, images: any[], intentData: any) {
  console.log('🚗 Processing vehicle listing request');

  // Start guided listing process
  const { data: existingSession } = await supabase
    .from('conversation_flows')
    .select('*')
    .eq('phone_number', phone)
    .eq('flow_name', 'vehicle_listing')
    .eq('status', 'active')
    .single();

  if (!existingSession) {
    // Start new listing session
    await supabase
      .from('conversation_flows')
      .insert({
        phone_number: phone,
        flow_name: 'vehicle_listing',
        current_step: 'vehicle_type',
        flow_data: { intent_data: intentData },
        status: 'active'
      });

    return {
      message: "🚗 Great! I'll help you list your vehicle. Let's start:\n\n" +
               "What type of vehicle are you listing?\n" +
               "• Car\n• Motorcycle\n• Truck\n• Bus\n• Other\n\n" +
               "Just tell me the type!"
    };
  }

  // Continue existing session
  return await continueVehicleListingFlow(phone, message, images, existingSession);
}

async function continueVehicleListingFlow(phone: string, message: string, images: any[], session: any) {
  const currentStep = session.current_step;
  const flowData = session.flow_data || {};

  let nextStep = '';
  let responseMessage = '';
  let actions = [];

  switch (currentStep) {
    case 'vehicle_type':
      flowData.vehicle_type = message.toLowerCase();
      nextStep = 'make_model';
      responseMessage = "Perfect! Now tell me the make and model of your vehicle.\n\nFor example: 'Toyota Corolla' or 'Honda CBR 600'";
      break;

    case 'make_model':
      const makeModel = message.split(' ');
      flowData.make = makeModel[0];
      flowData.model = makeModel.slice(1).join(' ');
      nextStep = 'year';
      responseMessage = "Great! What year is your vehicle?\n\nExample: 2020 or 2018";
      break;

    case 'year':
      flowData.year = parseInt(message);
      nextStep = 'mileage';
      responseMessage = "What's the mileage/kilometers on your vehicle?\n\nExample: 50000 km or 'Brand new'";
      break;

    case 'mileage':
      flowData.mileage = message;
      nextStep = 'action_type';
      responseMessage = "Are you looking to:\n• Sell\n• Rent\n• Both\n\nWhich option?";
      break;

    case 'action_type':
      flowData.action_type = message.toLowerCase();
      nextStep = 'price';
      responseMessage = flowData.action_type.includes('rent') 
        ? "What's your daily rental rate? (in RWF)\n\nExample: 25000"
        : "What's your selling price? (in RWF)\n\nExample: 15000000";
      break;

    case 'price':
      if (flowData.action_type.includes('rent')) {
        flowData.daily_rate = parseInt(message);
      } else {
        flowData.sale_price = parseInt(message);
      }
      nextStep = 'location';
      responseMessage = "Where is your vehicle located?\n\nExample: Kimisagara, Kigali or Musanze";
      break;

    case 'location':
      flowData.location = message;
      nextStep = 'images';
      responseMessage = "Perfect! Now please send me 3-5 clear photos of your vehicle:\n\n" +
                       "• Front view\n• Side view\n• Interior\n• Engine (if relevant)\n• Any special features\n\n" +
                       "Send them one by one or all together!";
      break;

    case 'images':
      if (images && images.length > 0) {
        flowData.images = [...(flowData.images || []), ...images];
        
        if (flowData.images.length >= 3) {
          nextStep = 'description';
          responseMessage = "Excellent photos! Now give me a brief description of your vehicle:\n\n" +
                           "Include details like:\n• Condition\n• Special features\n• Any recent maintenance\n• Why you're selling/renting";
        } else {
          responseMessage = `Great! I have ${flowData.images.length} photos. Please send ${3 - flowData.images.length} more photos to complete your listing.`;
        }
      } else {
        responseMessage = "I didn't receive any images. Please send photos of your vehicle to continue.";
      }
      break;

    case 'description':
      flowData.description = message;
      nextStep = 'contact_info';
      responseMessage = "Almost done! What's the best way for interested buyers to contact you?\n\n" +
                       "Your WhatsApp number will be included automatically. Any other contact info?";
      break;

    case 'contact_info':
      flowData.contact_info = message;
      nextStep = 'completed';
      
      // Create the vehicle listing
      const vehicleData = {
        owner_phone: phone,
        title: `${flowData.make} ${flowData.model} ${flowData.year}`,
        description: flowData.description,
        action: flowData.action_type.includes('sell') ? 'sale' : 'rent',
        daily_rate: flowData.daily_rate || null,
        sale_price: flowData.sale_price || null,
        make: flowData.make,
        model: flowData.model,
        year: flowData.year,
        mileage_km: parseInt(flowData.mileage) || null,
        imgs: flowData.images || [],
        status: 'published',
        metadata: {
          vehicle_type: flowData.vehicle_type,
          contact_info: flowData.contact_info,
          location: flowData.location
        }
      };

      const { data: newVehicle, error } = await supabase
        .from('tbl_vehicles')
        .insert(vehicleData)
        .select()
        .single();

      if (error) {
        console.error('Vehicle listing creation error:', error);
        responseMessage = "Sorry, there was an error creating your listing. Please try again.";
      } else {
        responseMessage = `🎉 Perfect! Your vehicle is now listed!\n\n` +
                         `📋 **${newVehicle.title}**\n` +
                         `💰 Price: ${flowData.action_type.includes('rent') ? flowData.daily_rate + ' RWF/day' : flowData.sale_price + ' RWF'}\n` +
                         `📍 Location: ${flowData.location}\n\n` +
                         `Your listing is now live and potential buyers can contact you directly through this system.\n\n` +
                         `I'll notify you when someone shows interest! 🚗✨`;
        
        actions = [{
          type: 'listing_created',
          vehicle_id: newVehicle.id
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

async function handleVehicleSearch(phone: string, message: string, intentData: any) {
  console.log('🔍 Processing vehicle search request');

  // Extract search parameters
  const searchParams = {
    vehicle_type: intentData.vehicle_type || null,
    action: intentData.action || null, // rent or sale
    max_price: intentData.max_price || null,
    location: intentData.location || null,
    make: intentData.make || null
  };

  // Build query
  let query = supabase
    .from('tbl_vehicles')
    .select('*')
    .eq('status', 'published');

  if (searchParams.action) {
    query = query.eq('action', searchParams.action);
  }

  if (searchParams.make) {
    query = query.ilike('make', `%${searchParams.make}%`);
  }

  if (searchParams.max_price) {
    if (searchParams.action === 'rent') {
      query = query.lte('daily_rate', searchParams.max_price);
    } else {
      query = query.lte('sale_price', searchParams.max_price);
    }
  }

  query = query.limit(5);

  const { data: vehicles, error } = await query;

  if (error) {
    console.error('Vehicle search error:', error);
    return {
      message: "Sorry, I couldn't search for vehicles right now. Please try again."
    };
  }

  if (!vehicles || vehicles.length === 0) {
    return {
      message: "🔍 I couldn't find any vehicles matching your criteria. Try adjusting your search:\n\n" +
               "• Different price range\n• Different location\n• Different vehicle type\n\n" +
               "Or ask me to search again with different criteria!"
    };
  }

  let responseMessage = `🚗 Found ${vehicles.length} vehicles for you:\n\n`;

  vehicles.forEach((vehicle, index) => {
    const price = vehicle.action === 'rent' 
      ? `${vehicle.daily_rate} RWF/day`
      : `${vehicle.sale_price} RWF`;
    
    responseMessage += `${index + 1}. **${vehicle.title}**\n`;
    responseMessage += `   💰 ${price}\n`;
    responseMessage += `   📍 ${vehicle.metadata?.location || 'Location not specified'}\n`;
    responseMessage += `   📱 Type "details ${vehicle.id}" for more info\n`;
    responseMessage += `   💬 Type "contact ${vehicle.id}" to reach seller\n\n`;
  });

  responseMessage += "Need to refine your search? Just tell me what you're looking for! 🔍";

  return { message: responseMessage };
}

async function handleVehicleDetails(phone: string, vehicleId: string) {
  const { data: vehicle, error } = await supabase
    .from('tbl_vehicles')
    .select('*')
    .eq('id', vehicleId)
    .eq('status', 'published')
    .single();

  if (error || !vehicle) {
    return {
      message: "Sorry, I couldn't find that vehicle. It might have been sold or is no longer available."
    };
  }

  const price = vehicle.action === 'rent' 
    ? `${vehicle.daily_rate} RWF/day`
    : `${vehicle.sale_price} RWF`;

  let message = `🚗 **${vehicle.title}**\n\n`;
  message += `💰 **Price:** ${price}\n`;
  message += `📅 **Year:** ${vehicle.year}\n`;
  message += `🛣️ **Mileage:** ${vehicle.mileage_km ? vehicle.mileage_km + ' km' : 'Not specified'}\n`;
  message += `⚙️ **Transmission:** ${vehicle.transmission || 'Not specified'}\n`;
  message += `⛽ **Fuel Type:** ${vehicle.fuel_type || 'Not specified'}\n`;
  message += `📍 **Location:** ${vehicle.metadata?.location || 'Not specified'}\n\n`;
  
  if (vehicle.description) {
    message += `📝 **Description:**\n${vehicle.description}\n\n`;
  }

  message += `💬 Interested? Type "contact ${vehicle.id}" to chat with the seller!\n`;
  message += `🔄 Want to see more vehicles? Just ask me to search again!`;

  return { message };
}

async function handleContactSeller(phone: string, vehicleId: string, buyerMessage: string) {
  const { data: vehicle, error } = await supabase
    .from('tbl_vehicles')
    .select('*')
    .eq('id', vehicleId)
    .single();

  if (error || !vehicle) {
    return {
      message: "Sorry, I couldn't find that vehicle to connect you with the seller."
    };
  }

  // Create conversation bridge
  const { data: bridge, error: bridgeError } = await supabase
    .from('conversation_bridges')
    .insert({
      buyer_phone: phone,
      seller_phone: vehicle.owner_phone,
      item_type: 'vehicle',
      item_id: vehicleId,
      status: 'active',
      initial_message: buyerMessage
    })
    .select()
    .single();

  if (bridgeError) {
    console.error('Bridge creation error:', bridgeError);
    return {
      message: "Sorry, I couldn't connect you with the seller right now. Please try again."
    };
  }

  // Notify seller
  const sellerMessage = `💬 **New inquiry about your ${vehicle.title}!**\n\n` +
                       `👤 Potential buyer is interested and says:\n"${buyerMessage}"\n\n` +
                       `Reply to this message to chat directly with them!\n` +
                       `💡 I'll facilitate your conversation and help with any questions.`;

  await sendWhatsAppMessage(vehicle.owner_phone, sellerMessage);

  // Confirm to buyer
  const buyerResponse = `✅ **I've connected you with the seller!**\n\n` +
                       `🚗 **Vehicle:** ${vehicle.title}\n` +
                       `👤 **Seller:** ${vehicle.owner_phone}\n\n` +
                       `Your message has been sent to them. They'll respond here soon!\n` +
                       `💬 When they reply, you can chat directly through me.`;

  return { message: buyerResponse };
}

async function handleVehicleTransaction(phone: string, transactionData: any) {
  // Implementation for rent/buy process
  return {
    message: "🚗 Great! I'll help you complete this transaction. This feature is coming soon!\n\n" +
             "For now, please coordinate directly with the seller for:\n" +
             "• Payment details\n• Pickup/delivery\n• Documentation\n\n" +
             "I'm here to help if you need assistance!"
  };
}

async function handleGeneralVehicleQuery(phone: string, message: string) {
  if (!openAIApiKey) {
    return {
      message: "I'm here to help with vehicles! You can:\n\n" +
               "🚗 List your vehicle for sale/rent\n" +
               "🔍 Search for vehicles to buy/rent\n" +
               "💬 Contact vehicle sellers\n\n" +
               "What would you like to do?"
    };
  }

  const prompt = `You are a helpful vehicle marketplace assistant. The user asked: "${message}"

Provide a helpful response about vehicles, buying, selling, renting, or general automotive advice.
Keep it concise and friendly. If they want to search or list vehicles, guide them to be more specific.

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
      message: "I'm here to help with vehicles! What would you like to do? 🚗"
    };
  }
}

async function handleVehicleAction(phone: string, action: any) {
  switch (action.type) {
    case 'listing_created':
      // Log listing creation
      await supabase
        .from('agent_execution_log')
        .insert({
          function_name: 'whatsapp-vehicle-agent',
          user_id: phone,
          input_data: { action: 'listing_created', vehicle_id: action.vehicle_id },
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
