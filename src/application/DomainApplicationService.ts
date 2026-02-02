import { Mediator } from '../patterns/mediator';
import { CheckDomainAvailabilityHandler } from './handlers/CheckDomainAvailabilityHandler';
import { ValidateDomainHandler } from './handlers/ValidateDomainHandler';
import { GetDomainPricingHandler } from './handlers/GetDomainPricingHandler';

/**
 * Application service that coordinates domain-related operations
 * Sets up CQRS mediator with all handlers
 */
export class DomainApplicationService {
  private mediator: Mediator;

  constructor() {
    this.mediator = new Mediator();
    this.registerHandlers();
  }

  /**
   * Get the mediator instance for sending commands/queries
   */
  getMediator(): Mediator {
    return this.mediator;
  }

  /**
   * Register all command and query handlers
   */
  private registerHandlers(): void {
    // Register command handlers
    this.mediator.registerCommand(
      'CheckDomainAvailability',
      new CheckDomainAvailabilityHandler()
    );

    this.mediator.registerCommand(
      'ValidateDomain',
      new ValidateDomainHandler()
    );

    // Register query handlers
    this.mediator.registerQuery(
      'GetDomainPricing',
      new GetDomainPricingHandler()
    );
  }
}