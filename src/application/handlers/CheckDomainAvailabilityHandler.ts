import type { ICommandHandler } from '../../patterns/mediator';
import type { CheckDomainAvailabilityCommand } from '../commands/CheckDomainAvailabilityCommand';
import type { IQueryResponse, IDisplayPricing } from '../../models';
import { DomainQueryEngine } from '../../services/DomainQueryEngine';
import { HybridQueryService } from '../../services/HybridQueryService';
import { DomainPricingService } from '../../services/DomainPricingService';
import { InputValidator } from '../../validators/InputValidator';

/**
 * Handler for domain availability checking command
 * Contains all business logic for domain checking workflow
 */
export class CheckDomainAvailabilityHandler 
  implements ICommandHandler<CheckDomainAvailabilityCommand, IQueryResponse> {
  
  private queryEngine: DomainQueryEngine;
  private validator: InputValidator;
  private pricingService: DomainPricingService;

  constructor() {
    this.queryEngine = new DomainQueryEngine();
    this.validator = new InputValidator();
    this.pricingService = new DomainPricingService();
    
    // Initialize query strategy
    const hybridStrategy = new HybridQueryService();
    this.queryEngine.setQueryStrategy(hybridStrategy);
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
      
      // Add pricing information for available domains
      const enrichedResults = results.map(result => {
        if (result.status === 'available') {
          const pricing = this.pricingService.getDomainPricing(result.domain);
          if (pricing) {
            const displayPricing: IDisplayPricing = {
              firstYearPrice: `$${pricing.firstYearPrice}`,
              renewalPrice: `$${pricing.renewalPrice}`,
              registrar: pricing.registrar,
              registrarUrl: pricing.registrarUrl,
              isPremium: pricing.isPremium,
              ...(pricing.notes && { notes: pricing.notes })
            };
            return {
              ...result,
              pricing: displayPricing
            };
          }
        }
        return result;
      });
      
      return {
        success: true,
        queryId: this.generateQueryId(),
        results: enrichedResults,
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