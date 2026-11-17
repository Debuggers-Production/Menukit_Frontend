/**
 * Utility functions for phone number normalization and formatting with country code.
 */

export const formatPhoneWithCountryCode = (phone?: string): string => {
  if (!phone) return '';
  const trimmed = phone.trim();

  // If already starts with '+', remove all whitespace and non-digit chars after '+'
  if (trimmed.startsWith('+')) {
    const digitsOnly = trimmed.slice(1).replace(/\D/g, '');
    return digitsOnly ? `+${digitsOnly}` : trimmed;
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return '';

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return `+91${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }

  return `+${digitsOnly}`;
};

export const normalizePhoneWithCountryCode = (phone?: string, defaultCode = '+91'): string => {
  if (!phone) return '';
  const trimmed = phone.trim();
  const prefix = defaultCode.startsWith('+') ? defaultCode : `+${defaultCode}`;

  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;

  if (digits.length === 10) {
    return `${prefix}${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${prefix}${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.length > 10) {
    return `+${digits}`;
  }

  return `${prefix}${digits}`;
};
