import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ijblirphkrrsnxazohwt.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY!);

// Bootstrap conversation helper for tests
async function bootstrapContactConversation(
  waId: string,
  displayName: string | null
) {
  // 1️⃣ upsert contact
  const { data: contact } = await supabase
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

  // 2️⃣ fetch or create conversation (24 h window)
  const { data: lastConv } = await supabase
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
    const { data: newConv } = await supabase
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
    await supabase.from('conversations')
      .update({ last_message_at: new Date() })
      .eq('id', conversationId);
  }

  return { 
    contactId: contact.id, 
    conversationId, 
    contactLang: contact.language || 'en' 
  };
}

describe('Contact & Conversation Bootstrap', () => {
  it('should create contact and conversation', async () => {
    const waId = '250780000999';
    const result = await bootstrapContactConversation(waId, 'Test User');
    
    expect(result.contactId).toBeDefined();
    expect(result.conversationId).toBeDefined();
    expect(result.contactLang).toBe('en');

    // Verify DB rows exist
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', result.contactId)
      .single();
      
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', result.conversationId)
      .single();

    expect(contact?.wa_id).toBe(waId);
    expect(conversation?.contact_id).toBe(result.contactId);
  });

  it('should reuse existing contact and create new conversation after 24h', async () => {
    const waId = '250780000998';
    
    // Create first conversation
    const result1 = await bootstrapContactConversation(waId, 'Test User 2');
    
    // Simulate 24+ hours by updating the conversation timestamp
    await supabase
      .from('conversations')
      .update({ 
        last_message_at: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      })
      .eq('id', result1.conversationId);
    
    // Create second conversation - should be new
    const result2 = await bootstrapContactConversation(waId, 'Test User 2');
    
    expect(result1.contactId).toBe(result2.contactId); // Same contact
    expect(result1.conversationId).not.toBe(result2.conversationId); // Different conversation
  });
});