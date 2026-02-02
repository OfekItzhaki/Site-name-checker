/**
 * Mediator pattern interface for CQRS implementation
 * Handles command and query routing with loose coupling
 */

// @ts-ignore TS6133
export interface ICommand<TResult = void> {
  readonly type: string;
}

// @ts-ignore TS6133
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
  send<TResult = void>(request: ICommand<TResult>): Promise<TResult>;
  send<TResult>(request: IQuery<TResult>): Promise<TResult>;
}