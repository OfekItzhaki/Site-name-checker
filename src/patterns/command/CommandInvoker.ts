import { ICommand, ICommandInvoker, ICommandResult } from './ICommand';

/**
 * Command invoker that manages command execution, history, and batch processing
 * Provides centralized command execution with logging and error handling
 */
export class CommandInvoker implements ICommandInvoker {
  private history: Array<{ command: ICommand<any>; result: ICommandResult<any> }> = [];
  private activeCommands: Map<string, ICommand<any>> = new Map();
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Execute a single command
   */
  async execute<T>(command: ICommand<T>): Promise<ICommandResult<T>> {
    const commandId = command.getId();
    
    // Track active command
    this.activeCommands.set(commandId, command);
    
    const startTime = Date.now();
    let result: ICommandResult<T>;

    try {
      const data = await command.executeWithRetry();
      
      result = {
        success: true,
        data,
        executionTime: Date.now() - startTime,
        commandId,
        timestamp: new Date()
      };
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
        commandId,
        timestamp: new Date()
      };
    } finally {
      // Remove from active commands
      this.activeCommands.delete(commandId);
    }

    // Add to history
    this.addToHistory(command, result);

    return result;
  }

  /**
   * Execute multiple commands in parallel
   */
  async executeParallel<T>(commands: ICommand<T>[]): Promise<ICommandResult<T>[]> {
    if (commands.length === 0) {
      return [];
    }

    // Execute all commands concurrently
    const promises = commands.map(command => this.execute(command));
    
    try {
      return await Promise.all(promises);
    } catch (error) {
      // This shouldn't happen since execute() catches all errors
      // But we handle it just in case
      throw new Error(`Parallel execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeSequential<T>(commands: ICommand<T>[]): Promise<ICommandResult<T>[]> {
    const results: ICommandResult<T>[] = [];

    for (const command of commands) {
      const result = await this.execute(command);
      results.push(result);
      
      // If a command fails and it's critical, we might want to stop
      // For now, we continue with all commands regardless of failures
    }

    return results;
  }

  /**
   * Execute commands in batches with configurable batch size and delay
   */
  async executeBatch<T>(
    commands: ICommand<T>[],
    batchSize: number = 5,
    delayBetweenBatches: number = 0
  ): Promise<ICommandResult<T>[]> {
    const results: ICommandResult<T>[] = [];
    
    for (let i = 0; i < commands.length; i += batchSize) {
      const batch = commands.slice(i, i + batchSize);
      const batchResults = await this.executeParallel(batch);
      results.push(...batchResults);
      
      // Add delay between batches if specified
      if (delayBetweenBatches > 0 && i + batchSize < commands.length) {
        await this.sleep(delayBetweenBatches);
      }
    }
    
    return results;
  }

  /**
   * Cancel a command by ID
   */
  async cancel(commandId: string): Promise<void> {
    const command = this.activeCommands.get(commandId);
    
    if (command) {
      // Cancel the command if it supports cancellation
      if (typeof (command as any).cancel === 'function') {
        (command as any).cancel();
      }
      
      // Remove from active commands
      this.activeCommands.delete(commandId);
    }
  }

  /**
   * Cancel all active commands
   */
  async cancelAll(): Promise<void> {
    const commandIds = Array.from(this.activeCommands.keys());
    
    for (const commandId of commandIds) {
      await this.cancel(commandId);
    }
  }

  /**
   * Get command execution history
   */
  getHistory(): Array<{ command: ICommand<any>; result: ICommandResult<any> }> {
    return [...this.history];
  }

  /**
   * Get history filtered by success/failure
   */
  getHistoryByStatus(success: boolean): Array<{ command: ICommand<any>; result: ICommandResult<any> }> {
    return this.history.filter(entry => entry.result.success === success);
  }

  /**
   * Get history for a specific command type
   */
  getHistoryByCommandName(commandName: string): Array<{ command: ICommand<any>; result: ICommandResult<any> }> {
    return this.history.filter(entry => entry.command.getName() === commandName);
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get currently active commands
   */
  getActiveCommands(): ICommand<any>[] {
    return Array.from(this.activeCommands.values());
  }

  /**
   * Get statistics about command execution
   */
  getStatistics(): ICommandStatistics {
    const total = this.history.length;
    const successful = this.history.filter(entry => entry.result.success).length;
    const failed = total - successful;
    
    const executionTimes = this.history.map(entry => entry.result.executionTime);
    const avgExecutionTime = executionTimes.length > 0 
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
      : 0;
    
    const commandTypes = new Map<string, number>();
    this.history.forEach(entry => {
      const commandName = entry.command.getName();
      commandTypes.set(commandName, (commandTypes.get(commandName) || 0) + 1);
    });

    return {
      totalCommands: total,
      successfulCommands: successful,
      failedCommands: failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageExecutionTime: avgExecutionTime,
      activeCommands: this.activeCommands.size,
      commandTypeBreakdown: Object.fromEntries(commandTypes)
    };
  }

  /**
   * Add command and result to history
   */
  private addToHistory<T>(command: ICommand<T>, result: ICommandResult<T>): void {
    this.history.push({ command, result });
    
    // Trim history if it exceeds max size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set maximum history size
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    
    // Trim current history if needed
    if (this.history.length > size) {
      this.history = this.history.slice(-size);
    }
  }

  /**
   * Get maximum history size
   */
  getMaxHistorySize(): number {
    return this.maxHistorySize;
  }
}

/**
 * Statistics about command execution
 */
export interface ICommandStatistics {
  /** Total number of commands executed */
  totalCommands: number;
  /** Number of successful commands */
  successfulCommands: number;
  /** Number of failed commands */
  failedCommands: number;
  /** Success rate as percentage */
  successRate: number;
  /** Average execution time in milliseconds */
  averageExecutionTime: number;
  /** Number of currently active commands */
  activeCommands: number;
  /** Breakdown of commands by type */
  commandTypeBreakdown: Record<string, number>;
}