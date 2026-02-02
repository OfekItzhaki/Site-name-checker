/**
 * Interface for application state implementations
 * Manages complex UI state transitions cleanly
 */
export interface IApplicationState {
  /**
   * Handle user input in this state
   * @param input - User input string
   */
  handleInput(input: string): void;

  /**
   * Handle form submission in this state
   */
  handleSubmit(): void;

  /**
   * Handle domain result in this state
   * @param result - Domain availability result
   */
  handleResult(result: import('../../models').IDomainResult): void;

  /**
   * Handle error in this state
   * @param error - Error message or object
   */
  handleError(error: string | Error): void;

  /**
   * Handle retry request in this state
   * @param domain - Domain to retry (optional)
   */
  handleRetry(domain?: string): void;

  /**
   * Get the name of this state
   * @returns State name
   */
  getStateName(): ApplicationStateType;

  /**
   * Check if transition to another state is allowed
   * @param targetState - Target state to transition to
   * @returns True if transition is allowed
   */
  canTransitionTo(targetState: ApplicationStateType): boolean;

  /**
   * Enter this state (called when transitioning to this state)
   * @param context - Application state context
   */
  onEnter(context: IApplicationStateContext): void;

  /**
   * Exit this state (called when transitioning from this state)
   * @param context - Application state context
   */
  onExit(context: IApplicationStateContext): void;
}

/**
 * Enumeration of application state types
 */
export enum ApplicationStateType {
  IDLE = 'idle',
  VALIDATING = 'validating',
  CHECKING = 'checking',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * Context shared between application states
 */
export interface IApplicationStateContext {
  /** Current user input */
  currentInput: string;
  /** Domain availability results */
  results: import('../../models').IDomainResult[];
  /** Query errors */
  errors: import('../../models').IQueryError[];
  /** Progress information */
  progress: {
    completed: number;
    total: number;
  };
  /** Current request ID */
  requestId?: string;
  /** Timestamp of last action */
  lastActionAt: Date;
  /** UI callbacks for state updates */
  uiCallbacks?: IUICallbacks;
}

/**
 * Interface for UI callbacks from state manager
 */
export interface IUICallbacks {
  /** Called when validation error occurs */
  onValidationError(message: string): void;
  /** Called when domain check starts */
  onCheckStarted(domains: string[]): void;
  /** Called when a result is updated */
  onResultUpdate(result: import('../../models').IDomainResult): void;
  /** Called when all checks are completed */
  onCheckCompleted(results: import('../../models').IDomainResult[]): void;
  /** Called when an error occurs */
  onError(error: string): void;
  /** Called when state changes */
  onStateChange(newState: ApplicationStateType, oldState: ApplicationStateType): void;
}

/**
 * Interface for application state manager
 */
export interface IApplicationStateManager {
  /**
   * Get current state
   * @returns Current application state
   */
  getCurrentState(): IApplicationState;

  /**
   * Get current state type
   * @returns Current state type
   */
  getCurrentStateType(): ApplicationStateType;

  /**
   * Transition to a new state
   * @param newStateType - Target state type
   * @returns Promise resolving when transition is complete
   */
  transitionTo(newStateType: ApplicationStateType): Promise<void>;

  /**
   * Check if transition is valid
   * @param targetState - Target state to check
   * @returns True if transition is valid
   */
  canTransitionTo(targetState: ApplicationStateType): boolean;

  /**
   * Get state context
   * @returns Current state context
   */
  getContext(): IApplicationStateContext;

  /**
   * Update state context
   * @param updates - Partial context updates
   */
  updateContext(updates: Partial<IApplicationStateContext>): void;

  /**
   * Register UI callbacks
   * @param callbacks - UI callback functions
   */
  registerUICallbacks(callbacks: IUICallbacks): void;

  /**
   * Get state transition history
   * @returns Array of state transitions
   */
  getStateHistory(): Array<{
    from: ApplicationStateType;
    to: ApplicationStateType;
    timestamp: Date;
  }>;

  /**
   * Reset to initial state
   */
  reset(): void;

  /**
   * Handle user input
   * @param input - User input string
   */
  handleInput(input: string): void;

  /**
   * Handle form submission
   */
  handleSubmit(): void;

  /**
   * Handle domain result
   * @param result - Domain result
   */
  handleResult(result: import('../../models').IDomainResult): void;

  /**
   * Handle error
   * @param error - Error message or object
   */
  handleError(error: string | Error): void;

  /**
   * Handle retry request
   * @param domain - Optional domain to retry
   */
  handleRetry(domain?: string): void;
}