import { BaseCommand } from '../../../src/patterns/command/BaseCommand';
import { CommandStatus, IRetryConfig } from '../../../src/patterns/command/ICommand';

// Test implementation of BaseCommand
class TestCommand extends BaseCommand<string> {
  private shouldFail: boolean;
  private executionCount: number = 0;
  private result: string;

  constructor(
    result: string = 'success',
    shouldFail: boolean = false,
    retryConfig?: Partial<IRetryConfig>,
    priority: number = 0
  ) {
    super('TestCommand', retryConfig, priority);
    this.result = result;
    this.shouldFail = shouldFail;
  }

  protected async executeInternal(): Promise<string> {
    this.executionCount++;
    
    if (this.shouldFail) {
      throw new Error(`Test command failed on attempt ${this.executionCount}`);
    }
    
    return this.result;
  }

  getExecutionCount(): number {
    return this.executionCount;
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}

describe('BaseCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should execute successfully and return result', async () => {
      const command = new TestCommand('test result');
      
      const result = await command.execute();
      
      expect(result).toBe('test result');
      expect(command.getStatus()).toBe(CommandStatus.COMPLETED);
      expect(command.getExecutionCount()).toBe(1);
    });

    it('should have correct initial state', () => {
      const command = new TestCommand();
      
      expect(command.getStatus()).toBe(CommandStatus.PENDING);
      expect(command.getRetryCount()).toBe(0);
      expect(command.getId()).toBeDefined();
      expect(command.getName()).toBe('TestCommand');
    });

    it('should track execution metadata', async () => {
      const command = new TestCommand('test');
      const beforeExecution = Date.now();
      
      await command.execute();
      
      const metadata = command.getMetadata();
      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(metadata.lastExecutedAt).toBeInstanceOf(Date);
      expect(metadata.completedAt).toBeInstanceOf(Date);
      expect(metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(metadata.lastExecutedAt!.getTime()).toBeGreaterThanOrEqual(beforeExecution);
    });
  });

  describe('Error Handling', () => {
    it('should handle execution failure', async () => {
      const command = new TestCommand('', true);
      
      await expect(command.execute()).rejects.toThrow('Test command failed on attempt 1');
      expect(command.getStatus()).toBe(CommandStatus.FAILED);
      expect(command.getExecutionCount()).toBe(1);
    });

    it('should track execution time even on failure', async () => {
      const command = new TestCommand('', true);
      
      try {
        await command.execute();
      } catch (error) {
        // Expected to fail
      }
      
      const metadata = command.getMetadata();
      expect(metadata.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed commands up to max retries', async () => {
      const command = new TestCommand('', true, { maxRetries: 3 });
      
      await expect(command.executeWithRetry()).rejects.toThrow();
      expect(command.getExecutionCount()).toBe(4); // Initial + 3 retries
      expect(command.getRetryCount()).toBe(3);
    });

    it('should succeed on retry if failure is temporary', async () => {
      const command = new TestCommand('success', true, { maxRetries: 2 });
      
      // Simulate temporary failure that resolves on second attempt
      setTimeout(() => command.setShouldFail(false), 50);
      
      const result = await command.executeWithRetry();
      expect(result).toBe('success');
      expect(command.getStatus()).toBe(CommandStatus.COMPLETED);
    });

    it('should respect retry configuration', () => {
      const retryConfig: IRetryConfig = {
        maxRetries: 5,
        initialDelayMs: 2000,
        useExponentialBackoff: false,
        maxDelayMs: 10000,
        backoffMultiplier: 3
      };
      
      const command = new TestCommand('', false, retryConfig);
      const config = command.getRetryConfig();
      
      expect(config.maxRetries).toBe(5);
      expect(config.initialDelayMs).toBe(2000);
      expect(config.useExponentialBackoff).toBe(false);
      expect(config.maxDelayMs).toBe(10000);
      expect(config.backoffMultiplier).toBe(3);
    });

    it('should use exponential backoff when configured', async () => {
      const command = new TestCommand('', true, {
        maxRetries: 2,
        initialDelayMs: 50, // Reduced delay for faster tests
        useExponentialBackoff: true,
        backoffMultiplier: 2
      });
      
      const startTime = Date.now();
      
      try {
        await command.executeWithRetry();
      } catch (error) {
        // Expected to fail
      }
      
      const totalTime = Date.now() - startTime;
      // Should have delays: 50ms + 100ms = 150ms minimum, but allow for timing variance
      expect(totalTime).toBeGreaterThan(100);
    });

    it('should not retry when canRetry returns false', async () => {
      const command = new TestCommand('', true, { maxRetries: 0 });
      
      await expect(command.executeWithRetry()).rejects.toThrow();
      expect(command.getExecutionCount()).toBe(1);
      expect(command.canRetry()).toBe(false);
    });
  });

  describe('Command State Management', () => {
    it('should transition through correct states during execution', async () => {
      const command = new TestCommand('test');
      
      expect(command.getStatus()).toBe(CommandStatus.PENDING);
      
      const executePromise = command.execute();
      expect(command.getStatus()).toBe(CommandStatus.EXECUTING);
      
      await executePromise;
      expect(command.getStatus()).toBe(CommandStatus.COMPLETED);
    });

    it('should allow command cancellation', () => {
      const command = new TestCommand();
      
      command.cancel();
      expect(command.getStatus()).toBe(CommandStatus.CANCELLED);
    });

    it('should allow command reset', async () => {
      const command = new TestCommand('test');
      await command.execute();
      
      expect(command.getStatus()).toBe(CommandStatus.COMPLETED);
      expect(command.getMetadata().completedAt).toBeDefined();
      
      command.reset();
      
      expect(command.getStatus()).toBe(CommandStatus.PENDING);
      expect(command.getRetryCount()).toBe(0);
      expect(command.getMetadata().completedAt).toBeUndefined();
    });
  });

  describe('Configuration Updates', () => {
    it('should allow retry configuration updates', () => {
      const command = new TestCommand();
      
      command.setRetryConfig({
        maxRetries: 10,
        initialDelayMs: 500
      });
      
      const config = command.getRetryConfig();
      expect(config.maxRetries).toBe(10);
      expect(config.initialDelayMs).toBe(500);
      // Other values should remain as defaults
      expect(config.useExponentialBackoff).toBe(true);
    });

    it('should update metadata max retries when retry config changes', () => {
      const command = new TestCommand();
      
      command.setRetryConfig({ maxRetries: 7 });
      
      expect(command.getMetadata().maxRetries).toBe(7);
    });
  });

  describe('Priority Handling', () => {
    it('should set and maintain command priority', () => {
      const command = new TestCommand('test', false, {}, 5);
      
      expect(command.getMetadata().priority).toBe(5);
    });

    it('should default to priority 0', () => {
      const command = new TestCommand();
      
      expect(command.getMetadata().priority).toBe(0);
    });
  });

  describe('Unique Identification', () => {
    it('should generate unique IDs for different commands', () => {
      const command1 = new TestCommand();
      const command2 = new TestCommand();
      
      expect(command1.getId()).not.toBe(command2.getId());
      expect(command1.getId()).toBeDefined();
      expect(command2.getId()).toBeDefined();
    });

    it('should maintain consistent ID throughout command lifecycle', async () => {
      const command = new TestCommand('test');
      const initialId = command.getId();
      
      await command.execute();
      expect(command.getId()).toBe(initialId);
      
      command.reset();
      expect(command.getId()).toBe(initialId);
    });
  });
});