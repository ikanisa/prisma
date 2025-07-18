// Utility functions for sending messages across different channels

// WhatsApp messaging utility
export async function sendWaMessage(to: string, text: string) {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID');
  if (!token || !phoneId) throw new Error('WA creds missing');

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      messaging_product: 'whatsapp', 
      to, 
      type: 'text', 
      text: { body: text } 
    })
  });
  
  if (!res.ok) {
    const error = await res.text();
    console.error('WA send fail', error);
    throw new Error(`WhatsApp send failed: ${error}`);
  }
}

// Telegram messaging utility
export async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!botToken) throw new Error('Telegram bot token missing');

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  });

  if (!res.ok) {
    const error = await res.text();
    console.error('Telegram send fail', error);
    throw new Error(`Telegram send failed: ${error}`);
  }
}

// SMS messaging utility (using Twilio as example)
export async function sendSMSMessage(to: string, text: string) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
  
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio SMS credentials missing');
  }

  const credentials = btoa(`${accountSid}:${authToken}`);
  
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      To: to,
      From: fromNumber,
      Body: text
    })
  });

  if (!res.ok) {
    const error = await res.text();
    console.error('SMS send fail', error);
    throw new Error(`SMS send failed: ${error}`);
  }
}