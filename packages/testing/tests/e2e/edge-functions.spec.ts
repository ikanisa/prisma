// E2E Tests for Edge Functions
import { test, expect } from '@playwright/test';

test.describe('Edge Functions', () => {
  test('should handle payment generation', async ({ request }) => {
    const response = await request.post('/functions/v1/payment-generator', {
      data: {
        amount: 1000,
        currency: 'RWF',
        description: 'Test payment',
        recipient_phone: '+250788123456'
      }
    });

    expect(response.status()).toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('payment_id');
    expect(result.data).toHaveProperty('payment_code');
  });

  test('should handle whatsapp webhook verification', async ({ request }) => {
    const response = await request.get('/functions/v1/whatsapp-webhook', {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test-token',
        'hub.challenge': 'test-challenge'
      }
    });

    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toBe('test-challenge');
  });

  test('should process whatsapp message', async ({ request }) => {
    const webhookPayload = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              id: 'msg-123',
              type: 'text',
              text: { body: 'Hello' },
              timestamp: '1640000000'
            }],
            contacts: [{
              wa_id: '+250788123456',
              profile: { name: 'Test User' }
            }]
          }
        }]
      }]
    };

    const response = await request.post('/functions/v1/whatsapp-webhook', {
      data: webhookPayload
    });

    expect(response.status()).toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.processed).toBe(true);
  });

  test('should run code review', async ({ request }) => {
    const response = await request.post('/functions/v1/code-reviewer', {
      data: {
        action: 'full_review',
        files: []
      },
      headers: {
        'Authorization': 'Bearer test-admin-token'
      }
    });

    expect(response.status()).toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('ai_responses');
    expect(result.data).toHaveProperty('consolidated_issues');
  });
});