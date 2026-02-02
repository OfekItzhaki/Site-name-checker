import * as fc from 'fast-check';
import { EventBus } from '../../../src/patterns/observer/EventBus';
import { IEventBus } from '../../../src/patterns/observer/IEventBus';

describe('EventBus Property Tests', () => {
  let eventBus: IEventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.clear();
  });

  /**
   * Property: Event Publishing and Subscription Consistency
   * For any valid event name and data, if we subscribe a handler and then publish,
   * the handler should be called exactly once with the correct data.
   */
  it('should maintain subscription consistency across all valid inputs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // Valid event names
        fc.anything(), // Any data type
        (eventName, eventData) => {
          const handler = jest.fn();
          
          eventBus.subscribe(eventName, handler);
          eventBus.publish(eventName, eventData);
          
          expect(handler).toHaveBeenCalledTimes(1);
          expect(handler).toHaveBeenCalledWith(eventData);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple Handlers Consistency
   * For any valid event name and any number of handlers (1-10),
   * all handlers should be called when the event is published.
   */
  it('should call all handlers for any number of subscribers', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 10 }),
        fc.anything(),
        (eventName, handlerCount, eventData) => {
          const handlers = Array.from({ length: handlerCount }, () => jest.fn());
          
          // Subscribe all handlers
          handlers.forEach(handler => {
            eventBus.subscribe(eventName, handler);
          });
          
          eventBus.publish(eventName, eventData);
          
          // All handlers should be called exactly once
          handlers.forEach(handler => {
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(eventData);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Unsubscribe Isolation
   * For any event with multiple handlers, unsubscribing one handler
   * should not affect the others.
   */
  it('should isolate unsubscribe operations', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 2, max: 5 }),
        fc.anything(),
        (eventName, handlerCount, eventData) => {
          const handlers = Array.from({ length: handlerCount }, () => jest.fn());
          
          // Subscribe all handlers
          handlers.forEach(handler => {
            eventBus.subscribe(eventName, handler);
          });
          
          // Unsubscribe the first handler
          eventBus.unsubscribe(eventName, handlers[0]!);
          
          // Publish event
          eventBus.publish(eventName, eventData);
          
          // First handler should not be called
          expect(handlers[0]).not.toHaveBeenCalled();
          
          // All other handlers should be called
          handlers.slice(1).forEach(handler => {
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(eventData);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Event Isolation
   * Events with different names should not interfere with each other.
   */
  it('should maintain event isolation', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 2, maxLength: 5 }),
        fc.array(fc.anything(), { minLength: 2, maxLength: 5 }),
        (eventNames, eventDataArray) => {
          // Ensure we have unique event names
          const uniqueEventNames = [...new Set(eventNames)];
          if (uniqueEventNames.length < 2) return; // Skip if not enough unique names
          
          const handlers = uniqueEventNames.map(() => jest.fn());
          
          // Subscribe each handler to a different event
          uniqueEventNames.forEach((eventName, index) => {
            eventBus.subscribe(eventName, handlers[index]!);
          });
          
          // Publish only the first event
          const firstEventData = eventDataArray[0] || 'test-data';
          eventBus.publish(uniqueEventNames[0]!, firstEventData);
          
          // Only the first handler should be called
          expect(handlers[0]).toHaveBeenCalledTimes(1);
          expect(handlers[0]).toHaveBeenCalledWith(firstEventData);
          
          // All other handlers should not be called
          handlers.slice(1).forEach(handler => {
            expect(handler).not.toHaveBeenCalled();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Clear Operation Completeness
   * After clearing the event bus, no handlers should be called for any event.
   */
  it('should completely clear all subscriptions', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 10 }),
        fc.anything(),
        (eventNames, eventData) => {
          const handlers = eventNames.map(() => jest.fn());
          
          // Subscribe handlers to events
          eventNames.forEach((eventName, index) => {
            eventBus.subscribe(eventName, handlers[index]!);
          });
          
          // Clear the event bus
          eventBus.clear();
          
          // Publish all events
          eventNames.forEach(eventName => {
            eventBus.publish(eventName, eventData);
          });
          
          // No handlers should be called
          handlers.forEach(handler => {
            expect(handler).not.toHaveBeenCalled();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Subscriber Count Accuracy
   * The subscriber count should always match the actual number of subscribed handlers.
   */
  it('should maintain accurate subscriber counts', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 0, max: 10 }),
        (eventName, targetHandlerCount) => {
          const eventBusImpl = eventBus as EventBus;
          const handlers = Array.from({ length: targetHandlerCount }, () => jest.fn());
          
          // Initially should have 0 subscribers
          expect(eventBusImpl.getSubscriberCount(eventName)).toBe(0);
          expect(eventBusImpl.hasSubscribers(eventName)).toBe(false);
          
          // Subscribe handlers one by one
          handlers.forEach((handler, index) => {
            eventBus.subscribe(eventName, handler);
            expect(eventBusImpl.getSubscriberCount(eventName)).toBe(index + 1);
            expect(eventBusImpl.hasSubscribers(eventName)).toBe(true);
          });
          
          // Unsubscribe handlers one by one
          handlers.forEach((handler, index) => {
            eventBus.unsubscribe(eventName, handler);
            const expectedCount = targetHandlerCount - index - 1;
            expect(eventBusImpl.getSubscriberCount(eventName)).toBe(expectedCount);
            expect(eventBusImpl.hasSubscribers(eventName)).toBe(expectedCount > 0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Event History Integrity
   * All published events should appear in the history with correct metadata.
   */
  it('should maintain event history integrity', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            eventName: fc.string({ minLength: 1, maxLength: 30 }),
            eventData: fc.anything()
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (events) => {
          // Create a fresh EventBus for this test to avoid interference
          const freshEventBus = new EventBus();
          const startTime = new Date();
          
          // Publish all events
          events.forEach(({ eventName, eventData }) => {
            freshEventBus.publish(eventName, eventData);
          });
          
          const endTime = new Date();
          const history = freshEventBus.getEventHistory();
          
          // History should contain all events
          expect(history).toHaveLength(events.length);
          
          // Each event should have correct structure and data
          events.forEach(({ eventName, eventData }, index) => {
            const historyEvent = history[index]!;
            expect(historyEvent.type).toBe(eventName);
            expect(historyEvent.data).toEqual(eventData);
            expect(historyEvent.source).toBe('EventBus');
            expect(historyEvent.timestamp).toBeInstanceOf(Date);
            expect(historyEvent.timestamp.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
            expect(historyEvent.timestamp.getTime()).toBeLessThanOrEqual(endTime.getTime());
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Error Resilience
   * If some handlers throw errors, other handlers should still be called.
   */
  it('should be resilient to handler errors', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 2, max: 5 }),
        fc.anything(),
        (eventName, handlerCount, eventData) => {
          const handlers = Array.from({ length: handlerCount }, (_, index) => {
            if (index === 0) {
              // First handler throws an error
              return jest.fn(() => {
                throw new Error(`Handler ${index} error`);
              });
            }
            return jest.fn();
          });
          
          // Mock console.error to avoid test output pollution
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
          
          try {
            // Subscribe all handlers
            handlers.forEach(handler => {
              eventBus.subscribe(eventName, handler);
            });
            
            // Publish event
            eventBus.publish(eventName, eventData);
            
            // All handlers should be called despite the first one throwing
            handlers.forEach(handler => {
              expect(handler).toHaveBeenCalledTimes(1);
              expect(handler).toHaveBeenCalledWith(eventData);
            });
            
            // Console.error should be called for the error
            expect(consoleSpy).toHaveBeenCalledWith(
              `Error in event handler for event '${eventName}':`,
              expect.any(Error)
            );
          } finally {
            consoleSpy.mockRestore();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Data Type Preservation
   * Any data type published should be received unchanged by handlers.
   */
  it('should preserve data types across publish/subscribe', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.float(),
          fc.boolean(),
          fc.array(fc.anything()),
          fc.object(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        (eventName, eventData) => {
          const handler = jest.fn();
          
          eventBus.subscribe(eventName, handler);
          eventBus.publish(eventName, eventData);
          
          expect(handler).toHaveBeenCalledWith(eventData);
          
          // Verify the data is exactly the same (reference equality for objects)
          const receivedData = handler.mock.calls[0][0];
          if (typeof eventData === 'object' && eventData !== null) {
            expect(receivedData).toBe(eventData); // Same reference
          } else {
            expect(receivedData).toEqual(eventData);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});