import { BaseCommand } from './BaseCommand';
import { IDomainCheckCommand, IRetryConfig } from './ICommand';
import type { IDomainResult } from '../../models';
import type { IQueryStrategy } from '../strategy/IQueryStrategy';

/**
 * Command implementation for domain availability checking
 * Encapsulates domain check operations with built-in retry logic and error handling
 */
export class DomainCheckCommand extends BaseCommand<IDomainResult> implements IDomainCheckCommand {
  private readonly domain: string;
  private readonly strategy: IQueryStrategy;

  constructor(
    domain: string,
    strategy: IQueryStrategy,
    retryConfig: Partial<IRetryConfig> = {},
    priority: number = 0
  ) {
    super(`DomainCheck:${domain}`, retryConfig, priority);
    this.domain = domain;
    this.strategy = strategy;
  }

  /**
   * Execute the domain availability check using the configured strategy
   */
  protected async executeInternal(): Promise<IDomainResult> {
    if (!this.strategy.canHandle(this.domain)) {
      throw new Error(`Strategy ${this.strategy.getName()} cannot handle domain: ${this.domain}`);
    }

    try {
      const result = await this.strategy.execute(this.domain);
      
      // Ensure the result has the correct retry count
      return {
        ...result,
        retryCount: this.getRetryCount()
      };
    } catch (error) {
      // Enhance error with command context
      const enhancedError = new Error(
        `Domain check failed for ${this.domain} using ${this.strategy.getName()}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      
      // Preserve original error stack if available
      if (error instanceof Error && error.stack) {
        enhancedError.stack = error.stack;
      }
      
      throw enhancedError;
    }
  }

  /**
   * Get the domain being checked
   */
  getDomain(): string {
    return this.domain;
  }

  /**
   * Get the strategy being used
   */
  getStrategy(): IQueryStrategy {
    return this.strategy;
  }

  /**
   * Set retry configuration
   */
  override setRetryConfig(config: IRetryConfig): void {
    super.setRetryConfig(config);
  }

  /**
   * Get retry configuration
   */
  override getRetryConfig(): IRetryConfig {
    return super.getRetryConfig();
  }

  /**
   * Create a copy of this command with the same configuration
   * Useful for retrying with a fresh command instance
   */
  clone(): DomainCheckCommand {
    const cloned = new DomainCheckCommand(
      this.domain,
      this.strategy,
      this.getRetryConfig(),
      this.getMetadata().priority
    );
    
    return cloned;
  }

  /**
   * Get command description for logging/debugging
   */
  getDescription(): string {
    return `Check availability of domain '${this.domain}' using ${this.strategy.getName()} strategy`;
  }

  /**
   * Validate command before execution
   */
  validate(): boolean {
    if (!this.domain || this.domain.trim().length === 0) {
      throw new Error('Domain name cannot be empty');
    }

    if (!this.strategy) {
      throw new Error('Query strategy is required');
    }

    // More flexible domain format validation that handles subdomains and complex TLDs
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(this.domain)) {
      throw new Error(`Invalid domain format: ${this.domain}`);
    }

    return true;
  }

  /**
   * Execute with validation
   */
  async executeWithValidation(): Promise<IDomainResult> {
    this.validate();
    return await this.executeWithRetry();
  }
}