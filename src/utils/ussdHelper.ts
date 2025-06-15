
// Utility functions for USSD code handling
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
  // Validate USSD format: *182*1*1*{phone}*{amount}#
  const ussdPattern = /^\*182\*1\*1\*\d+\*\d+#$/;
  return ussdPattern.test(ussdCode);
};
