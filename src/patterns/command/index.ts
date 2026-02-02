// Core command interfaces and types
export type {
  ICommand,
  ICommandInvoker,
  ICommandResult,
  ICommandMetadata,
  IDomainCheckCommand,
  IRetryConfig
} from './ICommand';

export { CommandStatus } from './ICommand';

// Base command implementation
export { BaseCommand } from './BaseCommand';

// Specific command implementations
export { DomainCheckCommand } from './DomainCheckCommand';
export { BatchDomainCheckCommand } from './BatchDomainCheckCommand';
export type { IBatchDomainCheckResult, IBatchDomainCheckConfig } from './BatchDomainCheckCommand';

// Command execution and management
export { CommandInvoker } from './CommandInvoker';
export type { ICommandStatistics } from './CommandInvoker';

// Command queue for batch processing
export { CommandQueue, CommandPriority } from './CommandQueue';
export type { ICommandQueueConfig, IQueueStatistics } from './CommandQueue';

// Import classes for utility functions
import { DomainCheckCommand } from './DomainCheckCommand';
import { BatchDomainCheckCommand } from './BatchDomainCheckCommand';
import { CommandInvoker } from './CommandInvoker';
import { CommandQueue, CommandPriority } from './CommandQueue';
import type { IRetryConfig } from './ICommand';
import type { IBatchDomainCheckConfig } from './BatchDomainCheckCommand';
import type { ICommandQueueConfig } from './CommandQueue';

// Utility functions for command pattern
export const CommandUtils = {
  /**
   * Create a domain check command with default configuration
   */
  createDomainCheckCommand: (
    domain: string,
    strategy: import('../strategy/IQueryStrategy').IQueryStrategy,
    retryConfig?: Partial<IRetryConfig>
  ) => {
    return new DomainCheckCommand(domain, strategy, retryConfig);
  },

  /**
   * Create a batch domain check command with default configuration
   */
  createBatchDomainCheckCommand: (
    domains: string[],
    strategy: import('../strategy/IQueryStrategy').IQueryStrategy,
    batchConfig?: Partial<IBatchDomainCheckConfig>,
    retryConfig?: Partial<IRetryConfig>
  ) => {
    return new BatchDomainCheckCommand(domains, strategy, batchConfig, retryConfig);
  },

  /**
   * Create a command invoker with default configuration
   */
  createCommandInvoker: (maxHistorySize?: number) => {
    return new CommandInvoker(maxHistorySize);
  },

  /**
   * Create a command queue with default configuration
   */
  createCommandQueue: (config?: Partial<ICommandQueueConfig>) => {
    return new CommandQueue(config);
  },

  /**
   * Default retry configuration for domain checks
   */
  getDefaultRetryConfig: (): IRetryConfig => ({
    maxRetries: 3,
    initialDelayMs: 1000,
    useExponentialBackoff: true,
    maxDelayMs: 30000,
    backoffMultiplier: 2
  }),

  /**
   * Default batch configuration for domain checks
   */
  getDefaultBatchConfig: (): IBatchDomainCheckConfig => ({
    maxConcurrency: 5,
    failFast: false,
    batchDelay: 100,
    batchSize: 10
  }),

  /**
   * Default queue configuration
   */
  getDefaultQueueConfig: (): ICommandQueueConfig => ({
    maxConcurrency: 5,
    maxQueueSize: 100,
    defaultPriority: CommandPriority.NORMAL,
    autoStart: true,
    processingDelay: 100,
    maxAttempts: 3
  })
};