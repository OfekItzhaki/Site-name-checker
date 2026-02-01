/**
 * Interface representing an error that occurred during domain query
 */
export interface IQueryError {
  /** Domain name that failed to be checked */
  domain: string;
  /** Type of error that occurred */
  errorType: 'NETWORK' | 'TIMEOUT' | 'RATE_LIMIT' | 'INVALID_RESPONSE';
  /** Human-readable error message */
  message: string;
  /** Whether this error condition can be retried */
  retryable: boolean;
  /** Timestamp when the error occurred */
  timestamp: Date;
}