
/**
 * Database Operations Module
 * Handles all Supabase database interactions for QR generation
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface USSDResult {
  data: string;
  error?: any;
}

export interface MethodResult {
  data: string;
  error?: any;
}

export async function generateUSSDAndMethod(
  supabaseClient: any,
  receiver: string,
  amount: number
): Promise<{ ussdData: USSDResult; methodData: MethodResult }> {
  const [ussdData, methodData] = await Promise.all([
    supabaseClient.rpc('generate_ussd_string', { input_value: receiver, amount }),
    supabaseClient.rpc('detect_payment_method', { input_value: receiver })
  ]);

  return { ussdData, methodData };
}

export async function executeBackgroundOperations(
  supabaseClient: any,
  sessionId: string,
  receiver: string,
  amount: number,
  ussdString: string,
  qrCodeDataURL: string,
  methodData: string
): Promise<void> {
  // Execute all background operations in parallel
  Promise.all([
    // Upload to storage
    (async () => {
      try {
        const base64Data = qrCodeDataURL.split(',')[1];
        const qrCodeBlob = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const fileName = `${sessionId}/${Date.now()}.png`;
        
        const { error: uploadError } = await supabaseClient.storage
          .from('qr-codes')
          .upload(fileName, qrCodeBlob, { contentType: 'image/png' });

        if (uploadError) {
          console.warn('Storage upload failed:', uploadError);
        }
      } catch (error) {
        console.warn('Storage operation failed:', error);
      }
    })(),
    
    // Save to payments table
    (async () => {
      try {
        await supabaseClient
          .from('payments')
          .insert({
            session_id: sessionId,
            phone_number: receiver,
            momo_code: methodData === 'code' ? receiver : null,
            amount,
            method: methodData,
            ussd_string: ussdString,
            status: 'pending'
          });
      } catch (error) {
        console.warn('Payment insert failed:', error);
      }
    })(),
    
    // Save to QR history
    (async () => {
      try {
        await supabaseClient
          .from('qr_history')
          .insert({
            session_id: sessionId,
            phone_number: receiver,
            amount,
            type: 'generate',
            ussd_string: ussdString,
            qr_image_url: qrCodeDataURL
          });
      } catch (error) {
        console.warn('History insert failed:', error);
      }
    })(),
    
    // Log analytics
    (async () => {
      try {
        await supabaseClient
          .from('events')
          .insert({
            session_id: sessionId,
            event_type: 'qr_generated',
            event_data: {
              receiver,
              amount,
              method: methodData
            }
          });
      } catch (error) {
        console.warn('Analytics logging failed:', error);
      }
    })()
  ]);
}
