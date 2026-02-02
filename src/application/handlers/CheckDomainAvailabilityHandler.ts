import type { ICommandHandler } from '../../patterns/mediator';
import type { CheckDomainAvailabilityCommand } from '../commands/CheckDomainAvailabilityCommand';
import type { IQueryResponse } from '../../models';
import { DomainQueryEngine } from '../../services/DomainQueryEngine';
import { InputValidator } from '../../validators/InputValidator';

/**
 * Handler for domain availability checking command
 * Contains all business logic for domain checking workflow
 */
export class CheckDomainAvailabilityHandler 
  implements ICommandHandler<CheckDomainAvailabilityCommand, IQueryResponse> {
  
  private queryEngine: DomainQueryEngine;
  private validator: InputValidator;

  constructor() {
    this.queryEngine = new DomainQueryEngine();
    this.validator = new InputValidator();
  }

  /**
   * Handle domain availability check command
   */
  async handle(command: CheckDomainAvailabilityCommand): Promise<IQueryResponse> {
    const { baseDomain, tlds } = command;

    // Validate input
    if (!this.validator.validateDomainName(baseDomain).isValid) {
      return {
        success: false,
        queryId: this.generateQueryId(),
        results: [],
        errors: [`Invalid domain format: ${baseDomain}`],
        timestamp: new Date().toISOString()
      };
    }

    try {
      // Execute domain checking logic
      const results = await this.queryEngine.checkMultipleTLDs(baseDomain, tlds);
      
      return {
        success: true,
        queryId: this.generateQueryId(),
        results,
        errors: [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        queryId: this.generateQueryId(),
        results: [],
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        timestamp: new Date().toISOString()
      };
    }
  }

  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}