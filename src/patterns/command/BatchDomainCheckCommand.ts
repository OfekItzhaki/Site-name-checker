import { BaseCommand } from './BaseCommand';
import { DomainCheckCommand } from './DomainCheckCommand';
import { CommandInvoker } from './CommandInvoker';
import { IRetryConfig } from './ICommand';
import type { IDomainResult } from '../../models';
import type { IQueryStrategy } from '../strategy/IQueryStrategy';

/**
 * Result of batch domain check operation
 */
export interface IBatchDomainCheckResult {
  /** All domain results */
  results: IDomainResult[];
  /** Successfully checked domains */
  successful: IDomainResult[];
  /** Failed domain checks */
  failed: Array<{ domain: string; error: string }>;
  /** Total execution time */
  totalExecutionTime: number;
  /** Number of domains processed */
  totalDomains: number;
  /** Success rate as percentage */
  successRate: number;
}

/**
 * Configuration for batch domain checking
 */
export interface IBatchDomainCheckConfig {
  /** Maximum number of concurrent domain checks */
  maxConcurrency: number;
  /** Whether to fail fast on first error */
  failFast: boolean;
  /** Delay between batches in milliseconds */
  batchDelay: number;
  /** Size of each batch */
  batchSize: number;
}

/**
 * Batch command for checking multiple domains concurrently
 * Provides efficient processing of multiple domain availability checks
 */
export class BatchDomainCheckCommand extends BaseCommand<IBatchDomainCheckResult> {
  private readonly domains: string[];
  private readonly strategy: IQueryStrategy;
  private readonly config: IBatchDomainCheckConfig;
  private invoker: CommandInvoker;

  constructor(
    domains: string[],
    strategy: IQueryStrategy,
    config: Partial<IBatchDomainCheckConfig> = {},
    retryConfig: Partial<IRetryConfig> = {},
    priority: number = 0
  ) {
    super(`BatchDomainCheck:${domains.length}domains`, retryConfig, priority);
    
    this.domains = [...domains]; // Create a copy
    this.strategy = strategy;
    this.config = {
      maxConcurrency: config.maxConcurrency ?? 5,
      failFast: config.failFast ?? false,
      batchDelay: config.batchDelay ?? 100,
      batchSize: config.batchSize ?? 10
    };
    
    this.invoker = new CommandInvoker();
  }

  /**
   * Execute batch domain checking
   */
  protected async executeInternal(): Promise<IBatchDomainCheckResult> {
    if (this.domains.length === 0) {
      return this.createEmptyResult();
    }

    const startTime = Date.now();
    const results: IDomainResult[] = [];
    const failed: Array<{ domain: string; error: string }> = [];

    try {
      if (this.config.batchSize >= this.domains.length) {
        // Process all domains in a single batch
        const batchResult = await this.processBatch(this.domains);
        results.push(...batchResult.successful);
        failed.push(...batchResult.failed);
      } else {
        // Process domains in multiple batches
        for (let i = 0; i < this.domains.length; i += this.config.batchSize) {
          const batch = this.domains.slice(i, i + this.config.batchSize);
          const batchResult = await this.processBatch(batch);
          
          results.push(...batchResult.successful);
          failed.push(...batchResult.failed);
          
          // Check if we should fail fast
          if (this.config.failFast && batchResult.failed.length > 0) {
            throw new Error(`Batch processing failed fast. First error: ${batchResult.failed[0]?.error || 'Unknown error'}`);
          }
          
          // Add delay between batches if specified
          if (this.config.batchDelay > 0 && i + this.config.batchSize < this.domains.length) {
            await this.sleepBatch(this.config.batchDelay);
          }
        }
      }

      const totalExecutionTime = Date.now() - startTime;
      
      return {
        results: [...results, ...this.createErrorResults(failed)],
        successful: results,
        failed,
        totalExecutionTime,
        totalDomains: this.domains.length,
        successRate: this.domains.length > 0 ? (results.length / this.domains.length) * 100 : 0
      };
    } catch (error) {
      // If we fail fast or have a critical error, still return partial results
      const totalExecutionTime = Date.now() - startTime;
      
      return {
        results: [...results, ...this.createErrorResults(failed)],
        successful: results,
        failed,
        totalExecutionTime,
        totalDomains: this.domains.length,
        successRate: this.domains.length > 0 ? (results.length / this.domains.length) * 100 : 0
      };
    }
  }

  /**
   * Process a batch of domains
   */
  private async processBatch(domains: string[]): Promise<{
    successful: IDomainResult[];
    failed: Array<{ domain: string; error: string }>;
  }> {
    // Create commands for each domain
    const commands = domains.map(domain => 
      new DomainCheckCommand(domain, this.strategy, this.getRetryConfig())
    );

    // Execute commands with controlled concurrency
    const results = await this.invoker.executeBatch(commands, this.config.maxConcurrency);
    
    const successful: IDomainResult[] = [];
    const failed: Array<{ domain: string; error: string }> = [];

    results.forEach((result, index) => {
      if (result.success && result.data) {
        successful.push(result.data);
      } else {
        failed.push({
          domain: domains[index] || 'unknown',
          error: result.error || 'Unknown error'
        });
      }
    });

    return { successful, failed };
  }

  /**
   * Create error results for failed domains
   */
  private createErrorResults(failed: Array<{ domain: string; error: string }>): IDomainResult[] {
    return failed.map(({ domain, error }) => {
      const [baseDomain, tld] = this.parseDomain(domain);
      
      return {
        domain,
        baseDomain,
        tld,
        status: 'ERROR' as any, // Using AvailabilityStatus.ERROR
        lastChecked: new Date(),
        checkMethod: this.strategy.getName() as any,
        error,
        retryCount: this.getRetryCount(),
        executionTime: 0
      };
    });
  }

  /**
   * Parse domain into base domain and TLD
   */
  private parseDomain(domain: string): [string, string] {
    const lastDotIndex = domain.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return [domain, ''];
    }
    
    return [
      domain.substring(0, lastDotIndex),
      domain.substring(lastDotIndex)
    ];
  }

  /**
   * Create empty result for edge cases
   */
  private createEmptyResult(): IBatchDomainCheckResult {
    return {
      results: [],
      successful: [],
      failed: [],
      totalExecutionTime: 0,
      totalDomains: 0,
      successRate: 0
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleepBatch(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get domains being checked
   */
  getDomains(): string[] {
    return [...this.domains];
  }

  /**
   * Get strategy being used
   */
  getStrategy(): IQueryStrategy {
    return this.strategy;
  }

  /**
   * Get batch configuration
   */
  getBatchConfig(): IBatchDomainCheckConfig {
    return { ...this.config };
  }

  /**
   * Update batch configuration
   */
  updateBatchConfig(config: Partial<IBatchDomainCheckConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Validate batch command before execution
   */
  validate(): boolean {
    if (this.domains.length === 0) {
      throw new Error('No domains provided for batch checking');
    }

    if (!this.strategy) {
      throw new Error('Query strategy is required');
    }

    // Validate each domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
    const invalidDomains = this.domains.filter(domain => !domainRegex.test(domain));
    
    if (invalidDomains.length > 0) {
      throw new Error(`Invalid domain formats: ${invalidDomains.join(', ')}`);
    }

    return true;
  }

  /**
   * Execute with validation
   */
  async executeWithValidation(): Promise<IBatchDomainCheckResult> {
    this.validate();
    return await this.executeWithRetry();
  }

  /**
   * Get command description for logging/debugging
   */
  getDescription(): string {
    return `Batch check availability of ${this.domains.length} domains using ${this.strategy.getName()} strategy`;
  }
}