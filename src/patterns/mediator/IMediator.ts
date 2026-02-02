/**
 * Mediator pattern interface for CQRS implementation
 * Handles command and query routing with loose coupling
 */

export interface ICommand<TResult = void> {
  readonly type: string;
}

export interface IQuery<TResult> {
  readonly type: string;
}

export interface ICommandHandler<TCommand extends ICommand<TResult>, TResult = void> {
  handle(command: TCommand): Promise<TResult>;
}

export interface IQueryHandler<TQuery extends IQuery<TResult>, TResult> {
  handle(query: TQuery): Promise<TResult>;
}

export interface IMediator {
  send<TResult>(request: ICommand<TResult>): Promise<TResult>;
  send<TResult>(request: IQuery<TResult>): Promise<TResult>;
}