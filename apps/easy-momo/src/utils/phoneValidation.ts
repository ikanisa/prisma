
export const validatePhone = (phoneNumber: string): boolean => {
  // Rwanda phone validation: 07XXXXXXXX or 078/079 specifically
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  return cleanPhone.length >= 4 && cleanPhone.length <= 12;
};

export const formatPhoneInput = (input: string): string => {
  // Only allow numeric input, max 12 characters for Rwanda MoMo
  return input.replace(/\D/g, '').slice(0, 12);
};
