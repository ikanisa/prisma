import { supabase } from '@/integrations/supabase/client';
import { errorMonitoringService } from './errorMonitoringService';

// Generate a session ID for anonymous users
export const getSessionId = (): string => {
  let sessionId = localStorage.getItem('app_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('app_session_id', sessionId);
  }
  return sessionId;
};

// Set session context for RLS
const setSessionContext = async (sessionId: string) => {
  try {
    // Add 'as any' to avoid TypeScript error for set_config RPC
    const { error } = await (supabase.rpc as any)('set_config', {
      setting_name: 'app.session_id',
      setting_value: sessionId,
      is_local: false
    });
    
    if (error) {
      console.warn('Could not set session context:', error);
    }
  } catch (err) {
    console.warn('Session context function not available:', err);
  }
};

export const supabaseService = {
  async generateQRCode(receiver: string, amount: number) {
    const sessionId = getSessionId();
    try {
      await setSessionContext(sessionId);
      const { data, error } = await supabase.functions.invoke('generate-qr', {
        body: { receiver, amount, sessionId }
      });
      if (error) {
        errorMonitoringService.logSupabaseError('generateQRCode', error);
        throw error;
      }
      return data;
    } catch (error) {
      errorMonitoringService.logSupabaseError('generateQRCode', error);
      throw error;
    }
  },

  async createPaymentLink(receiver: string, amount: number) {
    const sessionId = getSessionId();
    try {
      await setSessionContext(sessionId);
      const { data, error } = await supabase.functions.invoke('create-payment-link', {
        body: { receiver, amount, sessionId }
      });
      if (error) {
        errorMonitoringService.logSupabaseError('createPaymentLink', error);
        throw error;
      }
      return data;
    } catch (error) {
      errorMonitoringService.logSupabaseError('createPaymentLink', error);
      throw error;
    }
  },

  async scanQRCodeImage(qrImage: string) {
    const sessionId = getSessionId();
    try {
      await setSessionContext(sessionId);
      const { data, error } = await supabase.functions.invoke('scan-qr', {
        body: { qrImage, sessionId }
      });
      if (error) {
        errorMonitoringService.logSupabaseError('scanQRCodeImage', error);
        throw error;
      }
      return data;
    } catch (error) {
      errorMonitoringService.logSupabaseError('scanQRCodeImage', error);
      throw error;
    }
  },

  async logShareEvent(method: string) {
    const sessionId = getSessionId();
    try {
      await setSessionContext(sessionId);
      const { error } = await supabase
        .from('events')
        .insert({
          session_id: sessionId,
          event_type: 'share_event',
          event_data: { method, timestamp: new Date().toISOString() }
        });
      if (error) {
        errorMonitoringService.logSupabaseError('logShareEvent', error);
        console.error('Failed to log share event:', error);
      }
    } catch (error) {
      errorMonitoringService.logSupabaseError('logShareEvent', error);
      console.error('Failed to log share event:', error);
    }
  },

  async getRecentQRCodes() {
    const sessionId = getSessionId();
    try {
      await setSessionContext(sessionId);
      const { data, error } = await supabase
        .from('qr_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) {
        errorMonitoringService.logSupabaseError('getRecentQRCodes', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      errorMonitoringService.logSupabaseError('getRecentQRCodes', error);
      return [];
    }
  },

  async getRecentPayments() {
    const sessionId = getSessionId();
    try {
      await setSessionContext(sessionId);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) {
        errorMonitoringService.logSupabaseError('getRecentPayments', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      errorMonitoringService.logSupabaseError('getRecentPayments', error);
      return [];
    }
  },

  async getSharedLink(linkToken: string) {
    try {
      const { data, error } = await supabase
        .from('shared_links')
        .select('*')
        .eq('link_token', linkToken)
        .gt('expires_at', new Date().toISOString())
        .single();
      if (error) {
        errorMonitoringService.logSupabaseError('getSharedLink', error);
        throw error;
      }
      return data;
    } catch (error) {
      errorMonitoringService.logSupabaseError('getSharedLink', error);
      throw error;
    }
  }
};
