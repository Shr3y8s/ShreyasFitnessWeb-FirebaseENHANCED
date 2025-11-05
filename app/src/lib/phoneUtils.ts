import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

/**
 * Phone validation result
 */
export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string;
  e164: string | null;
  errorMessage: string | null;
}

/**
 * Validates and formats a phone number using libphonenumber-js
 * 
 * @param value - The phone number input (any format)
 * @param defaultCountry - The default country code (default: 'US')
 * @returns PhoneValidationResult with validation status and formatted numbers
 */
export function validateAndFormatPhone(
  value: string,
  defaultCountry: CountryCode = 'US'
): PhoneValidationResult {
  // Handle empty input
  if (!value || value.trim() === '') {
    return {
      isValid: true, // Empty is valid (optional field)
      formatted: '',
      e164: null,
      errorMessage: null
    };
  }

  try {
    // Try to parse the phone number
    const phoneNumber = parsePhoneNumber(value, defaultCountry);

    if (!phoneNumber) {
      return {
        isValid: false,
        formatted: value,
        e164: null,
        errorMessage: 'Invalid phone number format'
      };
    }

    // Validate the parsed number
    const valid = phoneNumber.isValid();

    if (!valid) {
      return {
        isValid: false,
        formatted: value,
        e164: null,
        errorMessage: 'Invalid phone number for the specified country'
      };
    }

    // Return validated and formatted number
    return {
      isValid: true,
      formatted: phoneNumber.format('NATIONAL'), // e.g., (425) 246-8712
      e164: phoneNumber.format('E.164'), // e.g., +14252468712
      errorMessage: null
    };
  } catch (error) {
    // Handle parsing errors
    return {
      isValid: false,
      formatted: value,
      e164: null,
      errorMessage: 'Unable to parse phone number'
    };
  }
}

/**
 * Quick validation check (returns boolean only)
 * 
 * @param value - The phone number input
 * @param defaultCountry - The default country code (default: 'US')
 * @returns true if valid or empty, false otherwise
 */
export function isValidPhone(
  value: string,
  defaultCountry: CountryCode = 'US'
): boolean {
  if (!value || value.trim() === '') {
    return true; // Empty is valid (optional field)
  }

  try {
    return isValidPhoneNumber(value, defaultCountry);
  } catch (error) {
    return false;
  }
}

/**
 * Formats a phone number for display (national format)
 * 
 * @param value - The phone number (any format)
 * @param defaultCountry - The default country code (default: 'US')
 * @returns Formatted phone number or original value if invalid
 */
export function formatPhoneForDisplay(
  value: string,
  defaultCountry: CountryCode = 'US'
): string {
  if (!value || value.trim() === '') {
    return '';
  }

  try {
    const phoneNumber = parsePhoneNumber(value, defaultCountry);
    return phoneNumber?.format('NATIONAL') || value;
  } catch (error) {
    return value;
  }
}

/**
 * Formats a phone number for storage (E.164 format)
 * 
 * @param value - The phone number (any format)
 * @param defaultCountry - The default country code (default: 'US')
 * @returns E.164 formatted phone number or null if invalid
 */
export function formatPhoneForStorage(
  value: string,
  defaultCountry: CountryCode = 'US'
): string | null {
  if (!value || value.trim() === '') {
    return null;
  }

  try {
    const phoneNumber = parsePhoneNumber(value, defaultCountry);
    return phoneNumber?.format('E.164') || null;
  } catch (error) {
    return null;
  }
}
