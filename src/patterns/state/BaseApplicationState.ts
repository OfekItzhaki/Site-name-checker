import type { IApplicationState, IApplicationStateContext, IUICallbacks } from './IApplicationState';
import { ApplicationStateType } from './IApplicationState';
import type { IDomainResult, IQueryError } from '../../models';

/**
 * Base class for application states providing common functionality
 */
export abstract class BaseApplicationState implements IApplicationState {
  protected context: IApplicationStateContext;
  protected uiCallbacks: IUICallbacks | undefined;

  constructor(context: IApplicationStateContext) {
    this.context = context;
    this.uiCallbacks = context.uiCallbacks;
  }

  /**
   * Get the name of this state
   */
  abstract getStateName(): ApplicationStateType;

  /**
   * Handle user input - default implementation
   * @param input - User input string
   */
  handleInput(input: string): void {
    // Update context with new input
    this.context.currentInput = input;
    this.context.lastActionAt = new Date();
  }

  /**
   * Handle form submission - default implementation throws error
   */
  handleSubmit(): void {
    throw new Error(`Submit not allowed in ${this.getStateName()} state`);
  }

  /**
   * Handle domain result - default implementation
   * @param result - Domain availability result
   */
  handleResult(result: IDomainResult): void {
    // Find existing result and update it, or add new result
    const existingIndex = this.context.results.findIndex(r => r.domain === result.domain);
    if (existingIndex >= 0) {
      this.context.results[existingIndex] = result;
    } else {
      this.context.results.push(result);
    }

    // Update progress
    this.context.progress.completed = this.context.results.filter(r => 
      r.status !== 'checking'
    ).length;

    this.context.lastActionAt = new Date();

    // Notify UI
    this.uiCallbacks?.onResultUpdate(result);
  }

  /**
   * Handle error - default implementation
   * @param error - Error message or object
   */
  handleError(error: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error;
    
    // Add to errors if it's a domain-specific error
    if (this.context.currentInput) {
      const queryError: IQueryError = {
        domain: this.context.currentInput,
        errorType: 'NETWORK',
        message: errorMessage,
        retryable: true,
        timestamp: new Date()
      };
      this.context.errors.push(queryError);
    }

    this.context.lastActionAt = new Date();

    // Notify UI
    this.uiCallbacks?.onError(errorMessage);
  }

  /**
   * Handle retry request - default implementation throws error
   * @param _domain - Domain to retry (optional)
   */
  handleRetry(_domain?: string): void {
    throw new Error(`Retry not allowed in ${this.getStateName()} state`);
  }

  /**
   * Check if transition to another state is allowed - default implementation
   * @param targetState - Target state to transition to
   * @returns True if transition is allowed
   */
  canTransitionTo(targetState: ApplicationStateType): boolean {
    // Default transition rules - can be overridden by specific states
    const currentState = this.getStateName();
    
    // Can always transition to error state
    if (targetState === ApplicationStateType.ERROR) {
      return true;
    }

    // Can always reset to idle
    if (targetState === ApplicationStateType.IDLE) {
      return true;
    }

    // State-specific transition rules
    switch (currentState) {
      case ApplicationStateType.IDLE:
        return targetState === ApplicationStateType.VALIDATING;
      
      case ApplicationStateType.VALIDATING:
        return targetState === ApplicationStateType.CHECKING;
      
      case ApplicationStateType.CHECKING:
        return targetState === ApplicationStateType.COMPLETED;
      
      case ApplicationStateType.COMPLETED:
        return targetState === ApplicationStateType.VALIDATING;
      
      case ApplicationStateType.ERROR:
        return targetState === ApplicationStateType.VALIDATING;
      
      default:
        return false;
    }
  }

  /**
   * Enter this state - default implementation
   * @param context - Application state context
   */
  onEnter(context: IApplicationStateContext): void {
    this.context = context;
    this.uiCallbacks = context.uiCallbacks;
  }

  /**
   * Exit this state - default implementation
   * @param _context - Application state context
   */
  onExit(_context: IApplicationStateContext): void {
    // Default implementation does nothing
  }

  /**
   * Utility method to clear results and errors
   */
  protected clearResults(): void {
    this.context.results = [];
    this.context.errors = [];
    this.context.progress = { completed: 0, total: 0 };
  }

  /**
   * Utility method to validate input format
   * @param input - Input to validate
   * @returns True if input is valid
   */
  protected isValidInput(input: string): boolean {
    if (!input || input.trim().length === 0) {
      return false;
    }

    const trimmed = input.trim();
    
    // Check length (1-63 characters)
    if (trimmed.length < 1 || trimmed.length > 63) {
      return false;
    }

    // Check for valid characters (alphanumeric and hyphens only)
    if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
      return false;
    }

    // Check that it doesn't start or end with hyphen
    if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
      return false;
    }

    return true;
  }
}