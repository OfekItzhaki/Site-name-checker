import type { IDomainResult } from '../models';
import { AvailabilityStatus } from '../models/AvailabilityStatus';
import { TLDService } from './TLDService';

/**
 * Service for managing domain check results
 * Handles result storage, filtering, and analytics
 */
export class DomainResultService {
  private results: Map<string, IDomainResult> = new Map();
  private tldService: TLDService;

  constructor() {
    this.tldService = new TLDService();
  }

  /**
   * Initialize domain results for a base domain
   */
  initializeDomainResults(baseDomain: string, tlds?: string[]): IDomainResult[] {
    const domains = this.tldService.constructDomains(baseDomain, tlds);
    const results: IDomainResult[] = [];

    for (const domain of domains) {
      const tld = this.tldService.extractTLD(domain) || '';
      
      const result: IDomainResult = {
        domain,
        baseDomain: baseDomain.toLowerCase().trim(),
        tld,
        status: AvailabilityStatus.CHECKING,
        lastChecked: new Date(),
        checkMethod: 'HYBRID' as const,
        retryCount: 0
      };

      results.push(result);
      this.results.set(domain, result);
    }

    return results;
  }

  /**
   * Update a domain result
   */
  updateResult(domain: string, result: IDomainResult): void {
    this.results.set(domain, { ...result });
  }

  /**
   * Get result for a specific domain
   */
  getResult(domain: string): IDomainResult | undefined {
    return this.results.get(domain);
  }

  /**
   * Get all current results
   */
  getAllResults(): IDomainResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Get results filtered by status
   */
  getResultsByStatus(status: AvailabilityStatus): IDomainResult[] {
    return this.getAllResults().filter(result => result.status === status);
  }

  /**
   * Get aggregated results summary
   */
  getResultsSummary(): {
    total: number;
    available: number;
    taken: number;
    checking: number;
    errors: number;
    completed: number;
  } {
    const results = this.getAllResults();
    
    return {
      total: results.length,
      available: results.filter(r => r.status === AvailabilityStatus.AVAILABLE).length,
      taken: results.filter(r => r.status === AvailabilityStatus.TAKEN).length,
      checking: results.filter(r => r.status === AvailabilityStatus.CHECKING).length,
      errors: results.filter(r => r.status === AvailabilityStatus.ERROR).length,
      completed: results.filter(r => r.status !== AvailabilityStatus.CHECKING).length
    };
  }

  /**
   * Check if all domains have been processed
   */
  isComplete(): boolean {
    return this.getAllResults().every(result => result.status !== AvailabilityStatus.CHECKING);
  }

  /**
   * Get domains that failed and can be retried
   */
  getRetryableDomains(maxRetries: number = 3): string[] {
    return this.getAllResults()
      .filter(result => 
        result.status === AvailabilityStatus.ERROR && 
        (result.retryCount || 0) < maxRetries
      )
      .map(result => result.domain);
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): {
    fastestCheckTime: number | null;
    averageCheckTime: number | null;
    successRate: number;
  } {
    const results = this.getAllResults();
    const successfulResults = results.filter(result => 
      result.executionTime !== undefined && 
      result.status !== AvailabilityStatus.ERROR
    );

    let fastestCheckTime: number | null = null;
    let averageCheckTime: number | null = null;

    if (successfulResults.length > 0) {
      const times = successfulResults.map(result => result.executionTime!);
      fastestCheckTime = Math.min(...times);
      averageCheckTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    }

    const successRate = results.length > 0 
      ? (successfulResults.length / results.length) * 100 
      : 0;

    return {
      fastestCheckTime,
      averageCheckTime,
      successRate
    };
  }

  /**
   * Clear all results and reset
   */
  reset(): void {
    this.results.clear();
  }
}