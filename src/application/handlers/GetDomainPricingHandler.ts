import type { IQueryHandler } from '../../patterns/mediator';
import type { GetDomainPricingQuery, DomainPricing } from '../queries/GetDomainPricingQuery';
import { DomainPricingService } from '../../services/DomainPricingService';

/**
 * Handler for domain pricing query
 * Contains pricing retrieval business logic
 */
export class GetDomainPricingHandler 
  implements IQueryHandler<GetDomainPricingQuery, DomainPricing | null> {
  
  private pricingService: DomainPricingService;

  constructor() {
    this.pricingService = new DomainPricingService();
  }

  /**
   * Handle domain pricing query
   */
  async handle(query: GetDomainPricingQuery): Promise<DomainPricing | null> {
    const pricing = this.pricingService.getDomainPricing(query.domain);
    
    if (!pricing) {
      return null;
    }

    return {
      domain: query.domain,
      tld: this.extractTLD(query.domain),
      registrationPrice: pricing.firstYearPrice,
      renewalPrice: pricing.renewalPrice,
      currency: 'USD',
      isPremium: pricing.isPremium
    };
  }

  private extractTLD(domain: string): string {
    const parts = domain.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  }
}