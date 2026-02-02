import type { IQuery } from '../../patterns/mediator';

/**
 * Query to get domain pricing information
 */
export interface DomainPricing {
  domain: string;
  tld: string;
  registrationPrice: number;
  renewalPrice: number;
  currency: string;
  isPremium: boolean;
}

export class GetDomainPricingQuery implements IQuery<DomainPricing | null> {
  readonly type = 'GetDomainPricing';

  constructor(public readonly domain: string) {}
}