
export const ValidationUtils = {
  // Rwandan phone number: must start with 07 or +2507, 10 digits (or 13 if with +250)
  validateRWPhoneNumber: (phone: string): { isValid: boolean; error?: string } => {
    const cleaned = phone.replace(/\D/g, '');

    if (!cleaned) {
      return { isValid: false, error: 'Numero ya telefone irakenewe' };
    }
    // local: 07XXXXXXXX  or intl: +2507XXXXXXXX
    if (cleaned.length === 10 && cleaned.startsWith('07')) {
      return { isValid: true };
    }
    if (cleaned.length === 12 && cleaned.startsWith('2507')) {
      return { isValid: true };
    }
    if (cleaned.length === 13 && cleaned.startsWith('2507')) {
      return { isValid: true };
    }
    return { isValid: false, error: 'Andika numero nyayo ya telefone y’u Rwanda (07XX... cyangwa +2507...)' };
  },

  validateAmount: (amount: string): { isValid: boolean; error?: string } => {
    const cleaned = amount.replace(/,/g, '');
    const numAmount = parseFloat(cleaned);

    if (!cleaned || isNaN(numAmount)) {
      return { isValid: false, error: 'Andika amafaranga yemewe' };
    }

    if (numAmount <= 0) {
      return { isValid: false, error: 'Amafaranga agomba kurenga zero' };
    }

    if (numAmount > 10000000) { // 10M RWF limit
      return { isValid: false, error: 'Amafaranga arenze atemewe (10,000,000 RWF)' };
    }

    return { isValid: true };
  },

  sanitizeInput: (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  }
};
