// Observer Pattern exports
export type { IEventBus, IDomainEvent, IValidationErrorEvent, ICheckStartedEvent, IResultUpdatedEvent, ICheckCompletedEvent, IErrorOccurredEvent } from './observer/IEventBus';
export { DomainEvents } from './observer/IEventBus';
export { EventBus } from './observer/EventBus';

// Factory Pattern exports
export type { IQueryService, IServiceConfig, IServiceFactory } from './factory/IServiceFactory';
export { ServiceFactory } from './factory/ServiceFactory';

// Strategy Pattern exports
export type { IQueryStrategy, IStrategyConfig, IStrategyContext } from './strategy/IQueryStrategy';
export { QueryStrategyType } from './strategy/IQueryStrategy';

// Command Pattern exports
export * from './command';

// State Pattern exports
export type { IApplicationState, IApplicationStateContext, IUICallbacks as IStateUICallbacks, IApplicationStateManager } from './state/IApplicationState';
export { ApplicationStateType } from './state/IApplicationState';
export { ApplicationStateManager, BaseApplicationState, IdleState, ValidatingState, CheckingState, CompletedState, ErrorState } from './state';

// Repository Pattern exports
export type { IDomainResultRepository, IQueryHistoryRepository, IQueryStatistics } from './repository/IDomainResultRepository';