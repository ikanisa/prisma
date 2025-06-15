
import { supabase } from '@/integrations/supabase/client';

// Generate a session ID for anonymous users
export const getSessionId = (): string => {
  let sessionId = localStorage.getItem('app_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('app_session_id', sessionId);
  }
  return sessionId;
};

export const supabaseService = {
  async generateQRCode(receiver: string, amount: number) {
    const sessionId = getSessionId();
    
    const { data, error } = await supabase.functions.invoke('generate-qr', {
      body: { receiver, amount, sessionId }
    });

    if (error) throw error;
    return data;
  },

  async createPaymentLink(receiver: string, amount: number) {
    const sessionId = getSessionId();
    
    const { data, error } = await supabase.functions.invoke('create-payment-link', {
      body: { receiver, amount, sessionId }
    });

    if (error) throw error;
    return data;
  },

  async scanQRCodeImage(qrImage: string) {
    const sessionId = getSessionId();
    
    const { data, error } = await supabase.functions.invoke('scan-qr', {
      body: { qrImage, sessionId }
    });

    if (error) throw error;
    return data;
  },

  async logShareEvent(method: string) {
    const sessionId = getSessionId();
    
    const { error } = await supabase
      .from('events')
      .insert({
        session_id: sessionId,
        event_type: 'share_event',
        event_data: { method, timestamp: new Date().toISOString() }
      });

    if (error) console.error('Failed to log share event:', error);
  },

  async getRecentQRCodes() {
    const sessionId = getSessionId();
    
    const { data, error } = await supabase
      .from('qr_history')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    return data || [];
  },

  async getRecentPayments() {
    const sessionId = getSessionId();
    
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  async getSharedLink(linkToken: string) {
    const { data, error } = await supabase
      .from('shared_links')
      .select('*')
      .eq('link_token', linkToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) throw error;
    return data;
  }
};
