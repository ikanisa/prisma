// Payment tool to generate QR or USSD codes
export class PaymentTool {
  static async generateQRCode(sessionId: string, data: any) {
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
        },
        body: JSON.stringify({ sessionId, ...data }),
      }
    );
    const result = await response.json();
    return { qrCodeUrl: result.qr_code_url, ussd: result.ussd_code };
  }
