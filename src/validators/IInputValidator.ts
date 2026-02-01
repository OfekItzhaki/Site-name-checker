import type { IValidationResult } from '../controllers/IDomainController';

/**
 * Interface for input validation services
 * Provides domain name validation according to RFC standards
 */
export interface IInputValidator {
  /**
   * Validate a domain name input
   * @param domain - Domain name to validate
   * @returns Validation result with error details if invalid
   */
  validateDomainName(domain: string): IValidationResult;

  /**
   * Sanitize and normalize domain input
   * @param input - Raw user input
   * @returns Cleaned and normalized input
   */
  sanitizeInput(input: string): string;

  /**
   * Check if domain length is valid (1-63 characters)
   * @param domain - Domain name to check
   * @returns True if length is valid
   */
  isValidLength(domain: string): boolean;

  /**
   * Check if domain contains only valid characters
   * @param domain - Domain name to check
   * @returns True if characters are valid
   */
  hasValidCharacters(domain: string): boolean;

  /**
   * Check if domain format is valid (no leading/trailing hyphens)
   * @param domain - Domain name to check
   * @returns True if format is valid
   */
  hasValidFormat(domain: string): boolean;
}