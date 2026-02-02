import { ValidatingState, ApplicationStateType } from '../../../src/patterns/state';
import type { IApplicationStateContext, IUICallbacks } from '../../../src/patterns/state';

describe('ValidatingState', () => {
  let validatingState: ValidatingState;
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

    validatingState = new ValidatingState(mockContext);
  });

  describe('State Identity', () => {
    it('should return correct state name', () => {
      expect(validatingState.getStateName()).toBe(ApplicationStateType.VALIDATING);
    });
  });

  describe('Input Validation', () => {
    it('should validate empty input', () => {
      mockContext.currentInput = '';
      validatingState.onEnter(mockContext);
      expect(mockUICallbacks.onValidationError).toHaveBeenCalledWith('Please enter a domain name');
    });

    it('should validate whitespace-only input', () => {
      mockContext.currentInput = '   ';
      validatingState.onEnter(mockContext);
      expect(mockUICallbacks.onValidationError).toHaveBeenCalledWith('Please enter a domain name');
    });

    it('should validate domain length - too short', () => {
      mockContext.currentInput = '';
      validatingState.onEnter(mockContext);
      expect(mockUICallbacks.onValidationError).toHaveBeenCalled();
    });

    it('should validate domain length - too long', () => {
      mockContext.currentInput = 'a'.repeat(64); // 64 characters, max is 63
      validatingState.onEnter(mockContext);
      expect(mockUICallbacks.onValidationError).toHaveBeenCalledWith(
        expect.stringContaining('Domain must be between 1 and 63 characters long')
      );
    });

    it('should validate invalid characters', () => {
      mockContext.currentInput = 'domain@invalid';
      validatingState.onEnter(mockContext);
      expect(mockUICallbacks.onValidationError).toHaveBeenCalledWith(
        expect.stringContaining('Domain can only contain letters, numbers, and hyphens')
      );
    });

    it('should validate leading hyphen', () => {
      mockContext.currentInput = '-invalid';
      validatingState.onEnter(mockContext);
      expect(mockUICallbacks.onValidationError).toHaveBeenCalledWith(
        expect.stringContaining('Domain cannot start or end with a hyphen')
      );
    });

    it('should validate trailing hyphen', () => {
      mockContext.currentInput = 'invalid-';
      validatingState.onEnter(mockContext);
      expect(mockUICallbacks.onValidationError).toHaveBeenCalledWith(
        expect.stringContaining('Domain cannot start or end with a hyphen')
      );
    });

    it('should accept valid domain names', () => {
      mockContext.currentInput = 'valid-domain123';
      validatingState.onEnter(mockContext);
      expect(mockUICallbacks.onValidationError).not.toHaveBeenCalled();
      expect(mockContext.currentInput).toBe('valid-domain123');
    });

    it('should normalize domain to lowercase', () => {
      mockContext.currentInput = 'EXAMPLE';
      validatingState.onEnter(mockContext);
      expect(mockContext.currentInput).toBe('example');
    });

    it('should generate request ID for valid domains', () => {
      mockContext.currentInput = 'example';
      validatingState.onEnter(mockContext);
      expect(mockContext.requestId).toBeDefined();
      expect(mockContext.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('Input Handling', () => {
    it('should handle input changes', () => {
      validatingState.handleInput('newdomain');
      expect(mockContext.currentInput).toBe('newdomain');
    });

    it('should clear validation errors when input changes', () => {
      // Add a validation error
      mockContext.errors = [{
        domain: 'test',
        errorType: 'INVALID_RESPONSE',
        message: 'Validation error',
        retryable: false,
        timestamp: new Date()
      }];

      validatingState.handleInput('newdomain');
      expect(mockContext.errors).toEqual([]);
    });

    it('should preserve non-validation errors when input changes', () => {
      // Add a non-validation error
      const networkError = {
        domain: 'test',
        errorType: 'NETWORK' as const,
        message: 'Network error',
        retryable: true,
        timestamp: new Date()
      };
      mockContext.errors = [networkError];

      validatingState.handleInput('newdomain');
      expect(mockContext.errors).toContain(networkError);
    });
  });

  describe('Form Submission', () => {
    it('should re-validate on submit', () => {
      mockContext.currentInput = 'example';
      validatingState.handleSubmit();
      expect(mockContext.currentInput).toBe('example');
    });

    it('should show error on invalid submit', () => {
      mockContext.currentInput = 'invalid@domain';
      validatingState.handleSubmit();
      expect(mockUICallbacks.onValidationError).toHaveBeenCalled();
    });
  });

  describe('Retry Handling', () => {
    it('should clear errors and re-validate on retry', () => {
      mockContext.errors = [{
        domain: 'test',
        errorType: 'NETWORK',
        message: 'Test error',
        retryable: true,
        timestamp: new Date()
      }];
      mockContext.currentInput = 'example';

      validatingState.handleRetry();
      expect(mockContext.errors).toEqual([]);
    });
  });

  describe('State Transitions', () => {
    it('should allow transition to checking', () => {
      expect(validatingState.canTransitionTo(ApplicationStateType.CHECKING)).toBe(true);
    });

    it('should allow transition to error', () => {
      expect(validatingState.canTransitionTo(ApplicationStateType.ERROR)).toBe(true);
    });

    it('should allow transition to idle', () => {
      expect(validatingState.canTransitionTo(ApplicationStateType.IDLE)).toBe(true);
    });

    it('should not allow transition to completed', () => {
      expect(validatingState.canTransitionTo(ApplicationStateType.COMPLETED)).toBe(false);
    });
  });

  describe('State Lifecycle', () => {
    it('should clear results on enter', () => {
      mockContext.results = [{
        domain: 'old.com',
        baseDomain: 'old',
        tld: '.com',
        status: 'available' as any,
        lastChecked: new Date(),
        checkMethod: 'DNS'
      }];
      mockContext.errors = [{
        domain: 'old',
        errorType: 'NETWORK',
        message: 'Old error',
        retryable: true,
        timestamp: new Date()
      }];

      mockContext.currentInput = 'example';
      validatingState.onEnter(mockContext);

      expect(mockContext.results).toEqual([]);
      expect(mockContext.progress).toEqual({ completed: 0, total: 0 });
    });

    it('should notify UI of state change on enter', () => {
      mockContext.currentInput = 'example';
      validatingState.onEnter(mockContext);
      expect(mockUICallbacks.onStateChange).toHaveBeenCalledWith(
        ApplicationStateType.VALIDATING,
        ApplicationStateType.IDLE
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in domain names', () => {
      const invalidDomains = ['domain.com', 'domain_name', 'domain space', 'domain!'];
      
      invalidDomains.forEach(domain => {
        mockContext.currentInput = domain;
        mockUICallbacks.onValidationError.mockClear();
        validatingState.onEnter(mockContext);
        expect(mockUICallbacks.onValidationError).toHaveBeenCalled();
      });
    });

    it('should handle boundary length domains', () => {
      // Test exactly 63 characters (valid)
      mockContext.currentInput = 'a'.repeat(63);
      mockUICallbacks.onValidationError.mockClear();
      validatingState.onEnter(mockContext);
      expect(mockUICallbacks.onValidationError).not.toHaveBeenCalled();

      // Test exactly 64 characters (invalid)
      mockContext.currentInput = 'a'.repeat(64);
      mockUICallbacks.onValidationError.mockClear();
      validatingState.onEnter(mockContext);
      expect(mockUICallbacks.onValidationError).toHaveBeenCalled();
    });

    it('should handle mixed case input', () => {
      mockContext.currentInput = 'ExAmPlE';
      validatingState.onEnter(mockContext);
      expect(mockContext.currentInput).toBe('example');
    });
  });
});