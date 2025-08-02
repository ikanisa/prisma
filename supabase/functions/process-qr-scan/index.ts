import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QRScanRequest {
  qrData: string
  scannerPhone: string
  method: 'camera' | 'ai' | 'manual' | 'enhanced'
  confidence: number
  lightingCondition?: string
  torchUsed?: boolean
  processingTime?: number
}

interface USSDDetails {
  phone?: string
  amount?: string
  code?: string
  ussdCode?: string
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { qrData, scannerPhone, method, confidence, lightingCondition, torchUsed, processingTime }: QRScanRequest = await req.json()

    console.log('Processing QR scan:', { qrData, scannerPhone, method, confidence })

    // Validate QR content
    const validationResult = validateQRContent(qrData)
    
    // Log scan transaction
    const { data: transaction, error: transactionError } = await supabase
      .rpc('log_qr_scan_transaction', {
        p_scanned_code: qrData,
        p_scanner_phone: scannerPhone,
        p_scan_method: method,
        p_confidence_score: confidence,
        p_lighting_condition: lightingCondition || 'unknown',
        p_torch_used: torchUsed || false,
        p_processing_time: processingTime || 0
      })

    if (transactionError) {
      console.error('Failed to log scan transaction:', transactionError)
    }

    // Process different QR types
    let response = { success: false, message: 'Unknown QR format' }

    if (validationResult.isValid) {
      switch (validationResult.type) {
        case 'ussd':
        case 'payment':
          response = await processPaymentQR(supabase, qrData, validationResult.extractedData!, scannerPhone)
          break
        case 'url':
          response = await processURLQR(qrData)
          break
        default:
          response = { success: true, message: 'QR scanned successfully', data: qrData }
      }
    } else {
      // Try AI enhancement for unclear QR codes
      response = await enhanceAndRetryQR(qrData, validationResult.errors || [])
    }

    return new Response(
      JSON.stringify({
        success: response.success,
        message: response.message,
        data: response.data || null,
        validation: validationResult,
        transactionId: transaction?.transaction_id || null
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.success ? 200 : 400
      }
    )

  } catch (error) {
    console.error('QR scan processing error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

function validateQRContent(content: string) {
  const trimmedContent = content.trim()
  
  // USSD validation
  if (/\*182\*\d+\*\d+\*\d+\*\d+#/.test(trimmedContent)) {
    const details = extractPaymentDetails(trimmedContent)
    return {
      isValid: true,
      type: 'ussd',
      confidence: 0.95,
      extractedData: { ...details, ussdCode: trimmedContent }
    }
  }

  // Simplified USSD pattern
  if (/\*182\*\d+\*\d+#/.test(trimmedContent)) {
    return {
      isValid: true,
      type: 'payment',
      confidence: 0.8,
      extractedData: { ussdCode: trimmedContent }
    }
  }

  // URL pattern
  if (trimmedContent.startsWith('http') || trimmedContent.includes('://')) {
    return {
      isValid: true,
      type: 'url',
      confidence: 0.7,
      extractedData: { ussdCode: trimmedContent }
    }
  }

  // Numeric codes
  if (/^\d{4,8}$/.test(trimmedContent)) {
    return {
      isValid: true,
      type: 'payment',
      confidence: 0.6,
      extractedData: { code: trimmedContent }
    }
  }

  return {
    isValid: false,
    type: 'unknown',
    confidence: 0,
    errors: ['Content does not match any known payment format']
  }
}

function extractPaymentDetails(ussdCode: string): USSDDetails {
  const match = ussdCode.match(/\*182\*(\d+)\*(\d+)\*(\d+)\*(\d+)#/)
  if (match) {
    return {
      phone: match[3],
      amount: match[4],
      ussdCode: ussdCode
    }
  }
  return { ussdCode }
}

async function processPaymentQR(supabase: any, qrData: string, extractedData: USSDDetails, scannerPhone: string) {
  try {
    // Check if this is a payment request or payment generation
    if (extractedData.amount && extractedData.phone) {
      // This is a payment request - initiate payment flow
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          amount: parseInt(extractedData.amount),
          phone: extractedData.phone,
          scanner_phone: scannerPhone,
          ussd_code: qrData,
          status: 'pending',
          qr_scan_method: 'camera'
        })
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        message: `Payment of ${extractedData.amount} RWF to ${extractedData.phone} initiated`,
        data: {
          paymentId: payment.id,
          amount: extractedData.amount,
          phone: extractedData.phone,
          ussdCode: qrData,
          telUri: `tel:${encodeURIComponent(qrData)}`
        }
      }
    } else {
      // Generic USSD code
      return {
        success: true,
        message: 'USSD code detected',
        data: {
          ussdCode: qrData,
          telUri: `tel:${encodeURIComponent(qrData)}`
        }
      }
    }
  } catch (error) {
    console.error('Payment processing error:', error)
    return {
      success: false,
      message: 'Failed to process payment QR',
      data: null
    }
  }
}

async function processURLQR(qrData: string) {
  return {
    success: true,
    message: 'URL detected in QR code',
    data: {
      url: qrData,
      type: 'url'
    }
  }
}

async function enhanceAndRetryQR(qrData: string, errors: string[]) {
  // Try to fix common USSD format issues
  let enhanced = qrData.trim()
  
  // Add missing # at end
  if (enhanced.includes('*') && !enhanced.endsWith('#')) {
    enhanced += '#'
  }
  
  // Add missing * at start for USSD
  if (/^\d/.test(enhanced) && enhanced.includes('#')) {
    enhanced = '*' + enhanced
  }
  
  // Retry validation with enhanced content
  const revalidation = validateQRContent(enhanced)
  
  if (revalidation.isValid) {
    return {
      success: true,
      message: 'QR code enhanced and validated',
      data: {
        original: qrData,
        enhanced: enhanced,
        ussdCode: enhanced
      }
    }
  }
  
  return {
    success: false,
    message: 'Could not validate QR content',
    data: {
      original: qrData,
      errors: errors,
      suggestions: suggestQRFixes(qrData)
    }
  }
}

function suggestQRFixes(content: string): string[] {
  const suggestions: string[] = []
  
  if (content.includes('*') && !content.includes('#')) {
    suggestions.push('Add # at the end of the USSD code')
  }
  
  if (content.includes('#') && !content.includes('*')) {
    suggestions.push('USSD codes should start with *')
  }
  
  if (/\d{9,10}/.test(content) && !content.includes('*182*')) {
    suggestions.push('Try formatting as: *182*1*1*{phone}*{amount}#')
  }
  
  return suggestions
}