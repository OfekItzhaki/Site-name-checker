/**
 * Generic command interface for encapsulating operations
 * Supports execution, undo, and retry logic
 */
export interface ICommand<T> {
  /**
   * Execute the command
   * @returns Promise resolving to command result
   */
  execute(): Promise<T>;

  /**
   * Execute the command with automatic retry logic
   * @returns Promise resolving to command result
   */
  executeWithRetry(): Promise<T>;

  /**
   * Undo the command (optional)
   * @returns Promise resolving when undo is complete
   */
  undo?(): Promise<void>;

  /**
   * Check if the command can be retried
   * @returns True if retry is possible
   */
  canRetry(): boolean;

  /**
   * Get current retry count
   * @returns Number of retries attempted
   */
  getRetryCount(): number;

  /**
   * Get unique command identifier
   * @returns Command ID
   */
  getId(): string;

  /**
   * Get command name/type
   * @returns Command name
   */
  getName(): string;

  /**
   * Get command execution status
   * @returns Current command status
   */
  getStatus(): CommandStatus;

  /**
   * Get command metadata
   * @returns Command metadata
   */
  getMetadata(): ICommandMetadata;
}

/**
 * Command execution status
 */
export enum CommandStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Command metadata interface
 */
export interface ICommandMetadata {
  /** When the command was created */
  createdAt: Date;
  /** When the command was last executed */
  lastExecutedAt?: Date | undefined;
  /** When the command was completed */
  completedAt?: Date | undefined;
  /** Execution time in milliseconds */
  executionTime?: number | undefined;
  /** Number of retry attempts */
  retryCount: number;
  /** Maximum allowed retries */
  maxRetries: number;
  /** Command priority */
  priority: number;
}

/**
 * Result of command execution
 */
export interface ICommandResult<T> {
  /** Whether the command succeeded */
  success: boolean;
  /** Result data if successful */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Command that produced this result */
  commandId: string;
  /** Timestamp of result */
  timestamp: Date;
}

/**
 * Interface for command invoker that manages command execution
 */
export interface ICommandInvoker {
  /**
   * Execute a single command
   * @param command - Command to execute
   * @returns Promise resolving to command result
   */
  execute<T>(command: ICommand<T>): Promise<ICommandResult<T>>;

  /**
   * Execute multiple commands in parallel
   * @param commands - Array of commands to execute
   * @returns Promise resolving to array of results
   */
  executeParallel<T>(commands: ICommand<T>[]): Promise<ICommandResult<T>[]>;

  /**
   * Execute multiple commands in sequence
   * @param commands - Array of commands to execute
   * @returns Promise resolving to array of results
   */
  executeSequential<T>(commands: ICommand<T>[]): Promise<ICommandResult<T>[]>;

  /**
   * Cancel a command by ID
   * @param commandId - ID of command to cancel
   * @returns Promise resolving when cancellation is complete
   */
  cancel(commandId: string): Promise<void>;

  /**
   * Get command execution history
   * @returns Array of executed commands with results
   */
  getHistory(): Array<{ command: ICommand<any>; result: ICommandResult<any> }>;

  /**
   * Clear command history
   */
  clearHistory(): void;
}

/**
 * Specific command interface for domain checking operations
 */
export interface IDomainCheckCommand extends ICommand<import('../../models').IDomainResult> {
  /**
   * Get the domain being checked
   * @returns Domain name
   */
  getDomain(): string;

  /**
   * Get the strategy being used
   * @returns Query strategy
   */
  getStrategy(): import('../strategy/IQueryStrategy').IQueryStrategy;

  /**
   * Set retry configuration
   * @param config - Retry configuration
   */
  setRetryConfig(config: IRetryConfig): void;

  /**
   * Get retry configuration
   * @returns Current retry configuration
   */
  getRetryConfig(): IRetryConfig;
}

/**
 * Retry configuration for commands
 */
export interface IRetryConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Initial delay between retries in milliseconds */
  initialDelayMs: number;
  /** Whether to use exponential backoff */
  useExponentialBackoff: boolean;
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
}