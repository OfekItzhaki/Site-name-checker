import { EventBus } from '../../../src/patterns/observer/EventBus';
import { IEventBus, DomainEvents } from '../../../src/patterns/observer/IEventBus';

describe('EventBus', () => {
  let eventBus: IEventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('subscribe', () => {
    it('should allow subscribing to events', () => {
      const handler = jest.fn();
      
      expect(() => {
        eventBus.subscribe('test-event', handler);
      }).not.toThrow();
    });

    it('should throw error for invalid event name', () => {
      const handler = jest.fn();
      
      expect(() => {
        eventBus.subscribe('', handler);
      }).toThrow('Event name must be a non-empty string');

      expect(() => {
        eventBus.subscribe(null as any, handler);
      }).toThrow('Event name must be a non-empty string');
    });

    it('should throw error for invalid handler', () => {
      expect(() => {
        eventBus.subscribe('test-event', null as any);
      }).toThrow('Handler must be a function');

      expect(() => {
        eventBus.subscribe('test-event', 'not-a-function' as any);
      }).toThrow('Handler must be a function');
    });

    it('should allow multiple handlers for the same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      eventBus.subscribe('test-event', handler1);
      eventBus.subscribe('test-event', handler2);
      
      eventBus.publish('test-event', 'test-data');
      
      expect(handler1).toHaveBeenCalledWith('test-data');
      expect(handler2).toHaveBeenCalledWith('test-data');
    });
  });

  describe('unsubscribe', () => {
    it('should remove specific handler from event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      eventBus.subscribe('test-event', handler1);
      eventBus.subscribe('test-event', handler2);
      
      eventBus.unsubscribe('test-event', handler1);
      eventBus.publish('test-event', 'test-data');
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith('test-data');
    });

    it('should handle unsubscribing non-existent handler gracefully', () => {
      const handler = jest.fn();
      
      expect(() => {
        eventBus.unsubscribe('non-existent-event', handler);
      }).not.toThrow();
    });

    it('should throw error for invalid parameters', () => {
      const handler = jest.fn();
      
      expect(() => {
        eventBus.unsubscribe('', handler);
      }).toThrow('Event name must be a non-empty string');

      expect(() => {
        eventBus.unsubscribe('test-event', null as any);
      }).toThrow('Handler must be a function');
    });

    it('should clean up empty event sets', () => {
      const handler = jest.fn();
      const eventBusImpl = eventBus as EventBus;
      
      eventBus.subscribe('test-event', handler);
      expect(eventBusImpl.getSubscriberCount('test-event')).toBe(1);
      
      eventBus.unsubscribe('test-event', handler);
      expect(eventBusImpl.getSubscriberCount('test-event')).toBe(0);
      expect(eventBusImpl.getActiveEvents()).not.toContain('test-event');
    });
  });

  describe('publish', () => {
    it('should call all subscribed handlers with correct data', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const testData = { message: 'test', value: 42 };
      
      eventBus.subscribe('test-event', handler1);
      eventBus.subscribe('test-event', handler2);
      
      eventBus.publish('test-event', testData);
      
      expect(handler1).toHaveBeenCalledWith(testData);
      expect(handler2).toHaveBeenCalledWith(testData);
    });

    it('should handle events with no subscribers gracefully', () => {
      expect(() => {
        eventBus.publish('non-existent-event', 'test-data');
      }).not.toThrow();
    });

    it('should throw error for invalid event name', () => {
      expect(() => {
        eventBus.publish('', 'test-data');
      }).toThrow('Event name must be a non-empty string');

      expect(() => {
        eventBus.publish(null as any, 'test-data');
      }).toThrow('Event name must be a non-empty string');
    });

    it('should handle handler errors without stopping other handlers', () => {
      const handler1 = jest.fn(() => {
        throw new Error('Handler 1 error');
      });
      const handler2 = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      eventBus.subscribe('test-event', handler1);
      eventBus.subscribe('test-event', handler2);
      
      eventBus.publish('test-event', 'test-data');
      
      expect(handler1).toHaveBeenCalledWith('test-data');
      expect(handler2).toHaveBeenCalledWith('test-data');
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error in event handler for event 'test-event':",
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should add events to history', () => {
      const eventBusImpl = eventBus as EventBus;
      const testData = 'test-data';
      
      eventBus.publish('test-event', testData);
      
      const history = eventBusImpl.getEventHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        type: 'test-event',
        data: testData,
        source: 'EventBus'
      });
      expect(history[0]!.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('clear', () => {
    it('should remove all subscriptions and history', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const eventBusImpl = eventBus as EventBus;
      
      eventBus.subscribe('event1', handler1);
      eventBus.subscribe('event2', handler2);
      eventBus.publish('event1', 'data1');
      
      expect(eventBusImpl.getActiveEvents()).toHaveLength(2);
      expect(eventBusImpl.getEventHistory()).toHaveLength(1);
      
      eventBus.clear();
      
      expect(eventBusImpl.getActiveEvents()).toHaveLength(0);
      expect(eventBusImpl.getEventHistory()).toHaveLength(0);
      
      // Verify handlers are no longer called
      eventBus.publish('event1', 'data2');
      expect(handler1).toHaveBeenCalledTimes(1); // Only the call before clear()
    });
  });

  describe('EventBus specific methods', () => {
    let eventBusImpl: EventBus;

    beforeEach(() => {
      eventBusImpl = eventBus as EventBus;
    });

    describe('getSubscriberCount', () => {
      it('should return correct subscriber count', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        
        expect(eventBusImpl.getSubscriberCount('test-event')).toBe(0);
        
        eventBus.subscribe('test-event', handler1);
        expect(eventBusImpl.getSubscriberCount('test-event')).toBe(1);
        
        eventBus.subscribe('test-event', handler2);
        expect(eventBusImpl.getSubscriberCount('test-event')).toBe(2);
        
        eventBus.unsubscribe('test-event', handler1);
        expect(eventBusImpl.getSubscriberCount('test-event')).toBe(1);
      });
    });

    describe('getActiveEvents', () => {
      it('should return list of events with subscribers', () => {
        const handler = jest.fn();
        
        expect(eventBusImpl.getActiveEvents()).toEqual([]);
        
        eventBus.subscribe('event1', handler);
        eventBus.subscribe('event2', handler);
        
        const activeEvents = eventBusImpl.getActiveEvents();
        expect(activeEvents).toHaveLength(2);
        expect(activeEvents).toContain('event1');
        expect(activeEvents).toContain('event2');
      });
    });

    describe('hasSubscribers', () => {
      it('should correctly identify events with subscribers', () => {
        const handler = jest.fn();
        
        expect(eventBusImpl.hasSubscribers('test-event')).toBe(false);
        
        eventBus.subscribe('test-event', handler);
        expect(eventBusImpl.hasSubscribers('test-event')).toBe(true);
        
        eventBus.unsubscribe('test-event', handler);
        expect(eventBusImpl.hasSubscribers('test-event')).toBe(false);
      });
    });

    describe('clearEvent', () => {
      it('should remove all subscribers for specific event', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        
        eventBus.subscribe('event1', handler1);
        eventBus.subscribe('event2', handler2);
        
        eventBusImpl.clearEvent('event1');
        
        expect(eventBusImpl.hasSubscribers('event1')).toBe(false);
        expect(eventBusImpl.hasSubscribers('event2')).toBe(true);
      });
    });

    describe('getEventHistory', () => {
      it('should return event history', () => {
        eventBus.publish('event1', 'data1');
        eventBus.publish('event2', 'data2');
        
        const history = eventBusImpl.getEventHistory();
        expect(history).toHaveLength(2);
        expect(history[0]!.type).toBe('event1');
        expect(history[1]!.type).toBe('event2');
      });

      it('should limit history when requested', () => {
        eventBus.publish('event1', 'data1');
        eventBus.publish('event2', 'data2');
        eventBus.publish('event3', 'data3');
        
        const limitedHistory = eventBusImpl.getEventHistory(2);
        expect(limitedHistory).toHaveLength(2);
        expect(limitedHistory[0]!.type).toBe('event2');
        expect(limitedHistory[1]!.type).toBe('event3');
      });

      it('should maintain history size limit', () => {
        // Publish more than maxHistorySize (100) events
        for (let i = 0; i < 105; i++) {
          eventBus.publish(`event-${i}`, `data-${i}`);
        }
        
        const history = eventBusImpl.getEventHistory();
        expect(history).toHaveLength(100);
        expect(history[0]!.type).toBe('event-5'); // First 5 should be removed
        expect(history[99]!.type).toBe('event-104');
      });
    });
  });

  describe('Domain Events Integration', () => {
    it('should work with DomainEvents enum', () => {
      const handler = jest.fn();
      
      eventBus.subscribe(DomainEvents.VALIDATION_ERROR, handler);
      eventBus.publish(DomainEvents.VALIDATION_ERROR, {
        message: 'Invalid domain',
        field: 'domain',
        value: 'invalid-domain!'
      });
      
      expect(handler).toHaveBeenCalledWith({
        message: 'Invalid domain',
        field: 'domain',
        value: 'invalid-domain!'
      });
    });

    it('should handle all domain event types', () => {
      const handlers = {
        validationError: jest.fn(),
        checkStarted: jest.fn(),
        resultUpdated: jest.fn(),
        checkCompleted: jest.fn(),
        errorOccurred: jest.fn()
      };
      
      eventBus.subscribe(DomainEvents.VALIDATION_ERROR, handlers.validationError);
      eventBus.subscribe(DomainEvents.CHECK_STARTED, handlers.checkStarted);
      eventBus.subscribe(DomainEvents.RESULT_UPDATED, handlers.resultUpdated);
      eventBus.subscribe(DomainEvents.CHECK_COMPLETED, handlers.checkCompleted);
      eventBus.subscribe(DomainEvents.ERROR_OCCURRED, handlers.errorOccurred);
      
      // Publish each event type
      eventBus.publish(DomainEvents.VALIDATION_ERROR, { message: 'error', field: 'domain', value: 'test' });
      eventBus.publish(DomainEvents.CHECK_STARTED, { domains: ['test.com'], requestId: '123', strategy: 'hybrid' });
      eventBus.publish(DomainEvents.RESULT_UPDATED, { result: {} as any, progress: { completed: 1, total: 5 } });
      eventBus.publish(DomainEvents.CHECK_COMPLETED, { results: [], requestId: '123', totalExecutionTime: 1000 });
      eventBus.publish(DomainEvents.ERROR_OCCURRED, { error: {} as any, context: 'test' });
      
      // Verify all handlers were called
      Object.values(handlers).forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for event data', () => {
      interface TestEventData {
        id: number;
        name: string;
      }
      
      const handler = jest.fn<void, [TestEventData]>();
      
      eventBus.subscribe<TestEventData>('typed-event', handler);
      eventBus.publish<TestEventData>('typed-event', { id: 1, name: 'test' });
      
      expect(handler).toHaveBeenCalledWith({ id: 1, name: 'test' });
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent subscribe/unsubscribe operations', () => {
      const handlers = Array.from({ length: 10 }, () => jest.fn());
      
      // Subscribe all handlers
      handlers.forEach((handler, index) => {
        eventBus.subscribe(`event-${index}`, handler);
      });
      
      // Unsubscribe some handlers while publishing
      eventBus.publish('event-0', 'data');
      eventBus.unsubscribe('event-0', handlers[0]!);
      eventBus.publish('event-0', 'data2');
      
      expect(handlers[0]).toHaveBeenCalledTimes(1);
      expect(handlers[0]).toHaveBeenCalledWith('data');
    });

    it('should handle modifications during event publishing', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn(() => {
        // Try to modify subscriptions during event handling
        eventBus.subscribe('test-event', jest.fn());
      });
      
      eventBus.subscribe('test-event', handler1);
      eventBus.subscribe('test-event', handler2);
      
      expect(() => {
        eventBus.publish('test-event', 'data');
      }).not.toThrow();
      
      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });
  });
});