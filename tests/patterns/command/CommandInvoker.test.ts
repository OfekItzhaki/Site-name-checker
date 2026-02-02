import { CommandInvoker } from '../../../src/patterns/command/CommandInvoker';
import { BaseCommand } from '../../../src/patterns/command/BaseCommand';

// Test command implementations
class SuccessCommand extends BaseCommand<string> {
  private result: string;
  private delay: number;

  constructor(result: string = 'success', delay: number = 0) {
    super('SuccessCommand');
    this.result = result;
    this.delay = delay;
  }

  protected async executeInternal(): Promise<string> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    return this.result;
  }
}

class FailureCommand extends BaseCommand<string> {
  private errorMessage: string;

  constructor(errorMessage: string = 'Command failed') {
    super('FailureCommand');
    this.errorMessage = errorMessage;
  }

  protected async executeInternal(): Promise<string> {
    throw new Error(this.errorMessage);
  }
}

describe('CommandInvoker', () => {
  let invoker: CommandInvoker;

  beforeEach(() => {
    invoker = new CommandInvoker();
    jest.clearAllMocks();
  });

  describe('Single Command Execution', () => {
    it('should execute successful command', async () => {
      const command = new SuccessCommand('test result');
      
      const result = await invoker.execute(command);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('test result');
      expect(result.commandId).toBe(command.getId());
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle command failure', async () => {
      const command = new FailureCommand('Test error');
      
      const result = await invoker.execute(command);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.data).toBeUndefined();
      expect(result.commandId).toBe(command.getId());
    });

    it('should track command execution time', async () => {
      const command = new SuccessCommand('test', 100); // 100ms delay
      
      const result = await invoker.execute(command);
      
      expect(result.executionTime).toBeGreaterThanOrEqual(90); // Allow some variance
    });

    it('should add command to history', async () => {
      const command = new SuccessCommand('test');
      
      await invoker.execute(command);
      
      const history = invoker.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]!.command).toBe(command);
      expect(history[0]!.result.success).toBe(true);
    });
  });

  describe('Parallel Command Execution', () => {
    it('should execute multiple commands in parallel', async () => {
      const commands = [
        new SuccessCommand('result1', 50),
        new SuccessCommand('result2', 30),
        new SuccessCommand('result3', 20)
      ];
      
      const startTime = Date.now();
      const results = await invoker.executeParallel(commands);
      const totalTime = Date.now() - startTime;
      
      expect(results).toHaveLength(3);
      expect(results[0]!.data).toBe('result1');
      expect(results[1]!.data).toBe('result2');
      expect(results[2]!.data).toBe('result3');
      
      // Should complete in roughly the time of the slowest command (50ms)
      // rather than the sum of all commands (100ms)
      expect(totalTime).toBeLessThan(80);
    });

    it('should handle mixed success and failure in parallel execution', async () => {
      const commands = [
        new SuccessCommand('success'),
        new FailureCommand('failure'),
        new SuccessCommand('another success')
      ];
      
      const results = await invoker.executeParallel(commands);
      
      expect(results).toHaveLength(3);
      expect(results[0]!.success).toBe(true);
      expect(results[1]!.success).toBe(false);
      expect(results[2]!.success).toBe(true);
    });

    it('should handle empty command array', async () => {
      const results = await invoker.executeParallel([]);
      
      expect(results).toHaveLength(0);
    });
  });

  describe('Sequential Command Execution', () => {
    it('should execute commands in sequence', async () => {
      const executionOrder: number[] = [];
      
      class OrderedCommand extends BaseCommand<number> {
        private order: number;
        
        constructor(order: number) {
          super(`OrderedCommand${order}`);
          this.order = order;
        }
        
        protected async executeInternal(): Promise<number> {
          executionOrder.push(this.order);
          return this.order;
        }
      }
      
      const commands = [
        new OrderedCommand(1),
        new OrderedCommand(2),
        new OrderedCommand(3)
      ];
      
      const results = await invoker.executeSequential(commands);
      
      expect(results).toHaveLength(3);
      expect(executionOrder).toEqual([1, 2, 3]);
      expect(results.map(r => r.data)).toEqual([1, 2, 3]);
    });

    it('should continue execution even if some commands fail', async () => {
      const commands = [
        new SuccessCommand('first'),
        new FailureCommand('middle failure'),
        new SuccessCommand('last')
      ];
      
      const results = await invoker.executeSequential(commands);
      
      expect(results).toHaveLength(3);
      expect(results[0]!.success).toBe(true);
      expect(results[1]!.success).toBe(false);
      expect(results[2]!.success).toBe(true);
    });
  });

  describe('Batch Command Execution', () => {
    it('should execute commands in batches', async () => {
      const commands = Array.from({ length: 10 }, (_, i) => 
        new SuccessCommand(`result${i}`)
      );
      
      const results = await invoker.executeBatch(commands, 3); // Batch size 3
      
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.data).toBe(`result${index}`);
      });
    });

    it('should respect batch delay', async () => {
      const commands = Array.from({ length: 6 }, (_, i) => 
        new SuccessCommand(`result${i}`)
      );
      
      const startTime = Date.now();
      await invoker.executeBatch(commands, 2, 50); // Batch size 2, 50ms delay
      const totalTime = Date.now() - startTime;
      
      // Should have 3 batches with 2 delays between them (100ms total delay)
      expect(totalTime).toBeGreaterThan(90);
    });

    it('should handle empty batch', async () => {
      const results = await invoker.executeBatch([]);
      
      expect(results).toHaveLength(0);
    });
  });

  describe('Command Cancellation', () => {
    it('should cancel active command', async () => {
      const command = new SuccessCommand('test', 1000); // Long-running command
      
      // Start execution but don't await
      const executePromise = invoker.execute(command);
      
      // Cancel the command
      await invoker.cancel(command.getId());
      
      // The command should still complete (cancellation is best-effort)
      const result = await executePromise;
      expect(result).toBeDefined();
    });

    it('should cancel all active commands', async () => {
      const commands = [
        new SuccessCommand('test1', 1000),
        new SuccessCommand('test2', 1000)
      ];
      
      // Start executions but don't await
      const promises = commands.map(cmd => invoker.execute(cmd));
      
      // Cancel all commands
      await invoker.cancelAll();
      
      // Commands should still complete
      const results = await Promise.all(promises);
      expect(results).toHaveLength(2);
    });
  });

  describe('History Management', () => {
    it('should maintain execution history', async () => {
      const commands = [
        new SuccessCommand('first'),
        new FailureCommand('second'),
        new SuccessCommand('third')
      ];
      
      for (const command of commands) {
        await invoker.execute(command);
      }
      
      const history = invoker.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0]!.result.data).toBe('first');
      expect(history[1]!.result.success).toBe(false);
      expect(history[2]!.result.data).toBe('third');
    });

    it('should filter history by status', async () => {
      await invoker.execute(new SuccessCommand('success1'));
      await invoker.execute(new FailureCommand('failure'));
      await invoker.execute(new SuccessCommand('success2'));
      
      const successHistory = invoker.getHistoryByStatus(true);
      const failureHistory = invoker.getHistoryByStatus(false);
      
      expect(successHistory).toHaveLength(2);
      expect(failureHistory).toHaveLength(1);
    });

    it('should filter history by command name', async () => {
      await invoker.execute(new SuccessCommand('test1'));
      await invoker.execute(new FailureCommand('test2'));
      await invoker.execute(new SuccessCommand('test3'));
      
      const successHistory = invoker.getHistoryByCommandName('SuccessCommand');
      const failureHistory = invoker.getHistoryByCommandName('FailureCommand');
      
      expect(successHistory).toHaveLength(2);
      expect(failureHistory).toHaveLength(1);
    });

    it('should clear history', async () => {
      await invoker.execute(new SuccessCommand('test'));
      expect(invoker.getHistory()).toHaveLength(1);
      
      invoker.clearHistory();
      expect(invoker.getHistory()).toHaveLength(0);
    });

    it('should respect max history size', async () => {
      const smallInvoker = new CommandInvoker(2); // Max 2 entries
      
      await smallInvoker.execute(new SuccessCommand('first'));
      await smallInvoker.execute(new SuccessCommand('second'));
      await smallInvoker.execute(new SuccessCommand('third'));
      
      const history = smallInvoker.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0]!.result.data).toBe('second');
      expect(history[1]!.result.data).toBe('third');
    });

    it('should update max history size', () => {
      invoker.setMaxHistorySize(5);
      expect(invoker.getMaxHistorySize()).toBe(5);
    });
  });

  describe('Statistics', () => {
    it('should provide execution statistics', async () => {
      await invoker.execute(new SuccessCommand('success1'));
      await invoker.execute(new FailureCommand('failure'));
      await invoker.execute(new SuccessCommand('success2'));
      
      const stats = invoker.getStatistics();
      
      expect(stats.totalCommands).toBe(3);
      expect(stats.successfulCommands).toBe(2);
      expect(stats.failedCommands).toBe(1);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
      expect(stats.activeCommands).toBe(0);
      expect(stats.commandTypeBreakdown).toEqual({
        'SuccessCommand': 2,
        'FailureCommand': 1
      });
    });

    it('should handle empty statistics', () => {
      const stats = invoker.getStatistics();
      
      expect(stats.totalCommands).toBe(0);
      expect(stats.successfulCommands).toBe(0);
      expect(stats.failedCommands).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageExecutionTime).toBe(0);
    });
  });

  describe('Active Command Tracking', () => {
    it('should track active commands during execution', async () => {
      const command = new SuccessCommand('test', 100);
      
      const executePromise = invoker.execute(command);
      
      // Check active commands during execution
      const activeCommands = invoker.getActiveCommands();
      expect(activeCommands).toHaveLength(1);
      expect(activeCommands[0]).toBe(command);
      
      await executePromise;
      
      // Should be empty after completion
      expect(invoker.getActiveCommands()).toHaveLength(0);
    });
  });
});