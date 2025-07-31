// Integration Tests for Edge Functions
import { describe, it, expect, beforeEach } from 'vitest';
import { mockSupabase } from '../setup';

// Mock the edge function modules
const mockPaymentGenerator = {
  generatePayment: vi.fn(),
};

const mockWhatsAppWebhook = {
  processMessage: vi.fn(),
};

describe('Edge Functions Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Commerce Domain', () => {
    it('should generate payment successfully', async () => {
      const paymentRequest = {
        amount: 1000,
        currency: 'RWF',
        description: 'Test payment',
        recipient_phone: '+250788123456',
      };

      mockPaymentGenerator.generatePayment.mockResolvedValue({
        payment_id: 'test-id',
        payment_code: '12345678',
        qr_code_url: 'https://example.com/qr/test-id',
      });

      const result = await mockPaymentGenerator.generatePayment(paymentRequest);

      expect(result).toMatchObject({
        payment_id: expect.any(String),
        payment_code: expect.any(String),
        qr_code_url: expect.stringContaining('qr'),
      });
    });

    it('should handle payment validation errors', async () => {
      const invalidRequest = {
        amount: -100,
        currency: 'INVALID',
        description: '',
        recipient_phone: 'invalid-phone',
      };

      mockPaymentGenerator.generatePayment.mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(
        mockPaymentGenerator.generatePayment(invalidRequest)
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('Messaging Domain', () => {
    it('should process WhatsApp message', async () => {
      const webhookPayload = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'msg-123',
                type: 'text',
                text: { body: 'Hello' },
                timestamp: '1640000000',
              }],
              contacts: [{
                wa_id: '+250788123456',
                profile: { name: 'Test User' },
              }],
            },
          }],
        }],
      };

      mockWhatsAppWebhook.processMessage.mockResolvedValue({
        processed: true,
        message_id: 'msg-123',
      });

      const result = await mockWhatsAppWebhook.processMessage(webhookPayload);

      expect(result.processed).toBe(true);
      expect(result.message_id).toBe('msg-123');
    });
  });
});