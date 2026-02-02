/**
 * Supported top-level domains for domain availability checking
 */
export const SUPPORTED_TLDS = ['.com', '.net', '.org', '.ai', '.dev', '.io', '.co'] as const;

/**
 * Type representing a supported TLD
 */
export type SupportedTLD = typeof SUPPORTED_TLDS[number];

/**
 * Type representing the method used to check domain availability
 */
export type CheckMethod = 'DNS' | 'WHOIS' | 'HYBRID';

/**
 * Type representing the possible error types during domain queries
 */
export type QueryErrorType = 'NETWORK' | 'TIMEOUT' | 'RATE_LIMIT' | 'INVALID_RESPONSE';

/**
 * Configuration options for domain queries
 */
export interface IQueryConfig {
  /** Timeout in milliseconds for individual queries */
  timeoutMs: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Delay between retry attempts in milliseconds */
  retryDelayMs: number;
  /** Whether to use DNS lookup as primary method */
  useDNSFirst: boolean;
  /** Whether to fallback to WHOIS if DNS fails */
  fallbackToWHOIS: boolean;
}