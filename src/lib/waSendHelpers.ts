// WhatsApp send helper functions for different message types

export async function sendInteractive(waId: string, text: string, buttons: Array<{label: string, payload: string}>) {
  console.log(`📤 Sending interactive message to ${waId} with ${buttons.length} buttons`);
  
  const phoneId = process.env.META_WABA_PHONE_ID;
  const token = process.env.META_WABA_TOKEN;
  
  if (!phoneId || !token) {
    console.error('❌ Missing WhatsApp credentials');
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: waId,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text },
            action: {
              buttons: buttons.slice(0, 3).map((btn, index) => ({
                type: 'reply',
                reply: {
                  id: `btn_${index}`,
                  title: btn.label
                }
              }))
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Interactive message send error: ${response.status} - ${errorText}`);
      return;
    }

    console.log('✅ Interactive message sent successfully');
  } catch (error) {
    console.error('❌ Error sending interactive message:', error);
  }
}

export async function sendPlain(waId: string, text: string) {
  console.log(`📤 Sending plain text to ${waId}`);
  
  const phoneId = process.env.META_WABA_PHONE_ID;
  const token = process.env.META_WABA_TOKEN;
  
  if (!phoneId || !token) {
    console.error('❌ Missing WhatsApp credentials');
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: waId,
          type: 'text',
          text: { body: text }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Plain message send error: ${response.status} - ${errorText}`);
      return;
    }

    console.log('✅ Plain message sent successfully');
  } catch (error) {
    console.error('❌ Error sending plain message:', error);
  }
}