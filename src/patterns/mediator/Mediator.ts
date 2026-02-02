import type { IMediator, ICommand, IQuery, ICommandHandler, IQueryHandler } from './IMediator';

/**
 * CQRS Mediator implementation
 * Routes commands and queries to their respective handlers
 */
export class Mediator implements IMediator {
  private commandHandlers = new Map<string, ICommandHandler<any, any>>();
  private queryHandlers = new Map<string, IQueryHandler<any, any>>();

  /**
   * Register a command handler
   */
  registerCommand<TCommand extends ICommand<TResult>, TResult>(
    type: string,
    handler: ICommandHandler<TCommand, TResult>
  ): void {
    this.commandHandlers.set(type, handler);
  }

  /**
   * Register a query handler
   */
  registerQuery<TQuery extends IQuery<TResult>, TResult>(
    type: string,
    handler: IQueryHandler<TQuery, TResult>
  ): void {
    this.queryHandlers.set(type, handler);
  }

  /**
   * Send command or query to appropriate handler
   */
  async send<TResult>(request: ICommand<TResult> | IQuery<TResult>): Promise<TResult> {
    const { type } = request;

    // Try command handlers first
    const commandHandler = this.commandHandlers.get(type);
    if (commandHandler) {
      return await commandHandler.handle(request as ICommand<TResult>);
    }

    // Try query handlers
    const queryHandler = this.queryHandlers.get(type);
    if (queryHandler) {
      return await queryHandler.handle(request as IQuery<TResult>);
    }

    throw new Error(`No handler registered for type: ${type}`);
  }
}