import type { IDomainResult } from '../models/IDomainResult';
import type { IQueryService, IServiceConfig } from '../patterns/factory/IServiceFactory';
import { AvailabilityStatus } from '../models/AvailabilityStatus';
import { BaseQueryService } from './BaseQueryService';

/**
 * WHOIS-based domain availability checking service
 * Uses WHOIS queries to get definitive domain registration status
 * Note: This is a placeholder implementation - actual WHOIS integration would require the 'whois' npm package
 */
export class WHOISQueryService extends BaseQueryService implements IQueryService {
  private rateLimitDelay: number = 1000; // 1 second between queries to respect rate limits

  constructor(config?: Partial<IServiceConfig>) {
    super(config);
  }

  /**
   * Get service type identifier
   */
  getServiceType(): 'DNS' | 'WHOIS' | 'HYBRID' {
    return 'WHOIS';
  }

  /**
   * Check domain availability using WHOIS query
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
          return await this.performWHOISQuery(domain);
        });
      });

      const executionTime = Date.now() - startTime;
      return this.createDomainResult(
        domain,
        result.status,
        'WHOIS',
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
        'WHOIS',
        executionTime,
        `WHOIS query failed: ${errorMessage}`,
        retryCount
      );
    }
  }

  /**
   * Perform WHOIS query to check domain registration status
   * Note: This is a mock implementation. Real implementation would use the 'whois' npm package
   */
  private async performWHOISQuery(domain: string): Promise<{ status: AvailabilityStatus; error?: string }> {
    // Apply rate limiting
    await this.sleep(this.rateLimitDelay);

    try {
      // Mock WHOIS query - in real implementation, this would use the 'whois' package
      // For now, we'll simulate different responses based on domain characteristics
      const mockResponse = await this.mockWHOISLookup(domain);
      
      return this.parseWHOISResponse(mockResponse);
    } catch (error) {
      const whoisError = error as Error;
      
      if (whoisError.message.includes('rate limit')) {
        return {
          status: AvailabilityStatus.ERROR,
          error: 'WHOIS rate limit exceeded'
        };
      }
      
      if (whoisError.message.includes('timeout')) {
        return {
          status: AvailabilityStatus.ERROR,
          error: 'WHOIS query timed out'
        };
      }
      
      return {
        status: AvailabilityStatus.ERROR,
        error: `WHOIS query failed: ${whoisError.message}`
      };
    }
  }

  /**
   * Mock WHOIS lookup for demonstration purposes
   * In real implementation, this would be replaced with actual WHOIS library calls
   */
  private async mockWHOISLookup(domain: string): Promise<string> {
    // Simulate network delay
    await this.sleep(Math.random() * 1000 + 500);
    
    // Mock different responses based on domain characteristics
    const { baseDomain } = this.parseDomain(domain);
    
    // Simulate some domains as taken (common words)
    const commonDomains = ['google', 'facebook', 'amazon', 'microsoft', 'apple'];
    if (commonDomains.some(common => baseDomain.toLowerCase().includes(common))) {
      return `Domain Name: ${domain.toUpperCase()}
Registry Domain ID: 123456789_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.registrar.com
Registrar URL: http://www.registrar.com
Updated Date: 2023-01-01T00:00:00Z
Creation Date: 2020-01-01T00:00:00Z
Registry Expiry Date: 2024-01-01T00:00:00Z
Registrar: Example Registrar Inc.
Registrar IANA ID: 123
Domain Status: clientTransferProhibited
Name Server: NS1.EXAMPLE.COM
Name Server: NS2.EXAMPLE.COM`;
    }
    
    // Simulate available domains
    return `No match for "${domain.toUpperCase()}".`;
  }

  /**
   * Parse WHOIS response to determine availability status
   */
  private parseWHOISResponse(response: string): { status: AvailabilityStatus; error?: string } {
    const lowerResponse = response.toLowerCase();
    
    // Check for common "not found" indicators
    const notFoundIndicators = [
      'no match',
      'not found',
      'no data found',
      'domain not found',
      'no entries found',
      'status: available'
    ];
    
    if (notFoundIndicators.some(indicator => lowerResponse.includes(indicator))) {
      return { status: AvailabilityStatus.AVAILABLE };
    }
    
    // Check for registration indicators
    const registeredIndicators = [
      'creation date',
      'registered',
      'registrar:',
      'name server',
      'domain status:',
      'registry domain id'
    ];
    
    if (registeredIndicators.some(indicator => lowerResponse.includes(indicator))) {
      return { status: AvailabilityStatus.TAKEN };
    }
    
    // Check for error conditions
    if (lowerResponse.includes('rate limit') || lowerResponse.includes('quota exceeded')) {
      return {
        status: AvailabilityStatus.ERROR,
        error: 'WHOIS rate limit exceeded'
      };
    }
    
    if (lowerResponse.includes('timeout') || lowerResponse.includes('connection failed')) {
      return {
        status: AvailabilityStatus.ERROR,
        error: 'WHOIS connection failed'
      };
    }
    
    // If we can't determine status, mark as unknown
    return { status: AvailabilityStatus.UNKNOWN };
  }

  /**
   * Set custom rate limit delay
   * @param delayMs - Delay in milliseconds between WHOIS queries
   */
  setRateLimitDelay(delayMs: number): void {
    this.rateLimitDelay = Math.max(delayMs, 100); // Minimum 100ms
  }

  /**
   * Get current rate limit delay
   * @returns Current delay in milliseconds
   */
  getRateLimitDelay(): number {
    return this.rateLimitDelay;
  }
}