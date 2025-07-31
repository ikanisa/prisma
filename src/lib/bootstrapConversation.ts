import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ijblirphkrrsnxazohwt.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY!);

/** Result object used everywhere else */
export interface BootResult {
  contactId: string;
  conversationId: string;
  contactLang: string;
}

/**
 * Ensure contact + open conversation exist.
 * @param waId         WhatsApp phone (2507…)
 * @param displayName  From webhook payload
 * @returns {BootResult}
 */
export async function bootstrapContactConversation(
  waId: string,
  displayName: string | null
): Promise<BootResult> {
  /* 1️⃣  upsert contact */
  const { data: contact } = await sb
    .from('contacts')
    .upsert({ 
      wa_id: waId, 
      display_name: displayName, 
      phone_number: waId,
      name: displayName 
    }, { 
      onConflict: 'wa_id', 
      ignoreDuplicates: false 
    })
    .select()
    .single();

  if (!contact) {
    throw new Error('Failed to create or find contact');
  }

  /* 2️⃣  fetch or create conversation (24 h window) */
  const { data: lastConv } = await sb
     .from('conversations')
     .select('*')
     .eq('contact_id', contact.id)
     .order('started_at', { ascending: false })
     .limit(1)
     .maybeSingle();

  let conversationId: string;
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  
  if (!lastConv || now - new Date(lastConv.last_message_at ?? lastConv.started_at).getTime() > twentyFourHours) {
    const { data: newConv } = await sb
      .from('conversations')
      .insert({ 
        contact_id: contact.id, 
        started_at: new Date(), 
        last_message_at: new Date() 
      })
      .select()
      .single();
    
    if (!newConv) {
      throw new Error('Failed to create conversation');
    }
    conversationId = newConv.id;
  } else {
    conversationId = lastConv.id;
    await sb.from('conversations')
      .update({ last_message_at: new Date() })
      .eq('id', conversationId);
  }

  return { 
    contactId: contact.id, 
    conversationId, 
    contactLang: contact.language || 'en' 
  };
}