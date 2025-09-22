import { supabaseClient } from "./client.ts";
// @ts-ignore

// @ts-ignore  
const Deno = globalThis.Deno;

interface ConversationState {
  user_id: string;
  stage: string;
  last_domain?: string;
  last_template?: string;
  last_user_msg_at?: string;
  updated_at?: string;
}

export async function getState(userId: string): Promise<ConversationState> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const { data } = await sb
    .from('conversation_state')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  return data ?? { 
    user_id: userId,
    stage: 'new', 
    last_template: null, 
    last_user_msg_at: null 
  };
}

export async function setState(userId: string, patch: Partial<ConversationState>) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  patch.updated_at = new Date().toISOString();
  
  await sb
    .from('conversation_state')
    .upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' });
}