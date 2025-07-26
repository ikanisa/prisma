/**
 * REFACTOR: Centralized WhatsApp Business API client
 * Replaces scattered WhatsApp integration code
 */

import { validateRequest, WhatsAppWebhookSchema } from './validation.ts';
import type { WhatsAppWebhookPayload, WhatsAppMessage } from './types.ts';

interface WhatsAppSendMessageOptions {
  to: string;
  message: string;
  type?: 'text' | 'interactive';
  buttons?: Array<{
    id: string;
    title: string;
  }>;
  listItems?: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

class WhatsAppClient {
  private accessToken: string;
  private phoneNumberId: string;
  private appSecret: string;
  private baseUrl: string = 'https://graph.facebook.com/v18.0';

  constructor() {
    this.accessToken = Deno.env.get('META_WABA_TOKEN') || '';
    this.phoneNumberId = Deno.env.get('META_WABA_PHONE_ID') || '';
    this.appSecret = Deno.env.get('META_WABA_VERIFY_TOKEN') || '';

    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('Missing required WhatsApp environment variables');
    }
  }

  async sendMessage(options: WhatsAppSendMessageOptions): Promise<void> {
    const { to, message, type = 'text', buttons, listItems } = options;

    let payload: any = {
      messaging_product: 'whatsapp',
      to: to.replace(/[^\d+]/g, ''), // Clean phone number
      type
    };

    if (type === 'text') {
      payload.text = { body: message };
    } else if (type === 'interactive' && buttons) {
      payload.interactive = {
        type: 'button',
        body: { text: message },
        action: {
          buttons: buttons.map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title
            }
          }))
        }
      };
    } else if (type === 'interactive' && listItems) {
      payload.interactive = {
        type: 'list',
        body: { text: message },
        action: {
          button: 'Choose Option',
          sections: [{
            title: 'Options',
            rows: listItems.map(item => ({
              id: item.id,
              title: item.title,
              description: item.description || ''
            }))
          }]
        }
      };
    }

    const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
      throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('WhatsApp message sent:', result);
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.appSecret) {
      console.warn('WHATSAPP_APP_SECRET not configured - skipping signature verification');
      return true; // Allow in development
    }

    try {
      const expectedSignature = 'sha256=' + this.computeSignature(payload, this.appSecret);
      return this.secureCompare(signature, expectedSignature);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  private computeSignature(payload: string, secret: string): string {
    // Use Web Crypto API for HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const algorithm = { name: 'HMAC', hash: 'SHA-256' };
    
    return crypto.subtle.importKey('raw', keyData, algorithm, false, ['sign'])
      .then(key => crypto.subtle.sign('HMAC', key, encoder.encode(payload)))
      .then(signature => Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''));
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  parseWebhookPayload(rawPayload: string): {
    isValid: boolean;
    payload?: WhatsAppWebhookPayload;
    messages?: WhatsAppMessage[];
    error?: string;
  } {
    try {
      const parsed = JSON.parse(rawPayload);
      const validation = validateRequest(WhatsAppWebhookSchema, parsed);
      
      if (!validation.success) {
        return {
          isValid: false,
          error: `Invalid webhook payload: ${validation.errors.message}`
        };
      }

      const payload = validation.data;
      const messages: WhatsAppMessage[] = [];

      // Extract messages from webhook payload
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.value.messages) {
            messages.push(...change.value.messages);
          }
        }
      }

      return {
        isValid: true,
        payload,
        messages
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Failed to parse webhook payload: ${error.message}`
      };
    }
  }

  // Helper methods for common message types
  async sendTextMessage(to: string, message: string): Promise<void> {
    await this.sendMessage({ to, message, type: 'text' });
  }

  async sendButtonMessage(to: string, message: string, buttons: Array<{ id: string; title: string }>): Promise<void> {
    await this.sendMessage({ to, message, type: 'interactive', buttons });
  }

  async sendListMessage(to: string, message: string, listItems: Array<{ id: string; title: string; description?: string }>): Promise<void> {
    await this.sendMessage({ to, message, type: 'interactive', listItems });
  }
}

// Singleton instance
let whatsappClient: WhatsAppClient | null = null;

export function getWhatsAppClient(): WhatsAppClient {
  if (!whatsappClient) {
    whatsappClient = new WhatsAppClient();
  }
  return whatsappClient;
}

export { WhatsAppClient };
export type { WhatsAppSendMessageOptions };