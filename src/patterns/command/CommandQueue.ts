import { ICommand, ICommandResult } from './ICommand';
import { CommandInvoker } from './CommandInvoker';

/**
 * Priority levels for command queue
 */
export enum CommandPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Queue entry containing command and metadata
 */
interface IQueueEntry<T> {
  command: ICommand<T>;
  priority: CommandPriority;
  addedAt: Date;
  attempts: number;
  maxAttempts: number;
}

/**
 * Configuration for command queue
 */
export interface ICommandQueueConfig {
  /** Maximum number of concurrent commands */
  maxConcurrency: number;
  /** Maximum queue size */
  maxQueueSize: number;
  /** Default priority for commands */
  defaultPriority: CommandPriority;
  /** Whether to auto-start processing */
  autoStart: boolean;
  /** Delay between processing batches in milliseconds */
  processingDelay: number;
  /** Maximum attempts for failed commands */
  maxAttempts: number;
}

/**
 * Command queue that manages command execution with priority, concurrency control, and batch processing
 */
export class CommandQueue {
  private queue: IQueueEntry<any>[] = [];
  private running: boolean = false;
  private processing: boolean = false;
  private invoker: CommandInvoker;
  private config: ICommandQueueConfig;
  private activeCommands: Set<string> = new Set();
  private completedCommands: Map<string, ICommandResult<any>> = new Map();
  private failedCommands: Map<string, { command: ICommand<any>; error: string; attempts: number }> = new Map();

  constructor(config: Partial<ICommandQueueConfig> = {}) {
    this.config = {
      maxConcurrency: config.maxConcurrency ?? 5,
      maxQueueSize: config.maxQueueSize ?? 100,
      defaultPriority: config.defaultPriority ?? CommandPriority.NORMAL,
      autoStart: config.autoStart ?? true,
      processingDelay: config.processingDelay ?? 100,
      maxAttempts: config.maxAttempts ?? 3
    };
    
    this.invoker = new CommandInvoker();
    
    if (this.config.autoStart) {
      this.start();
    }
  }

  /**
   * Add a command to the queue
   */
  enqueue<T>(
    command: ICommand<T>, 
    priority: CommandPriority = this.config.defaultPriority,
    maxAttempts: number = this.config.maxAttempts
  ): boolean {
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error(`Queue is full. Maximum size: ${this.config.maxQueueSize}`);
    }

    const entry: IQueueEntry<T> = {
      command,
      priority,
      addedAt: new Date(),
      attempts: 0,
      maxAttempts
    };

    // Insert command in priority order (higher priority first)
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i]!.priority < priority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, entry);
    return true;
  }

  /**
   * Add multiple commands to the queue
   */
  enqueueBatch<T>(
    commands: ICommand<T>[], 
    priority: CommandPriority = this.config.defaultPriority,
    maxAttempts: number = this.config.maxAttempts
  ): number {
    let added = 0;
    
    for (const command of commands) {
      try {
        if (this.enqueue(command, priority, maxAttempts)) {
          added++;
        }
      } catch (error) {
        // Stop adding if queue is full
        break;
      }
    }
    
    return added;
  }

  /**
   * Start processing the queue
   */
  start(): void {
    if (this.running) {
      return;
    }
    
    this.running = true;
    this.processQueue();
  }

  /**
   * Stop processing the queue
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Pause processing (can be resumed)
   */
  pause(): void {
    this.processing = false;
  }

  /**
   * Resume processing
   */
  resume(): void {
    if (this.running && !this.processing) {
      this.processQueue();
    }
  }

  /**
   * Clear all commands from the queue
   */
  clear(): void {
    this.queue = [];
    this.completedCommands.clear();
    this.failedCommands.clear();
  }

  /**
   * Get queue statistics
   */
  getStatistics(): IQueueStatistics {
    const priorityBreakdown = new Map<CommandPriority, number>();
    this.queue.forEach(entry => {
      priorityBreakdown.set(entry.priority, (priorityBreakdown.get(entry.priority) || 0) + 1);
    });

    return {
      queueSize: this.queue.length,
      activeCommands: this.activeCommands.size,
      completedCommands: this.completedCommands.size,
      failedCommands: this.failedCommands.size,
      isRunning: this.running,
      isProcessing: this.processing,
      maxConcurrency: this.config.maxConcurrency,
      priorityBreakdown: Object.fromEntries(priorityBreakdown),
      oldestCommandAge: this.getOldestCommandAge()
    };
  }

  /**
   * Get completed command results
   */
  getCompletedResults(): Map<string, ICommandResult<any>> {
    return new Map(this.completedCommands);
  }

  /**
   * Get failed commands
   */
  getFailedCommands(): Map<string, { command: ICommand<any>; error: string; attempts: number }> {
    return new Map(this.failedCommands);
  }

  /**
   * Retry all failed commands
   */
  retryFailedCommands(): number {
    let retried = 0;
    
    for (const [commandId, failedEntry] of this.failedCommands) {
      if (failedEntry.attempts < this.config.maxAttempts) {
        // Reset command and re-queue
        if (typeof (failedEntry.command as any).reset === 'function') {
          (failedEntry.command as any).reset();
        }
        
        this.enqueue(failedEntry.command, CommandPriority.HIGH, this.config.maxAttempts);
        this.failedCommands.delete(commandId);
        retried++;
      }
    }
    
    return retried;
  }

  /**
   * Process the command queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }
    
    this.processing = true;

    while (this.running && (this.queue.length > 0 || this.activeCommands.size > 0)) {
      // Process commands up to max concurrency
      while (this.queue.length > 0 && this.activeCommands.size < this.config.maxConcurrency) {
        const entry = this.queue.shift()!;
        this.processCommand(entry);
      }

      // Wait before next processing cycle
      await this.sleep(this.config.processingDelay);
    }

    this.processing = false;
  }

  /**
   * Process a single command
   */
  private async processCommand<T>(entry: IQueueEntry<T>): Promise<void> {
    const commandId = entry.command.getId();
    entry.attempts++;
    
    this.activeCommands.add(commandId);

    try {
      const result = await this.invoker.execute(entry.command);
      
      if (result.success) {
        this.completedCommands.set(commandId, result);
      } else {
        await this.handleCommandFailure(entry, result.error || 'Unknown error');
      }
    } catch (error) {
      await this.handleCommandFailure(entry, error instanceof Error ? error.message : String(error));
    } finally {
      this.activeCommands.delete(commandId);
    }
  }

  /**
   * Handle command failure with retry logic
   */
  private async handleCommandFailure<T>(entry: IQueueEntry<T>, error: string): Promise<void> {
    const commandId = entry.command.getId();
    
    if (entry.attempts < entry.maxAttempts) {
      // Re-queue for retry with exponential backoff delay
      const delay = Math.min(1000 * Math.pow(2, entry.attempts - 1), 30000);
      
      setTimeout(() => {
        if (this.running) {
          this.queue.unshift(entry); // Add to front for priority
        }
      }, delay);
    } else {
      // Max attempts reached, mark as failed
      this.failedCommands.set(commandId, {
        command: entry.command,
        error,
        attempts: entry.attempts
      });
    }
  }

  /**
   * Get age of oldest command in queue
   */
  private getOldestCommandAge(): number {
    if (this.queue.length === 0) {
      return 0;
    }
    
    const oldest = this.queue.reduce((oldest, entry) => 
      entry.addedAt < oldest.addedAt ? entry : oldest
    );
    
    return Date.now() - oldest.addedAt.getTime();
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update queue configuration
   */
  updateConfig(config: Partial<ICommandQueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ICommandQueueConfig {
    return { ...this.config };
  }
}

/**
 * Queue statistics interface
 */
export interface IQueueStatistics {
  /** Current queue size */
  queueSize: number;
  /** Number of active commands */
  activeCommands: number;
  /** Number of completed commands */
  completedCommands: number;
  /** Number of failed commands */
  failedCommands: number;
  /** Whether queue is running */
  isRunning: boolean;
  /** Whether queue is processing */
  isProcessing: boolean;
  /** Maximum concurrency setting */
  maxConcurrency: number;
  /** Breakdown by priority */
  priorityBreakdown: Record<string, number>;
  /** Age of oldest command in milliseconds */
  oldestCommandAge: number;
}