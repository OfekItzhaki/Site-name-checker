// Observer pattern exports
export { IEventBus, DomainEvents } from './IEventBus';
export type { 
  IDomainEvent, 
  IValidationErrorEvent, 
  ICheckStartedEvent, 
  IResultUpdatedEvent, 
  ICheckCompletedEvent, 
  IErrorOccurredEvent 
} from './IEventBus';
export { EventBus } from './EventBus';