import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getOpenAI, generateIntelligentResponse, analyzeIntent } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  amount: number
  phone: string
  type: 'pay' | 'receive'
  description?: string
  reference?: string
}

interface QRGenerationRequest {
  amount?: number
  phone: string
  type: 'receive' | 'pay'
  include_image?: boolean
}

class EnhancedPaymentProcessor {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async generatePaymentQR(request: QRGenerationRequest): Promise<any> {
    try {
      console.log('🔄 Generating enhanced payment QR:', request);

      // Generate payment reference
      const reference = `EZ${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      // Create payment record
      const { data: payment, error: paymentError } = await this.supabase
        .from('payments')
        .insert({
          amount: request.amount || 0,
          phone: request.phone,
          reference: reference,
          status: 'pending',
          type: request.type,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Payment creation error:', paymentError);
        throw new Error('Failed to create payment record');
      }

      // Generate USSD code based on type
      let ussdCode: string;
      if (request.type === 'receive') {
        // Generate receive money USSD
        ussdCode = `*182*1*1*${request.phone}*${request.amount || 0}#`;
      } else {
        // Generate pay money USSD
        ussdCode = `*182*1*2*${request.phone}*${request.amount || 0}#`;
      }

      // Generate QR code image if requested
      let qrImageUrl = null;
      if (request.include_image) {
        try {
          const { data: qrData, error: qrError } = await this.supabase.functions.invoke('enhanced-qr-generator', {
            body: {
              action: 'generate',
              data: ussdCode,
              size: 400
            }
          });

          if (!qrError && qrData?.qr_url) {
            qrImageUrl = qrData.qr_url;
          }
        } catch (error) {
          console.warn('QR image generation failed:', error);
        }
      }

      // Create tel: URI for direct dialing
      const telUri = `tel:${encodeURIComponent(ussdCode)}`;

      return {
        success: true,
        payment_id: payment.id,
        reference: reference,
        ussd_code: ussdCode,
        tel_uri: telUri,
        qr_image_url: qrImageUrl,
        amount: request.amount,
        phone: request.phone,
        type: request.type,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

    } catch (error) {
      console.error('Enhanced payment QR generation error:', error);
      throw error;
    }
  }

  async processQRScan(qrData: string, scannerPhone: string, method: string = 'camera'): Promise<any> {
    try {
      console.log('🔍 Processing QR scan with enhanced processor:', { qrData, scannerPhone, method });

      // Validate QR content
      const validation = this.validateQRContent(qrData);
      
      // Log scan transaction
      const { data: transaction, error: transactionError } = await this.supabase
        .rpc('log_qr_scan_transaction', {
          p_scanned_code: qrData,
          p_scanner_phone: scannerPhone,
          p_scan_method: method,
          p_confidence_score: validation.confidence || 0.5,
          p_lighting_condition: 'normal',
          p_torch_used: false,
          p_processing_time: 100
        });

      if (transactionError) {
        console.error('Failed to log scan transaction:', transactionError);
      }

      if (!validation.isValid) {
        return {
          success: false,
          message: 'Invalid QR code format',
          suggestions: this.suggestQRFixes(qrData),
          transaction_id: transaction?.transaction_id
        };
      }

      // Process based on QR type
      if (validation.type === 'ussd' || validation.type === 'payment') {
        const details = this.extractPaymentDetails(qrData);
        
        if (details.amount && details.phone) {
          // Create payment initiation record
          const { data: payment, error: paymentError } = await this.supabase
            .from('payments')
            .insert({
              amount: parseInt(details.amount),
              phone: details.phone,
              scanner_phone: scannerPhone,
              ussd_code: qrData,
              status: 'scanned',
              type: 'pay',
              scan_method: method
            })
            .select()
            .single();

          if (!paymentError) {
            return {
              success: true,
              message: 'Payment QR scanned successfully',
              data: {
                payment_id: payment.id,
                amount: details.amount,
                phone: details.phone,
                ussd_code: qrData,
                tel_uri: `tel:${encodeURIComponent(qrData)}`
              },
              transaction_id: transaction?.transaction_id
            };
          }
        }

        // Generic USSD code
        return {
          success: true,
          message: 'USSD code detected',
          data: {
            ussd_code: qrData,
            tel_uri: `tel:${encodeURIComponent(qrData)}`
          },
          transaction_id: transaction?.transaction_id
        };
      }

      return {
        success: true,
        message: 'QR code scanned successfully',
        data: {
          content: qrData,
          type: validation.type
        },
        transaction_id: transaction?.transaction_id
      };

    } catch (error) {
      console.error('Enhanced QR scan processing error:', error);
      return {
        success: false,
        message: 'Failed to process QR scan',
        error: error.message
      };
    }
  }

  private validateQRContent(content: string): { isValid: boolean; type: string; confidence: number } {
    const trimmedContent = content.trim();
    
    // USSD validation patterns from PWA scanner
    if (/\*182\*\d+\*\d+\*\d+\*\d+#/.test(trimmedContent)) {
      return { isValid: true, type: 'ussd', confidence: 0.95 };
    }

    if (/\*182\*\d+\*\d+#/.test(trimmedContent)) {
      return { isValid: true, type: 'payment', confidence: 0.8 };
    }

    if (trimmedContent.startsWith('http') || trimmedContent.includes('://')) {
      return { isValid: true, type: 'url', confidence: 0.7 };
    }

    if (/^\d{4,8}$/.test(trimmedContent)) {
      return { isValid: true, type: 'payment', confidence: 0.6 };
    }

    return { isValid: false, type: 'unknown', confidence: 0 };
  }

  private extractPaymentDetails(ussdCode: string): { phone?: string; amount?: string; code?: string } {
    const match = ussdCode.match(/\*182\*(\d+)\*(\d+)\*(\d+)\*(\d+)#/);
    if (match) {
      return {
        phone: match[3],
        amount: match[4],
        code: ussdCode
      };
    }
    return { code: ussdCode };
  }

  private suggestQRFixes(content: string): string[] {
    const suggestions: string[] = [];
    
    if (content.includes('*') && !content.includes('#')) {
      suggestions.push('Add # at the end of the USSD code');
    }
    
    if (content.includes('#') && !content.includes('*')) {
      suggestions.push('USSD codes should start with *');
    }
    
    if (/\d{9,10}/.test(content) && !content.includes('*182*')) {
      suggestions.push('Try formatting as: *182*1*1*{phone}*{amount}#');
    }
    
    return suggestions;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();
    const processor = new EnhancedPaymentProcessor(supabase);

    let result;
    
    switch (action) {
      case 'generate_qr':
        result = await processor.generatePaymentQR(params as QRGenerationRequest);
        break;
        
      case 'process_scan':
        result = await processor.processQRScan(params.qr_data, params.scanner_phone, params.method);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Enhanced payment processor error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});