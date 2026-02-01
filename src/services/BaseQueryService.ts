import type { IDomainResult } from '../models/IDomainResult';
import type { IServiceConfig } from '../patterns/factory/IServiceFactory';
import { AvailabilityStatus } from '../models/AvailabilityStatus';

/**
 * Base class for query services providing common functionality
 */
export abstract class BaseQueryService {
  protected config: IServiceConfig;

  constructor(config?: Partial<IServiceConfig>) {
    this.config = {
      timeoutMs: 5000,
      maxRetries: 3,
      retryDelayMs: 1000,
      useExponentialBackoff: true,
      ...config
    };
  }

  /**
   * Get service configuration
   */
  getConfig(): IServiceConfig {
    return { ...this.config };
  }

  /**
   * Set service configuration
   */
  setConfig(config: Partial<IServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Abstract method to check domain availability
   */
  abstract checkDomain(domain: string): Promise<IDomainResult>;

  /**
   * Abstract method to get service type
   */
  abstract getServiceType(): 'DNS' | 'WHOIS' | 'HYBRID';

  /**
   * Parse domain into components
   */
  protected parseDomain(domain: string): { baseDomain: string; tld: string } {
    const lastDotIndex = domain.lastIndexOf('.');
    if (lastDotIndex === -1) {
      throw new Error(`Invalid domain format: ${domain}`);
    }
    
    const baseDomain = domain.substring(0, lastDotIndex);
    const tld = domain.substring(lastDotIndex);
    
    return { baseDomain, tld };
  }

  /**
   * Create a domain result with common fields
   */
  protected createDomainResult(
    domain: string,
    status: AvailabilityStatus,
    checkMethod: 'DNS' | 'WHOIS' | 'HYBRID',
    executionTime?: number,
    error?: string,
    retryCount?: number
  ): IDomainResult {
    const { baseDomain, tld } = this.parseDomain(domain);
    
    const result: IDomainResult = {
      domain,
      baseDomain,
      tld,
      status,
      lastChecked: new Date(),
      checkMethod
    };

    if (executionTime !== undefined) {
      result.executionTime = executionTime;
    }
    if (error !== undefined) {
      result.error = error;
    }
    if (retryCount !== undefined) {
      result.retryCount = retryCount;
    }

    return result;
  }

  /**
   * Execute a query with retry logic
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          const delay = this.config.useExponentialBackoff
            ? this.config.retryDelayMs * Math.pow(2, attempt)
            : this.config.retryDelayMs;
          
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute operation with timeout
   */
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = this.config.timeoutMs
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      )
    ]);
  }
}