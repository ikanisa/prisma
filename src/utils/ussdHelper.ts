
// Utility functions for USSD code handling with Rwanda MoMo validation
export const formatUSSDForTel = (ussdCode: string): string => {
  // Convert USSD code to tel: URI format
  // Example: *182*1*1*0789123456*2500# becomes tel:%2A182%2A1%2A1%2A0789123456%2A2500%23
  return `tel:${encodeURIComponent(ussdCode)}`;
};

export const generateUSSDCode = (momoNumber: string, amount: number | string): string => {
  // Ensure exact format: *182*1*1*{phone}*{amount}#
  return `*182*1*1*${momoNumber}*${amount}#`;
};

export const extractUSSDFromQR = (qrData: string): string | null => {
  // Extract USSD code if QR contains one
  const ussdRegex = /\*182\*[0-9\*#]+/;
  const match = qrData.match(ussdRegex);
  return match ? match[0] : null;
};

export const validateUSSDFormat = (ussdCode: string): boolean => {
  // Validate Rwanda MTN MoMo USSD formats
  const phonePaymentPattern = /^\*182\*1\*1\*\d+\*\d+#$/;  // *182*1*1*phone*amount#
  const codePaymentPattern = /^\*182\*8\*1\*\d+\*\d+#$/;   // *182*8*1*code*amount#
  
  return phonePaymentPattern.test(ussdCode) || codePaymentPattern.test(ussdCode);
};

export const validateRwandaPhoneNumber = (phone: string): boolean => {
  // Rwanda MTN numbers: 078XXXXXXX or 079XXXXXXX
  const rwandaPhonePattern = /^07[89]\d{7}$/;
  const cleanPhone = phone.replace(/\D/g, '');
  return rwandaPhonePattern.test(cleanPhone);
};

export const extractPaymentDetails = (ussdCode: string): { phone?: string; code?: string; amount?: string; type: 'phone' | 'code' | 'unknown' } => {
  // Extract payment details from USSD code
  const phoneMatch = ussdCode.match(/^\*182\*1\*1\*(\d+)\*(\d+)#$/);
  const codeMatch = ussdCode.match(/^\*182\*8\*1\*(\d+)\*(\d+)#$/);
  
  if (phoneMatch) {
    return { phone: phoneMatch[1], amount: phoneMatch[2], type: 'phone' };
  } else if (codeMatch) {
    return { code: codeMatch[1], amount: codeMatch[2], type: 'code' };
  }
  
  return { type: 'unknown' };
};
