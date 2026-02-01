import { ApplicationStateManager, ApplicationStateType } from '../../../src/patterns/state';
import type { IUICallbacks } from '../../../src/patterns/state';
import type { IDomainResult } from '../../../src/models';
import { AvailabilityStatus } from '../../../src/models/AvailabilityStatus';

describe('ApplicationStateManager', () => {
  let stateManager: ApplicationStateManager;
  let mockUICallbacks: jest.Mocked<IUICallbacks>;

  beforeEach(() => {
    mockUICallbacks = {
      onValidationError: jest.fn(),
      onCheckStarted: jest.fn(),
      onResultUpdate: jest.fn(),
      onCheckCompleted: jest.fn(),
      onError: jest.fn(),
      onStateChange: jest.fn()
    };

    stateManager = new ApplicationStateManager();
    stateManager.registerUICallbacks(mockUICallbacks);
  });

  describe('Initial State', () => {
    it('should start in idle state', () => {
      expect(stateManager.getCurrentStateType()).toBe(ApplicationStateType.IDLE);
    });

    it('should have empty context initially', () => {
      const context = stateManager.getContext();
      expect(context.currentInput).toBe('');
      expect(context.results).toEqual([]);
      expect(context.errors).toEqual([]);
      expect(context.progress).toEqual({ completed: 0, total: 0 });
    });
  });

  describe('State Transitions', () => {
    it('should transition from idle to validating', async () => {
      await stateManager.transitionTo(ApplicationStateType.VALIDATING);
      expect(stateManager.getCurrentStateType()).toBe(ApplicationStateType.VALIDATING);
      expect(mockUICallbacks.onStateChange).toHaveBeenCalledWith(
        ApplicationStateType.VALIDATING,
        ApplicationStateType.IDLE
      );
    });

    it('should transition from validating to checking', async () => {
      await stateManager.transitionTo(ApplicationStateType.VALIDATING);
      await stateManager.transitionTo(ApplicationStateType.CHECKING);
      expect(stateManager.getCurrentStateType()).toBe(ApplicationStateType.CHECKING);
    });

    it('should transition from checking to completed', async () => {
      await stateManager.transitionTo(ApplicationStateType.VALIDATING);
      await stateManager.transitionTo(ApplicationStateType.CHECKING);
      await stateManager.transitionTo(ApplicationStateType.COMPLETED);
      expect(stateManager.getCurrentStateType()).toBe(ApplicationStateType.COMPLETED);
    });

    it('should transition to error state from any state', async () => {
      await stateManager.transitionTo(ApplicationStateType.CHECKING);
      await stateManager.transitionTo(ApplicationStateType.ERROR);
      expect(stateManager.getCurrentStateType()).toBe(ApplicationStateType.ERROR);
    });

    it('should prevent invalid transitions', async () => {
      // Cannot go directly from idle to checking
      await expect(stateManager.transitionTo(ApplicationStateType.CHECKING))
        .rejects.toThrow('Invalid state transition');
    });

    it('should not transition to the same state', async () => {
      const initialHistoryLength = stateManager.getStateHistory().length;
      await stateManager.transitionTo(ApplicationStateType.IDLE);
      expect(stateManager.getStateHistory().length).toBe(initialHistoryLength);
    });
  });

  describe('Input Handling', () => {
    it('should handle input in idle state', () => {
      stateManager.handleInput('example');
      const context = stateManager.getContext();
      expect(context.currentInput).toBe('example');
    });

    it('should clear errors when input changes in idle state', () => {
      // Add an error first
      stateManager.handleError('Test error');
      expect(stateManager.getContext().errors.length).toBeGreaterThan(0);

      // Change input should clear errors in idle state
      stateManager.handleInput('newdomain');
      const context = stateManager.getContext();
      expect(context.errors).toEqual([]);
    });
  });

  describe('Form Submission', () => {
    it('should handle submit from idle state', () => {
      stateManager.handleInput('example');
      stateManager.handleSubmit();
      // Should transition to validating
      expect(stateManager.getCurrentStateType()).toBe(ApplicationStateType.VALIDATING);
    });

    it('should show validation error for empty input', () => {
      stateManager.handleSubmit();
      expect(mockUICallbacks.onValidationError).toHaveBeenCalledWith('Please enter a domain name');
    });
  });

  describe('Result Handling', () => {
    beforeEach(async () => {
      stateManager.handleInput('example');
      await stateManager.transitionTo(ApplicationStateType.CHECKING);
    });

    it('should handle domain results', () => {
      const result: IDomainResult = {
        domain: 'example.com',
        baseDomain: 'example',
        tld: '.com',
        status: AvailabilityStatus.AVAILABLE,
        lastChecked: new Date(),
        checkMethod: 'DNS'
      };

      stateManager.handleResult(result);
      const context = stateManager.getContext();
      expect(context.results).toContain(result);
      expect(mockUICallbacks.onResultUpdate).toHaveBeenCalledWith(result);
    });

    it('should update existing results', () => {
      const result1: IDomainResult = {
        domain: 'example.com',
        baseDomain: 'example',
        tld: '.com',
        status: AvailabilityStatus.CHECKING,
        lastChecked: new Date(),
        checkMethod: 'DNS'
      };

      const result2: IDomainResult = {
        domain: 'example.com',
        baseDomain: 'example',
        tld: '.com',
        status: AvailabilityStatus.AVAILABLE,
        lastChecked: new Date(),
        checkMethod: 'DNS'
      };

      stateManager.handleResult(result1);
      stateManager.handleResult(result2);

      const context = stateManager.getContext();
      expect(context.results.length).toBe(1);
      expect(context.results[0]?.status).toBe(AvailabilityStatus.AVAILABLE);
    });

    it('should auto-transition to completed when all results are done', () => {
      const results: IDomainResult[] = [
        {
          domain: 'example.com',
          baseDomain: 'example',
          tld: '.com',
          status: AvailabilityStatus.AVAILABLE,
          lastChecked: new Date(),
          checkMethod: 'DNS'
        },
        {
          domain: 'example.net',
          baseDomain: 'example',
          tld: '.net',
          status: AvailabilityStatus.TAKEN,
          lastChecked: new Date(),
          checkMethod: 'DNS'
        }
      ];

      results.forEach(result => stateManager.handleResult(result));
      expect(stateManager.getCurrentStateType()).toBe(ApplicationStateType.COMPLETED);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors', () => {
      stateManager.handleError('Test error');
      const context = stateManager.getContext();
      expect(context.errors.length).toBeGreaterThan(0);
      expect(mockUICallbacks.onError).toHaveBeenCalledWith('Test error');
    });

    it('should transition to error state for critical errors', () => {
      stateManager.handleError('Critical system error');
      expect(stateManager.getCurrentStateType()).toBe(ApplicationStateType.ERROR);
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error object');
      stateManager.handleError(error);
      expect(mockUICallbacks.onError).toHaveBeenCalledWith('Test error object');
    });
  });

  describe('Retry Handling', () => {
    beforeEach(async () => {
      await stateManager.transitionTo(ApplicationStateType.COMPLETED);
    });

    it('should handle retry requests', () => {
      stateManager.handleRetry();
      // Should handle retry without throwing
      expect(stateManager.getCurrentStateType()).toBe(ApplicationStateType.COMPLETED);
    });

    it('should handle domain-specific retry', () => {
      stateManager.handleRetry('example.com');
      // Should handle specific domain retry
      expect(stateManager.getCurrentStateType()).toBe(ApplicationStateType.COMPLETED);
    });
  });

  describe('Context Management', () => {
    it('should update context', () => {
      const updates = {
        currentInput: 'newdomain',
        progress: { completed: 5, total: 10 }
      };

      stateManager.updateContext(updates);
      const context = stateManager.getContext();
      expect(context.currentInput).toBe('newdomain');
      expect(context.progress).toEqual({ completed: 5, total: 10 });
    });

    it('should return context copy to prevent mutation', () => {
      const context1 = stateManager.getContext();
      const context2 = stateManager.getContext();
      expect(context1).not.toBe(context2); // Different objects
      expect(context1).toEqual(context2); // Same content
    });
  });

  describe('State History', () => {
    it('should track state transitions', async () => {
      await stateManager.transitionTo(ApplicationStateType.VALIDATING);
      await stateManager.transitionTo(ApplicationStateType.CHECKING);

      const history = stateManager.getStateHistory();
      expect(history.length).toBe(2);
      expect(history[0]).toMatchObject({
        from: ApplicationStateType.IDLE,
        to: ApplicationStateType.VALIDATING
      });
      expect(history[1]).toMatchObject({
        from: ApplicationStateType.VALIDATING,
        to: ApplicationStateType.CHECKING
      });
    });

    it('should return history copy to prevent mutation', () => {
      const history1 = stateManager.getStateHistory();
      const history2 = stateManager.getStateHistory();
      expect(history1).not.toBe(history2); // Different arrays
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to initial state', async () => {
      // Make some changes
      stateManager.handleInput('example');
      await stateManager.transitionTo(ApplicationStateType.VALIDATING);
      stateManager.handleError('Test error');

      // Reset
      stateManager.reset();

      // Check reset state
      expect(stateManager.getCurrentStateType()).toBe(ApplicationStateType.IDLE);
      const context = stateManager.getContext();
      expect(context.currentInput).toBe('');
      expect(context.results).toEqual([]);
      expect(context.errors).toEqual([]);
      expect(stateManager.getStateHistory()).toEqual([]);
    });

    it('should preserve UI callbacks after reset', () => {
      stateManager.reset();
      const context = stateManager.getContext();
      expect(context.uiCallbacks).toBe(mockUICallbacks);
    });
  });

  describe('Convenience Methods', () => {
    it('should start domain check process', async () => {
      await stateManager.startDomainCheck('example');
      
      const context = stateManager.getContext();
      expect(context.currentInput).toBe('example');
      expect(stateManager.getCurrentStateType()).toBe(ApplicationStateType.VALIDATING);
    });

    it('should provide statistics', async () => {
      stateManager.handleInput('example');
      await stateManager.transitionTo(ApplicationStateType.VALIDATING);
      stateManager.handleError('Test error');

      const stats = stateManager.getStatistics();
      expect(stats.currentState).toBe(ApplicationStateType.VALIDATING);
      expect(stats.totalTransitions).toBe(1);
      expect(stats.errorsCount).toBe(1);
      expect(stats.uptime).toBeGreaterThan(0);
    });
  });
});