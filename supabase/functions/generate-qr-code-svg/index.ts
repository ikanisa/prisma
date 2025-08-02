import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QRCodeRequest {
  data: string
  size?: number
  error_correction?: 'L' | 'M' | 'Q' | 'H'
  margin?: number
  dark_color?: string
  light_color?: string
}

Deno.serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { 
      data, 
      size = 256, 
      error_correction = 'M',
      margin = 4,
      dark_color = '000000',
      light_color = 'ffffff'
    }: QRCodeRequest = await req.json()

    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Data is required for QR code generation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Using QR Server API for QR code generation
    const qrApiUrl = new URL('https://api.qrserver.com/v1/create-qr-code/')
    qrApiUrl.searchParams.set('data', data)
    qrApiUrl.searchParams.set('size', `${size}x${size}`)
    qrApiUrl.searchParams.set('format', 'svg')
    qrApiUrl.searchParams.set('ecc', error_correction)
    qrApiUrl.searchParams.set('margin', margin.toString())
    qrApiUrl.searchParams.set('color', dark_color)
    qrApiUrl.searchParams.set('bgcolor', light_color)

    const qrResponse = await fetch(qrApiUrl.toString())

    if (!qrResponse.ok) {
      console.error('QR API error:', qrResponse.status, qrResponse.statusText)
      return new Response(
        JSON.stringify({ error: 'Failed to generate QR code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const svgContent = await qrResponse.text()

    // Enhanced SVG with easyMO branding
    const enhancedSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 80} ${size + 120}">
        <rect width="100%" height="100%" fill="#ffffff"/>
        
        <!-- easyMO Logo/Text -->
        <text x="${(size + 80) / 2}" y="30" text-anchor="middle" 
              fill="#1a365d" font-family="Arial, sans-serif" font-size="16" font-weight="bold">
          easyMO Payment
        </text>
        
        <!-- QR Code -->
        <g transform="translate(40, 50)">
          ${svgContent.replace(/<\?xml[^>]*\?>/g, '').replace(/<svg[^>]*>/g, '').replace(/<\/svg>/g, '')}
        </g>
        
        <!-- Footer Instructions -->
        <text x="${(size + 80) / 2}" y="${size + 90}" text-anchor="middle" 
              fill="#4a5568" font-family="Arial, sans-serif" font-size="12">
          Scan with your mobile money app
        </text>
        <text x="${(size + 80) / 2}" y="${size + 105}" text-anchor="middle" 
              fill="#718096" font-family="Arial, sans-serif" font-size="10">
          Powered by easyMO
        </text>
      </svg>
    `.trim()

    const result = {
      svg: enhancedSvg,
      data_encoded: data,
      size,
      format: 'svg',
      error_correction,
      generated_at: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-qr-code-svg:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})