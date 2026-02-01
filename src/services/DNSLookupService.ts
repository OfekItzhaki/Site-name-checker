import { promises as dns } from 'dns';
import type { IDomainResult } from '../models/IDomainResult';
import type { IQueryService, IServiceConfig } from '../patterns/factory/IServiceFactory';
import { AvailabilityStatus } from '../models/AvailabilityStatus';
import { BaseQueryService } from './BaseQueryService';

/**
 * DNS-based domain availability checking service
 * Uses DNS resolution to determine if a domain has records (indicating it's likely taken)
 */
export class DNSLookupService extends BaseQueryService implements IQueryService {
  constructor(config?: Partial<IServiceConfig>) {
    super(config);
  }

  /**
   * Get service type identifier
   */
  getServiceType(): 'DNS' | 'WHOIS' | 'HYBRID' {
    return 'DNS';
  }

  /**
   * Check domain availability using DNS lookup
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
          return await this.performDNSLookup(domain);
        });
      });

      const executionTime = Date.now() - startTime;
      return this.createDomainResult(
        domain,
        result.status,
        'DNS',
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
        'DNS',
        executionTime,
        `DNS lookup failed: ${errorMessage}`,
        retryCount
      );
    }
  }

  /**
   * Perform DNS lookup to check if domain has records
   */
  private async performDNSLookup(domain: string): Promise<{ status: AvailabilityStatus; error?: string }> {
    try {
      // Try to resolve A records first
      await dns.resolve4(domain);
      return { status: AvailabilityStatus.TAKEN };
    } catch (error) {
      const dnsError = error as NodeJS.ErrnoException;
      
      // Check specific DNS error codes
      switch (dnsError.code) {
        case 'ENOTFOUND':
        case 'ENODATA':
          // Domain doesn't resolve - likely available
          return { status: AvailabilityStatus.AVAILABLE };
        
        case 'ETIMEOUT':
          return { 
            status: AvailabilityStatus.ERROR, 
            error: 'DNS query timed out' 
          };
        
        case 'ESERVFAIL':
          return { 
            status: AvailabilityStatus.ERROR, 
            error: 'DNS server failure' 
          };
        
        case 'EREFUSED':
          return { 
            status: AvailabilityStatus.ERROR, 
            error: 'DNS query refused' 
          };
        
        default:
          // Try AAAA records as fallback
          try {
            await dns.resolve6(domain);
            return { status: AvailabilityStatus.TAKEN };
          } catch (ipv6Error) {
            // Try MX records as final fallback
            try {
              await dns.resolveMx(domain);
              return { status: AvailabilityStatus.TAKEN };
            } catch (mxError) {
              // No records found - likely available
              return { status: AvailabilityStatus.AVAILABLE };
            }
          }
      }
    }
  }

  /**
   * Check if domain is DNS resolvable
   * @param domain - Domain to check
   * @returns True if domain resolves to any records
   */
  async isDNSResolvable(domain: string): Promise<boolean> {
    try {
      const result = await this.performDNSLookup(domain);
      return result.status === AvailabilityStatus.TAKEN;
    } catch {
      return false;
    }
  }
}