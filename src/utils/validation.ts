// Shared validation utilities for Cloud Functions

/**
 * Validates if a string is a valid email format
 * @param {string} email - The email string to validate
 * @return {boolean} True if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates if a string is a valid phone number format
 * @param {string} phone - The phone number string to validate
 * @return {boolean} True if phone number is valid, false otherwise
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Validates if a number is a valid price (greater than 0)
 * @param {number} price - The price to validate
 * @return {boolean} True if price is valid, false otherwise
 */
export function isValidPrice(price: number): boolean {
  return price > 0;
}

/**
 * Validates if a string meets minimum length requirements
 * @param {string} value - The string to validate
 * @param {number} minLength - Minimum required length (default: 1)
 * @return {boolean} True if string meets requirements, false otherwise
 */
export function isValidString(value: string, minLength = 1): boolean {
  return Boolean(value && value.trim().length >= minLength);
}

/**
 * Validates if a string is a valid date format
 * @param {string} date - The date string to validate
 * @return {boolean} True if date is valid, false otherwise
 */
export function isValidDate(date: string): boolean {
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
}

/**
 * Validates that all required fields are present in the data object
 * @param {Record<string, unknown>} data - The data object to validate
 * @param {string[]} requiredFields - Array of required field names
 * @return {string[]} Array of error messages for missing fields
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): string[] {
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  }

  return errors;
}
