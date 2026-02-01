/**
 * Interface for query services created by the factory
 */
export interface IQueryService {
  /**
   * Check domain availability
   * @param domain - Full domain name to check
   * @returns Promise resolving to domain result
   */
  checkDomain(domain: string): Promise<import('../../models').IDomainResult>;

  /**
   * Get the type of this service
   * @returns Service type identifier
   */
  getServiceType(): 'DNS' | 'WHOIS' | 'HYBRID';

  /**
   * Get service configuration
   * @returns Current service configuration
   */
  getConfig(): IServiceConfig;

  /**
   * Set service configuration
   * @param config - New configuration to apply
   */
  setConfig(config: Partial<IServiceConfig>): void;
}

/**
 * Configuration for query services
 */
export interface IServiceConfig {
  /** Timeout in milliseconds for queries */
  timeoutMs: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelayMs: number;
  /** Whether to use exponential backoff for retries */
  useExponentialBackoff: boolean;
}

/**
 * Interface for Service Factory implementation
 * Creates appropriate query services based on requirements
 */
export interface IServiceFactory {
  /**
   * Create a DNS lookup service
   * @param config - Optional service configuration
   * @returns DNS query service instance
   */
  createDNSService(config?: Partial<IServiceConfig>): IQueryService;

  /**
   * Create a WHOIS query service
   * @param config - Optional service configuration
   * @returns WHOIS query service instance
   */
  createWHOISService(config?: Partial<IServiceConfig>): IQueryService;

  /**
   * Create a hybrid service (DNS + WHOIS)
   * @param config - Optional service configuration
   * @returns Hybrid query service instance
   */
  createHybridService(config?: Partial<IServiceConfig>): IQueryService;

  /**
   * Get service by type
   * @param type - Service type to create
   * @param config - Optional service configuration
   * @returns Query service instance
   */
  getServiceByType(type: 'DNS' | 'WHOIS' | 'HYBRID', config?: Partial<IServiceConfig>): IQueryService;

  /**
   * Configure default settings for all services
   * @param config - Default configuration to apply
   */
  setDefaultConfig(config: Partial<IServiceConfig>): void;

  /**
   * Get current default configuration
   * @returns Current default service configuration
   */
  getDefaultConfig(): IServiceConfig;
}