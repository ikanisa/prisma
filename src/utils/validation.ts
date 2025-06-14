
export const ValidationUtils = {
  validatePhoneNumber: (phone: string): { isValid: boolean; error?: string } => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (!cleaned) {
      return { isValid: false, error: 'Phone number is required' };
    }
    
    if (cleaned.length < 10) {
      return { isValid: false, error: 'Phone number must be at least 10 digits' };
    }
    
    if (cleaned.length > 15) {
      return { isValid: false, error: 'Phone number is too long' };
    }
    
    // Uganda phone number validation (starts with 0 or +256)
    const ugandaPattern = /^(\+?256|0)[7-9]\d{8}$/;
    if (!ugandaPattern.test(cleaned)) {
      return { isValid: false, error: 'Please enter a valid Ugandan phone number' };
    }
    
    return { isValid: true };
  },

  validateAmount: (amount: string): { isValid: boolean; error?: string } => {
    const cleaned = amount.replace(/,/g, '');
    const numAmount = parseFloat(cleaned);
    
    if (!cleaned || isNaN(numAmount)) {
      return { isValid: false, error: 'Please enter a valid amount' };
    }
    
    if (numAmount <= 0) {
      return { isValid: false, error: 'Amount must be greater than 0' };
    }
    
    if (numAmount > 10000000) { // 10M UGX limit
      return { isValid: false, error: 'Amount exceeds maximum limit (10,000,000 UGX)' };
    }
    
    return { isValid: true };
  },

  sanitizeInput: (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  }
};
