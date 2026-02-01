import type { IDomainResult } from '../models';
import type { ApplicationStateType } from '../patterns/state/IApplicationState';

/**
 * Interface for UI callbacks from the domain controller
 * Provides strict separation between UI and business logic
 */
export interface IUICallbacks {
  /**
   * Called when input validation fails
   * @param message - Validation error message
   */
  onValidationError(message: string): void;

  /**
   * Called when domain availability check starts
   * @param domains - Array of domains being checked
   */
  onCheckStarted(domains: string[]): void;

  /**
   * Called when a single domain result is updated
   * @param result - Updated domain result
   */
  onResultUpdate(result: IDomainResult): void;

  /**
   * Called when all domain checks are completed
   * @param results - Array of all domain results
   */
  onCheckCompleted(results: IDomainResult[]): void;

  /**
   * Called when an error occurs during processing
   * @param error - Error message
   */
  onError(error: string): void;

  /**
   * Called when application state changes
   * @param newState - New application state
   * @param oldState - Previous application state
   */
  onStateChange(newState: ApplicationStateType, oldState: ApplicationStateType): void;

  /**
   * Called to update progress during bulk operations
   * @param progress - Progress information
   */
  onProgressUpdate(progress: { completed: number; total: number }): void;
}

/**
 * Interface for the main domain controller
 * Orchestrates domain checking workflow and manages application state
 */
export interface IDomainController {
  /**
   * Check domain availability for a base domain across multiple TLDs
   * @param baseDomain - Base domain name to check
   * @returns Promise that resolves when checking is complete
   */
  checkDomainAvailability(baseDomain: string): Promise<void>;

  /**
   * Register UI callback functions for receiving updates
   * @param callbacks - Object containing callback functions
   */
  registerCallbacks(callbacks: IUICallbacks): void;

  /**
   * Get the current application state
   * @returns Current application state type
   */
  getCurrentState(): ApplicationStateType;

  /**
   * Get current domain results
   * @returns Array of current domain results
   */
  getCurrentResults(): IDomainResult[];

  /**
   * Retry failed domain checks
   * @param domain - Optional specific domain to retry, if not provided retries all failed
   * @returns Promise that resolves when retry is complete
   */
  retryFailedChecks(domain?: string): Promise<void>;

  /**
   * Cancel ongoing domain checks
   * @returns Promise that resolves when cancellation is complete
   */
  cancelChecks(): Promise<void>;

  /**
   * Clear all results and reset to initial state
   */
  reset(): void;

  /**
   * Get controller configuration
   * @returns Current controller configuration
   */
  getConfig(): IDomainControllerConfig;

  /**
   * Update controller configuration
   * @param config - Partial configuration updates
   */
  updateConfig(config: Partial<IDomainControllerConfig>): void;

  /**
   * Get supported TLDs
   * @returns Array of supported TLD strings
   */
  getSupportedTLDs(): string[];

  /**
   * Check if controller is currently processing
   * @returns True if processing is in progress
   */
  isProcessing(): boolean;

  /**
   * Get processing statistics
   * @returns Processing statistics
   */
  getStatistics(): IControllerStatistics;
}

/**
 * Configuration interface for domain controller
 */
export interface IDomainControllerConfig {
  /** TLDs to check by default */
  defaultTLDs: string[];
  /** Timeout for individual domain checks in milliseconds */
  checkTimeoutMs: number;
  /** Maximum number of concurrent checks */
  maxConcurrentChecks: number;
  /** Whether to use DNS first strategy */
  useDNSFirst: boolean;
  /** Whether to fallback to WHOIS on DNS failure */
  fallbackToWHOIS: boolean;
  /** Maximum retry attempts for failed checks */
  maxRetries: number;
  /** Delay between retry attempts in milliseconds */
  retryDelayMs: number;
  /** Whether to use exponential backoff for retries */
  useExponentialBackoff: boolean;
}

/**
 * Statistics interface for controller operations
 */
export interface IControllerStatistics {
  /** Total number of domains checked */
  totalDomainsChecked: number;
  /** Number of successful checks */
  successfulChecks: number;
  /** Number of failed checks */
  failedChecks: number;
  /** Average check time in milliseconds */
  averageCheckTime: number;
  /** Total processing time in milliseconds */
  totalProcessingTime: number;
  /** Success rate as percentage */
  successRate: number;
  /** Most recent check timestamp */
  lastCheckAt?: Date;
  /** Number of retries performed */
  totalRetries: number;
}

/**
 * Interface for domain validation results
 */
export interface IValidationResult {
  /** Whether the input is valid */
  isValid: boolean;
  /** Validation error message if invalid */
  errorMessage?: string;
  /** Sanitized/normalized input if valid */
  sanitizedInput?: string;
  /** Specific validation errors */
  errors: IValidationError[];
}

/**
 * Interface for specific validation errors
 */
export interface IValidationError {
  /** Field that failed validation */
  field: string;
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Invalid value that caused the error */
  value: any;
}