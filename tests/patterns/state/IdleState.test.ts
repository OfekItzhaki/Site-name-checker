import { IdleState, ApplicationStateType } from '../../../src/patterns/state';
import type { IApplicationStateContext, IUICallbacks } from '../../../src/patterns/state';

describe('IdleState', () => {
  let idleState: IdleState;
  let mockContext: IApplicationStateContext;
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

    mockContext = {
      currentInput: '',
      results: [],
      errors: [],
      progress: { completed: 0, total: 0 },
      lastActionAt: new Date(),
      uiCallbacks: mockUICallbacks
    };

    idleState = new IdleState(mockContext);
  });

  describe('State Identity', () => {
    it('should return correct state name', () => {
      expect(idleState.getStateName()).toBe(ApplicationStateType.IDLE);
    });
  });

  describe('Input Handling', () => {
    it('should handle user input', () => {
      idleState.handleInput('example');
      expect(mockContext.currentInput).toBe('example');
      expect(mockContext.lastActionAt).toBeInstanceOf(Date);
    });

    it('should clear errors when user starts typing', () => {
      // Add some errors first
      mockContext.errors = [{
        domain: 'test',
        errorType: 'NETWORK',
        message: 'Test error',
        retryable: true,
        timestamp: new Date()
      }];

      idleState.handleInput('newdomain');
      expect(mockContext.errors).toEqual([]);
    });
  });

  describe('Form Submission', () => {
    it('should handle submit with valid input', () => {
      mockContext.currentInput = 'example';
      idleState.handleSubmit();
      expect(mockContext.lastActionAt).toBeInstanceOf(Date);
    });

    it('should show validation error for empty input', () => {
      mockContext.currentInput = '';
      idleState.handleSubmit();
      expect(mockUICallbacks.onValidationError).toHaveBeenCalledWith('Please enter a domain name');
    });

    it('should show validation error for whitespace-only input', () => {
      mockContext.currentInput = '   ';
      idleState.handleSubmit();
      expect(mockUICallbacks.onValidationError).toHaveBeenCalledWith('Please enter a domain name');
    });
  });

  describe('Retry Handling', () => {
    it('should handle retry by clearing state', () => {
      // Set up some state
      mockContext.errors = [{
        domain: 'test',
        errorType: 'NETWORK',
        message: 'Test error',
        retryable: true,
        timestamp: new Date()
      }];
      mockContext.results = [{
        domain: 'test.com',
        baseDomain: 'test',
        tld: '.com',
        status: 'error' as any,
        lastChecked: new Date(),
        checkMethod: 'DNS'
      }];
      mockContext.progress = { completed: 1, total: 1 };

      idleState.handleRetry();

      expect(mockContext.errors).toEqual([]);
      expect(mockContext.results).toEqual([]);
      expect(mockContext.progress).toEqual({ completed: 0, total: 0 });
    });

    it('should handle retry with specific domain', () => {
      idleState.handleRetry('example.com');
      expect(mockContext.errors).toEqual([]);
      expect(mockContext.results).toEqual([]);
    });
  });

  describe('State Transitions', () => {
    it('should allow transition to validating', () => {
      expect(idleState.canTransitionTo(ApplicationStateType.VALIDATING)).toBe(true);
    });

    it('should allow transition to error', () => {
      expect(idleState.canTransitionTo(ApplicationStateType.ERROR)).toBe(true);
    });

    it('should not allow transition to checking', () => {
      expect(idleState.canTransitionTo(ApplicationStateType.CHECKING)).toBe(false);
    });

    it('should not allow transition to completed', () => {
      expect(idleState.canTransitionTo(ApplicationStateType.COMPLETED)).toBe(false);
    });
  });

  describe('State Lifecycle', () => {
    it('should handle onEnter', () => {
      idleState.onEnter(mockContext);
      expect(mockContext.progress).toEqual({ completed: 0, total: 0 });
      expect(mockContext.requestId).toBeUndefined();
      expect(mockUICallbacks.onStateChange).toHaveBeenCalledWith(
        ApplicationStateType.IDLE,
        ApplicationStateType.IDLE
      );
    });

    it('should handle onExit', () => {
      // onExit should not throw
      expect(() => idleState.onExit(mockContext)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle string errors', () => {
      idleState.handleError('Test error');
      expect(mockContext.errors.length).toBe(1);
      expect(mockContext.errors[0]?.message).toBe('Test error');
      expect(mockUICallbacks.onError).toHaveBeenCalledWith('Test error');
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error object');
      idleState.handleError(error);
      expect(mockContext.errors.length).toBe(1);
      expect(mockContext.errors[0]?.message).toBe('Test error object');
      expect(mockUICallbacks.onError).toHaveBeenCalledWith('Test error object');
    });
  });

  describe('Result Handling', () => {
    it('should handle domain results', () => {
      const result = {
        domain: 'example.com',
        baseDomain: 'example',
        tld: '.com',
        status: 'available' as any,
        lastChecked: new Date(),
        checkMethod: 'DNS' as const
      };

      idleState.handleResult(result);
      expect(mockContext.results).toContain(result);
      expect(mockUICallbacks.onResultUpdate).toHaveBeenCalledWith(result);
    });
  });
});