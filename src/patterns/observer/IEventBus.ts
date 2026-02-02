/**
 * Interface for Event Bus implementation using Observer pattern
 * Provides loose coupling between components through event-driven architecture
 */
export interface IEventBus {
  /**
   * Subscribe to an event with a typed handler
   * @param event - Event name to subscribe to
   * @param handler - Function to handle the event data
   */
  subscribe<T>(event: string, handler: (data: T) => void): void;

  /**
   * Unsubscribe from an event
   * @param event - Event name to unsubscribe from
   * @param handler - Handler function to remove
   */
  unsubscribe(event: string, handler: Function): void;

  /**
   * Publish an event with typed data
   * @param event - Event name to publish
   * @param data - Data to send with the event
   */
  publish<T>(event: string, data: T): void;

  /**
   * Emit an event (alias for publish)
   * @param event - Event name to emit
   * @param data - Data to send with the event
   */
  emit<T>(event: string, data: T): void;

  /**
   * Listen to an event (alias for subscribe)
   * @param event - Event name to listen to
   * @param handler - Function to handle the event data
   */
  on<T>(event: string, handler: (data: T) => void): void;

  /**
   * Clear all event subscriptions
   */
  clear(): void;
}

/**
 * Enumeration of domain-related events
 */
export enum DomainEvents {
  VALIDATION_ERROR = 'validation_error',
  CHECK_STARTED = 'check_started',
  RESULT_UPDATED = 'result_updated',
  CHECK_COMPLETED = 'check_completed',
  ERROR_OCCURRED = 'error_occurred'
}

/**
 * Base interface for domain events
 */
export interface IDomainEvent<T = any> {
  type: string;
  data: T;
  timestamp: Date;
  source: string;
}

/**
 * Event data for validation errors
 */
export interface IValidationErrorEvent {
  message: string;
  field: string;
  value: string;
}

/**
 * Event data for check started
 */
export interface ICheckStartedEvent {
  domains: string[];
  requestId: string;
  strategy: string;
}

/**
 * Event data for result updates
 */
export interface IResultUpdatedEvent {
  result: import('../../models').IDomainResult;
  progress: {
    completed: number;
    total: number;
  };
}

/**
 * Event data for check completion
 */
export interface ICheckCompletedEvent {
  results: import('../../models').IDomainResult[];
  requestId: string;
  totalExecutionTime: number;
}

/**
 * Event data for errors
 */
export interface IErrorOccurredEvent {
  error: import('../../models').IQueryError;
  context: string;
}