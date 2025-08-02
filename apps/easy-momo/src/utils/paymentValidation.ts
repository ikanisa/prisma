
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validatePhone = (phone: string): ValidationResult => {
  if (!phone.trim()) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  const phoneRegex = /^(07[2-9]\d{7})$/;
  if (!phoneRegex.test(phone)) {
    return { isValid: false, error: 'Please enter a valid mobile money number (07XXXXXXXX)' };
  }
  
  return { isValid: true };
};

export const validateCode = (code: string): ValidationResult => {
  if (!code.trim()) {
    return { isValid: false, error: 'Payment code is required' };
  }
  
  const codeRegex = /^\d{4,6}$/;
  if (!codeRegex.test(code)) {
    return { isValid: false, error: 'Please enter a valid payment code (4-6 digits)' };
  }
  
  return { isValid: true };
};

export const validateAmount = (amount: string): ValidationResult => {
  if (!amount.trim()) {
    return { isValid: false, error: 'Amount is required' };
  }
  
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Please enter a valid amount' };
  }
  
  if (numAmount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  
  if (numAmount > 1000000) {
    return { isValid: false, error: 'Amount cannot exceed 1,000,000 RWF' };
  }
  
  if (numAmount < 100) {
    return { isValid: false, error: 'Minimum amount is 100 RWF' };
  }
  
  return { isValid: true };
};

export const validatePaymentInput = (receiver: string, amount: string): ValidationResult => {
  // Try phone validation first
  const phoneValidation = validatePhone(receiver);
  if (phoneValidation.isValid) {
    return validateAmount(amount);
  }
  
  // Try code validation
  const codeValidation = validateCode(receiver);
  if (codeValidation.isValid) {
    return validateAmount(amount);
  }
  
  return { isValid: false, error: 'Please enter a valid phone number or payment code' };
};
