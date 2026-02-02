import { BaseApplicationState } from './BaseApplicationState';
import { ApplicationStateType } from './IApplicationState';
import type { IApplicationStateContext } from './IApplicationState';

/**
 * Validating state - validates user input before proceeding to domain checking
 * Performs input validation and prepares for domain queries
 */
export class ValidatingState extends BaseApplicationState {
  constructor(context: IApplicationStateContext) {
    super(context);
  }

  /**
   * Get the name of this state
   */
  getStateName(): ApplicationStateType {
    return 'validating' as ApplicationStateType;
  }

  /**
   * Handle user input in validating state
   * @param input - User input string
   */
  override handleInput(input: string): void {
    super.handleInput(input);
    
    // Clear validation errors when user modifies input
    this.context.errors = this.context.errors.filter(error => 
      error.errorType !== 'INVALID_RESPONSE'
    );
  }

  /**
   * Handle form submission in validating state
   * Should not be called as validation should complete automatically
   */
  override handleSubmit(): void {
    // Validation state should transition automatically, but allow resubmission
    this.validateInput();
  }

  /**
   * Enter validating state and perform validation
   * @param context - Application state context
   */
  override onEnter(context: IApplicationStateContext): void {
    super.onEnter(context);
    
    // Clear previous results and errors
    this.clearResults();
    
    // Notify UI that validation has started
    this.uiCallbacks?.onStateChange(ApplicationStateType.VALIDATING, ApplicationStateType.IDLE);
    
    // Perform validation immediately
    this.validateInput();
  }

  /**
   * Validate the current input
   */
  private validateInput(): void {
    const input = this.context.currentInput?.trim();
    
    if (!input) {
      this.handleValidationError('Please enter a domain name');
      return;
    }

    if (!this.isValidInput(input)) {
      let errorMessage = 'Invalid domain name. ';
      
      if (input.length < 1 || input.length > 63) {
        errorMessage += 'Domain must be between 1 and 63 characters long.';
      } else if (!/^[a-zA-Z0-9-]+$/.test(input)) {
        errorMessage += 'Domain can only contain letters, numbers, and hyphens.';
      } else if (input.startsWith('-') || input.endsWith('-')) {
        errorMessage += 'Domain cannot start or end with a hyphen.';
      }
      
      this.handleValidationError(errorMessage);
      return;
    }

    // Validation successful - prepare for checking
    this.context.currentInput = input.toLowerCase(); // Normalize to lowercase
    this.context.lastActionAt = new Date();
    
    // Generate request ID for tracking
    this.context.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validation complete - ready to transition to checking state
  }

  /**
   * Handle validation error
   * @param message - Validation error message
   */
  private handleValidationError(message: string): void {
    this.uiCallbacks?.onValidationError(message);
    
    // Add validation error to context
    const validationError = {
      domain: this.context.currentInput || '',
      errorType: 'INVALID_RESPONSE' as const,
      message,
      retryable: false,
      timestamp: new Date()
    };
    
    this.context.errors.push(validationError);
    this.context.lastActionAt = new Date();
  }

  /**
   * Check if transition to another state is allowed
   * @param targetState - Target state to transition to
   * @returns True if transition is allowed
   */
  override canTransitionTo(targetState: ApplicationStateType): boolean {
    // From validating, can go to checking (if validation passes), error, or back to idle
    return targetState === ApplicationStateType.CHECKING || 
           targetState === ApplicationStateType.ERROR || 
           targetState === ApplicationStateType.IDLE;
  }

  /**
   * Handle retry request in validating state
   * @param _domain - Domain to retry (optional)
   */
  override handleRetry(_domain?: string): void {
    // Clear errors and re-validate
    this.context.errors = [];
    this.validateInput();
  }
}