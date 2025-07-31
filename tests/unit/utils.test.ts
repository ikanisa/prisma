import { describe, it, expect } from 'vitest';

// Example unit test - replace with actual utility functions
describe('Utility Functions', () => {
  it('should format phone numbers correctly', () => {
    // Example test - implement actual utility functions
    const formatPhone = (phone: string) => {
      return phone.replace(/[^\d+]/g, '');
    };
    
    expect(formatPhone('+250 788 767 816')).toBe('+250788767816');
    expect(formatPhone('0788767816')).toBe('0788767816');
  });
  
  it('should validate message content', () => {
    const validateMessage = (message: string) => {
      return message.trim().length > 0 && message.length <= 1000;
    };
    
    expect(validateMessage('Hello')).toBe(true);
    expect(validateMessage('')).toBe(false);
    expect(validateMessage('a'.repeat(1001))).toBe(false);
  });
});