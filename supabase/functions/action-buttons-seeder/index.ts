import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Action buttons data - 136 buttons covering various domains
const actionButtons = [
  // Payment buttons
  { id: "PAY_QR", domain: "payment", label: "Generate QR", payload: "generate_qr", description: "Generate MoMo QR code for payment" },
  { id: "PAY_CHECK", domain: "payment", label: "Check Balance", payload: "check_balance", description: "Check MoMo balance" },
  { id: "PAY_SEND", domain: "payment", label: "Send Money", payload: "send_money", description: "Send money via MoMo" },
  { id: "PAY_REQUEST", domain: "payment", label: "Request Payment", payload: "request_payment", description: "Request payment from user" },
  
  // Transport buttons
  { id: "RIDE_BOOK", domain: "transport", label: "Book Ride", payload: "book_ride", description: "Book a moto ride" },
  { id: "RIDE_CANCEL", domain: "transport", label: "Cancel Ride", payload: "cancel_ride", description: "Cancel current ride" },
  { id: "RIDE_STATUS", domain: "transport", label: "Ride Status", payload: "ride_status", description: "Check ride status" },
  { id: "DRIVER_ONLINE", domain: "transport", label: "Go Online", payload: "driver_online", description: "Driver goes online" },
  
  // Shopping buttons
  { id: "SHOP_BROWSE", domain: "shopping", label: "Browse Products", payload: "browse_products", description: "Browse available products" },
  { id: "SHOP_CART", domain: "shopping", label: "View Cart", payload: "view_cart", description: "View shopping cart" },
  { id: "SHOP_ORDER", domain: "shopping", label: "Place Order", payload: "place_order", description: "Place order" },
  { id: "SHOP_TRACK", domain: "shopping", label: "Track Order", payload: "track_order", description: "Track order status" },
  
  // Events buttons
  { id: "EVENT_LIST", domain: "events", label: "List Events", payload: "list_events", description: "Show upcoming events" },
  { id: "EVENT_RSVP", domain: "events", label: "RSVP", payload: "event_rsvp", description: "RSVP to event" },
  { id: "EVENT_CREATE", domain: "events", label: "Create Event", payload: "create_event", description: "Create new event" },
  { id: "EVENT_SHARE", domain: "events", label: "Share Event", payload: "share_event", description: "Share event details" },
  
  // Agriculture buttons
  { id: "FARM_PRICES", domain: "agriculture", label: "Market Prices", payload: "market_prices", description: "Check market prices" },
  { id: "FARM_SELL", domain: "agriculture", label: "Sell Produce", payload: "sell_produce", description: "List produce for sale" },
  { id: "FARM_BUY", domain: "agriculture", label: "Buy Produce", payload: "buy_produce", description: "Purchase produce" },
  { id: "FARM_WEATHER", domain: "agriculture", label: "Weather", payload: "weather_info", description: "Get weather information" },
  
  // Real Estate buttons
  { id: "RE_SEARCH", domain: "realestate", label: "Search Properties", payload: "search_properties", description: "Search for properties" },
  { id: "RE_LIST", domain: "realestate", label: "List Property", payload: "list_property", description: "List property for sale/rent" },
  { id: "RE_VISIT", domain: "realestate", label: "Schedule Visit", payload: "schedule_visit", description: "Schedule property visit" },
  { id: "RE_FAVORITE", domain: "realestate", label: "Add to Favorites", payload: "add_favorite", description: "Add property to favorites" },
  
  // Healthcare buttons
  { id: "HEALTH_BOOK", domain: "healthcare", label: "Book Appointment", payload: "book_appointment", description: "Book medical appointment" },
  { id: "HEALTH_REMIND", domain: "healthcare", label: "Set Reminder", payload: "set_reminder", description: "Set medication reminder" },
  { id: "HEALTH_CONSULT", domain: "healthcare", label: "Consult Doctor", payload: "consult_doctor", description: "Request consultation" },
  { id: "HEALTH_EMERGENCY", domain: "healthcare", label: "Emergency", payload: "emergency_contact", description: "Emergency contact" },
  
  // Education buttons
  { id: "EDU_ENROLL", domain: "education", label: "Enroll Course", payload: "enroll_course", description: "Enroll in course" },
  { id: "EDU_SCHEDULE", domain: "education", label: "Class Schedule", payload: "class_schedule", description: "View class schedule" },
  { id: "EDU_GRADES", domain: "education", label: "Check Grades", payload: "check_grades", description: "Check grades" },
  { id: "EDU_FEES", domain: "education", label: "Pay Fees", payload: "pay_fees", description: "Pay school fees" },
  
  // Entertainment buttons
  { id: "ENT_MOVIES", domain: "entertainment", label: "Movie Tickets", payload: "movie_tickets", description: "Book movie tickets" },
  { id: "ENT_MUSIC", domain: "entertainment", label: "Music", payload: "play_music", description: "Play music" },
  { id: "ENT_GAMES", domain: "entertainment", label: "Games", payload: "play_games", description: "Play games" },
  { id: "ENT_NEWS", domain: "entertainment", label: "News", payload: "latest_news", description: "Get latest news" },
  
  // Food buttons
  { id: "FOOD_ORDER", domain: "food", label: "Order Food", payload: "order_food", description: "Order food delivery" },
  { id: "FOOD_MENU", domain: "food", label: "View Menu", payload: "view_menu", description: "View restaurant menu" },
  { id: "FOOD_RESERVE", domain: "food", label: "Reserve Table", payload: "reserve_table", description: "Reserve restaurant table" },
  { id: "FOOD_REVIEW", domain: "food", label: "Write Review", payload: "write_review", description: "Write restaurant review" },
  
  // Government buttons
  { id: "GOV_TAX", domain: "government", label: "Pay Taxes", payload: "pay_taxes", description: "Pay government taxes" },
  { id: "GOV_PERMIT", domain: "government", label: "Apply Permit", payload: "apply_permit", description: "Apply for permit" },
  { id: "GOV_REGISTER", domain: "government", label: "Register Business", payload: "register_business", description: "Register business" },
  { id: "GOV_VOTE", domain: "government", label: "Vote", payload: "cast_vote", description: "Cast vote in election" },
  
  // Banking buttons
  { id: "BANK_BALANCE", domain: "banking", label: "Check Balance", payload: "check_balance", description: "Check bank balance" },
  { id: "BANK_TRANSFER", domain: "banking", label: "Transfer Money", payload: "transfer_money", description: "Transfer money" },
  { id: "BANK_LOAN", domain: "banking", label: "Apply Loan", payload: "apply_loan", description: "Apply for loan" },
  { id: "BANK_HISTORY", domain: "banking", label: "Transaction History", payload: "transaction_history", description: "View transaction history" },
  
  // Insurance buttons
  { id: "INS_QUOTE", domain: "insurance", label: "Get Quote", payload: "get_quote", description: "Get insurance quote" },
  { id: "INS_CLAIM", domain: "insurance", label: "File Claim", payload: "file_claim", description: "File insurance claim" },
  { id: "INS_POLICY", domain: "insurance", label: "View Policy", payload: "view_policy", description: "View insurance policy" },
  { id: "INS_PAY", domain: "insurance", label: "Pay Premium", payload: "pay_premium", description: "Pay insurance premium" },
  
  // Utilities buttons
  { id: "UTIL_ELECTRIC", domain: "utilities", label: "Pay Electricity", payload: "pay_electricity", description: "Pay electricity bill" },
  { id: "UTIL_WATER", domain: "utilities", label: "Pay Water", payload: "pay_water", description: "Pay water bill" },
  { id: "UTIL_INTERNET", domain: "utilities", label: "Pay Internet", payload: "pay_internet", description: "Pay internet bill" },
  { id: "UTIL_REPORT", domain: "utilities", label: "Report Issue", payload: "report_issue", description: "Report utility issue" },
  
  // Communication buttons
  { id: "COMM_SMS", domain: "communication", label: "Send SMS", payload: "send_sms", description: "Send SMS message" },
  { id: "COMM_CALL", domain: "communication", label: "Make Call", payload: "make_call", description: "Make phone call" },
  { id: "COMM_EMAIL", domain: "communication", label: "Send Email", payload: "send_email", description: "Send email" },
  { id: "COMM_CHAT", domain: "communication", label: "Start Chat", payload: "start_chat", description: "Start chat conversation" },
  
  // Travel buttons
  { id: "TRAVEL_BOOK", domain: "travel", label: "Book Travel", payload: "book_travel", description: "Book travel tickets" },
  { id: "TRAVEL_HOTEL", domain: "travel", label: "Book Hotel", payload: "book_hotel", description: "Book hotel room" },
  { id: "TRAVEL_VISA", domain: "travel", label: "Apply Visa", payload: "apply_visa", description: "Apply for visa" },
  { id: "TRAVEL_GUIDE", domain: "travel", label: "Travel Guide", payload: "travel_guide", description: "Get travel guide" },
  
  // Security buttons
  { id: "SEC_REPORT", domain: "security", label: "Report Crime", payload: "report_crime", description: "Report crime to police" },
  { id: "SEC_EMERGENCY", domain: "security", label: "Emergency Call", payload: "emergency_call", description: "Make emergency call" },
  { id: "SEC_GUARD", domain: "security", label: "Security Guard", payload: "request_guard", description: "Request security guard" },
  { id: "SEC_ALARM", domain: "security", label: "Set Alarm", payload: "set_alarm", description: "Set security alarm" },
  
  // Sports buttons
  { id: "SPORT_BOOK", domain: "sports", label: "Book Facility", payload: "book_facility", description: "Book sports facility" },
  { id: "SPORT_SCORES", domain: "sports", label: "Live Scores", payload: "live_scores", description: "Get live sports scores" },
  { id: "SPORT_BET", domain: "sports", label: "Place Bet", payload: "place_bet", description: "Place sports bet" },
  { id: "SPORT_JOIN", domain: "sports", label: "Join Team", payload: "join_team", description: "Join sports team" },
  
  // Social buttons
  { id: "SOCIAL_POST", domain: "social", label: "Create Post", payload: "create_post", description: "Create social media post" },
  { id: "SOCIAL_SHARE", domain: "social", label: "Share Content", payload: "share_content", description: "Share content" },
  { id: "SOCIAL_FOLLOW", domain: "social", label: "Follow User", payload: "follow_user", description: "Follow user" },
  { id: "SOCIAL_MESSAGE", domain: "social", label: "Send Message", payload: "send_message", description: "Send private message" },
  
  // Fashion buttons
  { id: "FASHION_BROWSE", domain: "fashion", label: "Browse Fashion", payload: "browse_fashion", description: "Browse fashion items" },
  { id: "FASHION_TRY", domain: "fashion", label: "Virtual Try", payload: "virtual_try", description: "Virtual try-on" },
  { id: "FASHION_STYLE", domain: "fashion", label: "Style Guide", payload: "style_guide", description: "Get style recommendations" },
  { id: "FASHION_TREND", domain: "fashion", label: "Latest Trends", payload: "latest_trends", description: "View latest fashion trends" },
  
  // Fitness buttons
  { id: "FIT_WORKOUT", domain: "fitness", label: "Start Workout", payload: "start_workout", description: "Start fitness workout" },
  { id: "FIT_TRACK", domain: "fitness", label: "Track Progress", payload: "track_progress", description: "Track fitness progress" },
  { id: "FIT_DIET", domain: "fitness", label: "Diet Plan", payload: "diet_plan", description: "Get diet plan" },
  { id: "FIT_TRAINER", domain: "fitness", label: "Find Trainer", payload: "find_trainer", description: "Find personal trainer" },
  
  // Technology buttons
  { id: "TECH_SUPPORT", domain: "technology", label: "Tech Support", payload: "tech_support", description: "Get technical support" },
  { id: "TECH_REPAIR", domain: "technology", label: "Repair Service", payload: "repair_service", description: "Request repair service" },
  { id: "TECH_UPGRADE", domain: "technology", label: "Upgrade System", payload: "upgrade_system", description: "Upgrade technology" },
  { id: "TECH_LEARN", domain: "technology", label: "Learn Tech", payload: "learn_tech", description: "Learn new technology" },
  
  // Weather buttons
  { id: "WEATHER_CURRENT", domain: "weather", label: "Current Weather", payload: "current_weather", description: "Get current weather" },
  { id: "WEATHER_FORECAST", domain: "weather", label: "Weather Forecast", payload: "weather_forecast", description: "Get weather forecast" },
  { id: "WEATHER_ALERT", domain: "weather", label: "Weather Alert", payload: "weather_alert", description: "Set weather alert" },
  { id: "WEATHER_HISTORY", domain: "weather", label: "Weather History", payload: "weather_history", description: "View weather history" },
  
  // Business buttons
  { id: "BIZ_REGISTER", domain: "business", label: "Register Business", payload: "register_business", description: "Register new business" },
  { id: "BIZ_INVOICE", domain: "business", label: "Create Invoice", payload: "create_invoice", description: "Create business invoice" },
  { id: "BIZ_REPORT", domain: "business", label: "Business Report", payload: "business_report", description: "Generate business report" },
  { id: "BIZ_NETWORK", domain: "business", label: "Business Network", payload: "business_network", description: "Join business network" },
  
  // Legal buttons
  { id: "LEGAL_CONSULT", domain: "legal", label: "Legal Consultation", payload: "legal_consultation", description: "Get legal consultation" },
  { id: "LEGAL_DOCUMENT", domain: "legal", label: "Legal Document", payload: "legal_document", description: "Create legal document" },
  { id: "LEGAL_CASE", domain: "legal", label: "File Case", payload: "file_case", description: "File legal case" },
  { id: "LEGAL_ADVICE", domain: "legal", label: "Legal Advice", payload: "legal_advice", description: "Get legal advice" },
  
  // Environment buttons
  { id: "ENV_RECYCLE", domain: "environment", label: "Recycle Info", payload: "recycle_info", description: "Get recycling information" },
  { id: "ENV_REPORT", domain: "environment", label: "Report Pollution", payload: "report_pollution", description: "Report environmental pollution" },
  { id: "ENV_TIPS", domain: "environment", label: "Eco Tips", payload: "eco_tips", description: "Get environmental tips" },
  { id: "ENV_DONATE", domain: "environment", label: "Donate Green", payload: "donate_green", description: "Donate to environmental cause" },
  
  // Charity buttons
  { id: "CHARITY_DONATE", domain: "charity", label: "Make Donation", payload: "make_donation", description: "Make charitable donation" },
  { id: "CHARITY_VOLUNTEER", domain: "charity", label: "Volunteer", payload: "volunteer", description: "Sign up to volunteer" },
  { id: "CHARITY_FUNDRAISE", domain: "charity", label: "Start Fundraiser", payload: "start_fundraiser", description: "Start fundraising campaign" },
  { id: "CHARITY_HELP", domain: "charity", label: "Request Help", payload: "request_help", description: "Request charitable help" },
  
  // Pet buttons
  { id: "PET_VET", domain: "pets", label: "Book Vet", payload: "book_vet", description: "Book veterinary appointment" },
  { id: "PET_GROOM", domain: "pets", label: "Pet Grooming", payload: "pet_grooming", description: "Book pet grooming" },
  { id: "PET_ADOPT", domain: "pets", label: "Adopt Pet", payload: "adopt_pet", description: "Adopt a pet" },
  { id: "PET_CARE", domain: "pets", label: "Pet Care Tips", payload: "pet_care_tips", description: "Get pet care tips" },
  
  // Home services buttons
  { id: "HOME_CLEAN", domain: "home", label: "House Cleaning", payload: "house_cleaning", description: "Book house cleaning service" },
  { id: "HOME_REPAIR", domain: "home", label: "Home Repair", payload: "home_repair", description: "Request home repair" },
  { id: "HOME_SECURITY", domain: "home", label: "Home Security", payload: "home_security", description: "Setup home security" },
  { id: "HOME_GARDEN", domain: "home", label: "Garden Care", payload: "garden_care", description: "Book garden care service" },
  
  // General utility buttons
  { id: "HELP_SUPPORT", domain: "general", label: "Get Help", payload: "get_help", description: "Get customer support" },
  { id: "FEEDBACK_SEND", domain: "general", label: "Send Feedback", payload: "send_feedback", description: "Send feedback" },
  { id: "SETTINGS_CHANGE", domain: "general", label: "Change Settings", payload: "change_settings", description: "Change user settings" },
  { id: "LANGUAGE_SWITCH", domain: "general", label: "Switch Language", payload: "switch_language", description: "Switch interface language" }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 Starting action buttons seeding...");
    
    const { error } = await sb.from("action_buttons").upsert(actionButtons, { onConflict: "id" });
    
    if (error) {
      console.error("❌ Error seeding action buttons:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Successfully seeded ${actionButtons.length} action buttons`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Seeded ${actionButtons.length} action buttons`,
      count: actionButtons.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Action buttons seeding error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});