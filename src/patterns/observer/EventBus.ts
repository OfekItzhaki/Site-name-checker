import { IEventBus, IDomainEvent } from './IEventBus';

/**
 * EventBus implementation using Observer pattern
 * Provides loose coupling between components through event-driven architecture
 * 
 * Features:
 * - Type-safe event subscription and publishing
 * - Event cleanup and lifecycle management
 * - Support for multiple handlers per event
 * - Automatic event metadata (timestamp, source)
 */
export class EventBus implements IEventBus {
  private readonly subscribers: Map<string, Set<Function>> = new Map();
  private readonly eventHistory: IDomainEvent[] = [];
  private readonly maxHistorySize: number = 100;

  /**
   * Subscribe to an event with a typed handler
   * @param event - Event name to subscribe to
   * @param handler - Function to handle the event data
   */
  subscribe<T>(event: string, handler: (data: T) => void): void {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }

    if (!handler || typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }

    this.subscribers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from an event
   * @param event - Event name to unsubscribe from
   * @param handler - Handler function to remove
   */
  unsubscribe(event: string, handler: Function): void {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }

    if (!handler || typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    const eventSubscribers = this.subscribers.get(event);
    if (eventSubscribers) {
      eventSubscribers.delete(handler);
      
      // Clean up empty event sets
      if (eventSubscribers.size === 0) {
        this.subscribers.delete(event);
      }
    }
  }

  /**
   * Publish an event with typed data
   * @param event - Event name to publish
   * @param data - Data to send with the event
   */
  publish<T>(event: string, data: T): void {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }

    // Create event metadata
    const domainEvent: IDomainEvent<T> = {
      type: event,
      data,
      timestamp: new Date(),
      source: 'EventBus'
    };

    // Add to history (with size limit)
    this.addToHistory(domainEvent);

    // Notify all subscribers
    const eventSubscribers = this.subscribers.get(event);
    if (eventSubscribers && eventSubscribers.size > 0) {
      // Create a copy of subscribers to avoid issues if handlers modify subscriptions
      const subscribersCopy = Array.from(eventSubscribers);
      
      subscribersCopy.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          // Log error but don't stop other handlers from executing
          console.error(`Error in event handler for event '${event}':`, error);
        }
      });
    }
  }

  /**
   * Emit an event (alias for publish)
   */
  emit<T>(event: string, data: T): void {
    this.publish(event, data);
  }

  /**
   * Listen to an event (alias for subscribe)
   */
  on<T>(event: string, handler: (data: T) => void): void {
    this.subscribe(event, handler);
  }

  /**
   * Clear all event subscriptions
   */
  clear(): void {
    this.subscribers.clear();
    this.eventHistory.length = 0;
  }

  /**
   * Get the number of subscribers for a specific event
   * @param event - Event name to check
   * @returns Number of subscribers
   */
  getSubscriberCount(event: string): number {
    const eventSubscribers = this.subscribers.get(event);
    return eventSubscribers ? eventSubscribers.size : 0;
  }

  /**
   * Get all active event names
   * @returns Array of event names that have subscribers
   */
  getActiveEvents(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Get event history (for debugging/monitoring)
   * @param limit - Maximum number of events to return (default: all)
   * @returns Array of recent events
   */
  getEventHistory(limit?: number): IDomainEvent[] {
    if (limit && limit > 0) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  /**
   * Check if there are any subscribers for an event
   * @param event - Event name to check
   * @returns True if there are subscribers
   */
  hasSubscribers(event: string): boolean {
    return this.getSubscriberCount(event) > 0;
  }

  /**
   * Remove all subscribers for a specific event
   * @param event - Event name to clear
   */
  clearEvent(event: string): void {
    this.subscribers.delete(event);
  }

  /**
   * Add event to history with size management
   * @param event - Event to add to history
   */
  private addToHistory(event: IDomainEvent): void {
    this.eventHistory.push(event);
    
    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }
}