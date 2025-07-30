// easyMO WhatsApp Template Registry
// Centralized template names and helper functions

export const TPL = {
  // Core templates
  WELCOME: 'tpl_welcome_quick_v1',
  PAYMENTS: 'tpl_payments_quick_v1',
  DRIVER_STATUS: 'tpl_driver_status_v1',
  PASSENGER: 'tpl_passenger_quick_v1',
  ORDERING: 'tpl_ordering_quick_v1',
  PARTNER: 'tpl_partner_quick_v1',
  SUPPORT: 'tpl_support_quick_v1',
  SETTINGS: 'tpl_settings_quick_v1',
  
  // Marketing templates
  MKT_DRIVER: 'tpl_marketing_driver_v1',
  MKT_BUSINESS: 'tpl_marketing_business_v1',
  MKT_PAYQR: 'tpl_marketing_payqr_v1',
  MKT_PASSENGER: 'tpl_marketing_passenger_v1',
  MKT_PROPERTY: 'tpl_marketing_property_v1',
  MKT_VEHICLE: 'tpl_marketing_vehicle_v1',
  
  // Listings menus
  PROPERTY: 'tpl_property_quick_v1',
  VEHICLE: 'tpl_vehicle_quick_v1'
} as const;

export const quickReplyMap: Record<string, string> = {
  // Payment actions
  "Pay": "PAY_QR",
  "Generate QR": "PAY_QR", 
  "Scan QR": "PAY_SCAN",
  "Send Money": "PAY_SEND",
  
  // Driver actions
  "🟢 Go Online": "DRV_GO_ONLINE",
  "🔴 Go Offline": "DRV_GO_OFFLINE", 
  "📡 Share Live Loc": "DRV_SHARE_LOC",
  "Nearby Drivers": "PAX_NEAR_DRV",
  
  // Passenger actions
  "Request Ride": "PAX_REQUEST",
  "My Trips": "PAX_TRIPS",
  
  // Ordering actions
  "Bars Nearby": "ORD_BAR_NEAR",
  "Pharmacies": "ORD_PHAR_NEAR", 
  "Browse Menu": "ORD_MENU",
  
  // Onboarding actions
  "Become Driver": "ONB_DRV_START",
  "Register Pharmacy": "ONB_PHAR_START",
  "Register Shop": "ONB_SHOP_START",
  
  // Support actions
  "FAQ": "SUP_FAQ",
  "Report Issue": "SUP_REPORT",
  "Talk to Human": "HUMAN",
  
  // Settings actions
  "Edit Name": "PROF_NAME",
  "Change Language": "PROF_LANG", 
  "Clear Data": "PROF_CLEAR",
  
  // Property actions
  "List Property": "PROP_LIST",
  "Find Rentals": "PROP_FIND_RENT",
  "Find Sales": "PROP_FIND_SALE",
  
  // Vehicle actions
  "List Vehicle": "VEH_LIST",
  "Find Cars Sale": "VEH_FIND_SALE",
  "Find Motos": "VEH_FIND_MOTO",
  
  // Common navigation
  "Main Menu": "MAIN_MENU"
};

export async function sendTemplate(
  waId: string,
  templateName: string,
  components: any[] = [],
  language: string = 'en_US'
) {
  console.log(`📤 Sending template ${templateName} to ${waId}`);
  
  const phoneId = Deno.env.get('META_WABA_PHONE_ID');
  const token = Deno.env.get('META_WABA_TOKEN');
  
  if (!phoneId || !token) {
    console.error('❌ Missing WhatsApp credentials');
    return { success: false, error: 'Missing credentials' };
  }
  
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: waId,
          type: 'template',
          template: {
            name: templateName,
            language: { code: language },
            components
          }
        })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Template send error:', data);
      return { success: false, error: data };
    }
    
    console.log(`✅ Template ${templateName} sent successfully`);
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Template send exception:', error);
    return { success: false, error: error.message };
  }
}

export async function logTemplateSend(
  supabase: any,
  waId: string,
  templateName: string,
  success: boolean = true,
  error?: string
) {
  try {
    await supabase.from('contacts').upsert({
      phone_number: waId,
      last_interaction: new Date().toISOString(),
      status: 'active'
    }, { onConflict: 'phone_number' });
    
    // For now, we'll log to the console until we create the table
    console.log(`📊 Template log: ${waId} -> ${templateName} (${success ? 'SUCCESS' : 'FAILED'})`);
    
  } catch (err) {
    console.error('❌ Failed to log template send:', err);
  }
}