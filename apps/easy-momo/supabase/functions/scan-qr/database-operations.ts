
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ValidationResult } from './types.ts';

export async function saveQRHistory(
  supabaseClient: any,
  sessionId: string,
  receiver: string,
  amount: string,
  sanitizedUssd: string
): Promise<void> {
  const { error: historyError } = await supabaseClient
    .from('qr_history')
    .insert({
      session_id: sessionId,
      phone_number: receiver,
      amount: parseInt(amount),
      type: 'ai_scan',
      ussd_string: sanitizedUssd
    });

  if (historyError) {
    console.error('History insert error:', historyError);
  } else {
    console.log('Enhanced scan saved to history');
  }
}

export async function logAnalyticsEvent(
  supabaseClient: any,
  sessionId: string,
  receiver: string,
  amount: string,
  validation: ValidationResult,
  enhanceImage: boolean,
  aiProcessing: boolean,
  originalPattern: string,
  sanitizedPattern: string
): Promise<void> {
  try {
    await supabaseClient
      .from('events')
      .insert({
        session_id: sessionId || 'anonymous',
        event_type: 'qr_ai_enhanced_processed',
        event_data: {
          receiver,
          amount: parseInt(amount),
          country: validation.country,
          provider: validation.provider,
          patternType: validation.patternType,
          confidence: validation.confidence,
          enhanceImage,
          aiProcessing,
          originalPattern,
          sanitizedPattern
        }
      });
    console.log('Enhanced analytics logged');
  } catch (analyticsError) {
    console.warn('Analytics logging failed:', analyticsError);
  }
}

export async function setSessionContext(
  supabaseClient: any,
  sessionId: string
): Promise<void> {
  try {
    await supabaseClient.rpc('set_config', {
      setting_name: 'app.session_id',
      setting_value: sessionId,
      is_local: false
    });
    console.log('Session context set:', sessionId);
  } catch (err) {
    console.warn('Could not set session context:', err);
  }
}
