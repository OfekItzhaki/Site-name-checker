import { ICommand, ICommandMetadata, CommandStatus, IRetryConfig } from './ICommand';
import { randomUUID } from 'crypto';

/**
 * Abstract base class for commands providing common functionality
 * Implements retry logic, status tracking, and metadata management
 */
export abstract class BaseCommand<T> implements ICommand<T> {
  private readonly id: string;
  private readonly name: string;
  private status: CommandStatus = CommandStatus.PENDING;
  private metadata: ICommandMetadata;
  private retryConfig: IRetryConfig;

  constructor(
    name: string,
    retryConfig: Partial<IRetryConfig> = {},
    priority: number = 0
  ) {
    this.id = randomUUID();
    this.name = name;
    this.metadata = {
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: retryConfig.maxRetries ?? 3,
      priority
    };
    this.retryConfig = {
      maxRetries: retryConfig.maxRetries ?? 3,
      initialDelayMs: retryConfig.initialDelayMs ?? 1000,
      useExponentialBackoff: retryConfig.useExponentialBackoff ?? true,
      maxDelayMs: retryConfig.maxDelayMs ?? 30000,
      backoffMultiplier: retryConfig.backoffMultiplier ?? 2
    };
  }

  /**
   * Execute the command with retry logic
   */
  async execute(): Promise<T> {
    this.status = CommandStatus.EXECUTING;
    this.metadata.lastExecutedAt = new Date();
    
    const startTime = Date.now();
    
    try {
      const result = await this.executeInternal();
      
      this.status = CommandStatus.COMPLETED;
      this.metadata.completedAt = new Date();
      this.metadata.executionTime = Date.now() - startTime;
      
      return result;
    } catch (error) {
      this.status = CommandStatus.FAILED;
      this.metadata.executionTime = Date.now() - startTime;
      
      // If we can retry, increment retry count and throw for retry handling
      if (this.canRetry()) {
        this.metadata.retryCount++;
        throw error;
      }
      
      // No more retries available
      throw error;
    }
  }

  /**
   * Execute the command with automatic retry logic
   */
  async executeWithRetry(): Promise<T> {
    let lastError: Error | null = null;
    let attempts = 0;
    
    while (attempts <= this.metadata.maxRetries) {
      try {
        const result = await this.execute();
        return result;
      } catch (error) {
        lastError = error as Error;
        attempts++;
        this.metadata.retryCount = attempts - 1; // Track actual retries (not including initial attempt)
        
        if (attempts > this.metadata.maxRetries) {
          break;
        }
        
        // Calculate delay for next retry
        const delay = this.calculateRetryDelay();
        await this.sleep(delay);
        
        // Reset status for retry
        this.status = CommandStatus.PENDING;
      }
    }
    
    throw lastError || new Error('Command execution failed');
  }

  /**
   * Abstract method that subclasses must implement
   */
  protected abstract executeInternal(): Promise<T>;

  /**
   * Optional undo implementation - subclasses can override
   */
  async undo(): Promise<void> {
    // Default implementation does nothing
    // Subclasses can override to provide undo functionality
  }

  /**
   * Check if the command can be retried
   */
  canRetry(): boolean {
    return this.metadata.retryCount < this.metadata.maxRetries &&
           this.status !== CommandStatus.COMPLETED &&
           this.status !== CommandStatus.CANCELLED;
  }

  /**
   * Get current retry count
   */
  getRetryCount(): number {
    return this.metadata.retryCount;
  }

  /**
   * Get unique command identifier
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get command name/type
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get command execution status
   */
  getStatus(): CommandStatus {
    return this.status;
  }

  /**
   * Get command metadata
   */
  getMetadata(): ICommandMetadata {
    return { ...this.metadata };
  }

  /**
   * Set command status (protected for internal use)
   */
  protected setStatus(status: CommandStatus): void {
    this.status = status;
  }

  /**
   * Update retry configuration
   */
  setRetryConfig(config: Partial<IRetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    this.metadata.maxRetries = this.retryConfig.maxRetries;
  }

  /**
   * Get retry configuration
   */
  getRetryConfig(): IRetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Calculate delay for next retry attempt
   */
  private calculateRetryDelay(): number {
    if (!this.retryConfig.useExponentialBackoff) {
      return this.retryConfig.initialDelayMs;
    }

    const exponentialDelay = this.retryConfig.initialDelayMs * 
      Math.pow(this.retryConfig.backoffMultiplier, this.metadata.retryCount);
    
    return Math.min(exponentialDelay, this.retryConfig.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel the command
   */
  cancel(): void {
    if (this.status === CommandStatus.PENDING || this.status === CommandStatus.EXECUTING) {
      this.status = CommandStatus.CANCELLED;
    }
  }

  /**
   * Reset command to initial state for re-execution
   */
  reset(): void {
    this.status = CommandStatus.PENDING;
    this.metadata.retryCount = 0;
    this.metadata.lastExecutedAt = undefined;
    this.metadata.completedAt = undefined;
    this.metadata.executionTime = undefined;
  }
}