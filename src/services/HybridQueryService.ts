import type { IDomainResult } from '../models/IDomainResult';
import type { IQueryService, IServiceConfig } from '../patterns/factory/IServiceFactory';
import { AvailabilityStatus } from '../models/AvailabilityStatus';
import { BaseQueryService } from './BaseQueryService';
import { DNSLookupService } from './DNSLookupService';
import { WHOISQueryService } from './WHOISQueryService';

/**
 * Hybrid domain availability checking service
 * Combines DNS and WHOIS queries for optimal speed and accuracy
 * Strategy: DNS first for speed, WHOIS for confirmation when needed
 */
export class HybridQueryService extends BaseQueryService implements IQueryService {
  private dnsService: DNSLookupService;
  private whoisService: WHOISQueryService;

  constructor(config?: Partial<IServiceConfig>) {
    super(config);
    
    // Create DNS and WHOIS services with shared configuration
    this.dnsService = new DNSLookupService(config);
    this.whoisService = new WHOISQueryService(config);
  }

  /**
   * Get service type identifier
   */
  getServiceType(): 'DNS' | 'WHOIS' | 'HYBRID' {
    return 'HYBRID';
  }

  /**
   * Set configuration for all underlying services
   */
  override setConfig(config: Partial<IServiceConfig>): void {
    super.setConfig(config);
    this.dnsService.setConfig(config);
    this.whoisService.setConfig(config);
  }

  /**
   * Check domain availability using hybrid approach
   * @param domain - Full domain name to check
   * @returns Promise resolving to domain result
   */
  async checkDomain(domain: string): Promise<IDomainResult> {
    const startTime = Date.now();
    let retryCount = 0;

    try {
      const result = await this.executeWithRetry(async () => {
        retryCount++;
        return await this.executeWithTimeout(async () => {
          return await this.performHybridQuery(domain);
        });
      });

      const executionTime = Date.now() - startTime;
      return this.createDomainResult(
        domain,
        result.status,
        'HYBRID',
        executionTime,
        result.error,
        retryCount - 1
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return this.createDomainResult(
        domain,
        AvailabilityStatus.ERROR,
        'HYBRID',
        executionTime,
        `Hybrid query failed: ${errorMessage}`,
        retryCount
      );
    }
  }

  /**
   * Perform hybrid query using DNS first, then WHOIS for confirmation
   */
  private async performHybridQuery(domain: string): Promise<{ status: AvailabilityStatus; error?: string }> {
    try {
      // Step 1: Fast DNS check
      const dnsResult = await this.dnsService.checkDomain(domain);
      
      // If DNS shows clear availability, we can trust it for speed
      if (dnsResult.status === AvailabilityStatus.AVAILABLE) {
        return { status: AvailabilityStatus.AVAILABLE };
      }
      
      // If DNS shows domain is taken, confirm with WHOIS for accuracy
      if (dnsResult.status === AvailabilityStatus.TAKEN) {
        try {
          const whoisResult = await this.whoisService.checkDomain(domain);
          
          // WHOIS is more authoritative, so use its result
          if (whoisResult.status === AvailabilityStatus.AVAILABLE || 
              whoisResult.status === AvailabilityStatus.TAKEN) {
            return { status: whoisResult.status };
          }
          
          // If WHOIS is inconclusive, fall back to DNS result
          return { status: dnsResult.status };
        } catch (whoisError) {
          // If WHOIS fails, use DNS result with a note
          return { 
            status: dnsResult.status,
            error: `WHOIS confirmation failed: ${whoisError instanceof Error ? whoisError.message : String(whoisError)}`
          };
        }
      }
      
      // If DNS had an error, try WHOIS as fallback
      if (dnsResult.status === AvailabilityStatus.ERROR) {
        try {
          const whoisResult = await this.whoisService.checkDomain(domain);
          return { status: whoisResult.status };
        } catch (whoisError) {
          return {
            status: AvailabilityStatus.ERROR,
            error: `Both DNS and WHOIS queries failed. DNS: ${dnsResult.error}, WHOIS: ${whoisError instanceof Error ? whoisError.message : String(whoisError)}`
          };
        }
      }
      
      // Default case - return DNS result
      return { status: dnsResult.status };
      
    } catch (error) {
      return {
        status: AvailabilityStatus.ERROR,
        error: `Hybrid query failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get the underlying DNS service
   */
  getDNSService(): DNSLookupService {
    return this.dnsService;
  }

  /**
   * Get the underlying WHOIS service
   */
  getWHOISService(): WHOISQueryService {
    return this.whoisService;
  }

  /**
   * Perform DNS-only check (for testing or fallback)
   */
  async performDNSOnly(domain: string): Promise<IDomainResult> {
    return this.dnsService.checkDomain(domain);
  }

  /**
   * Perform WHOIS-only check (for testing or when DNS is unreliable)
   */
  async performWHOISOnly(domain: string): Promise<IDomainResult> {
    return this.whoisService.checkDomain(domain);
  }

  /**
   * Get query strategy explanation for debugging
   */
  getStrategyExplanation(domain: string): string {
    const { tld } = this.parseDomain(domain);
    const premiumTLDs = ['.ai', '.dev', '.io'];
    
    if (premiumTLDs.includes(tld.toLowerCase())) {
      return 'Using DNS + WHOIS confirmation for premium TLD accuracy';
    }
    
    return 'Using DNS first for speed, WHOIS confirmation if domain appears taken';
  }
}