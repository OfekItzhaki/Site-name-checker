import type { IDomainResult } from '../models';
import type { IQueryStrategy } from '../patterns/strategy/IQueryStrategy';
import type { ICommand } from '../patterns/command/ICommand';
import { DomainCheckCommand } from '../patterns/command/DomainCheckCommand';
import { BatchDomainCheckCommand, type IBatchDomainCheckResult } from '../patterns/command/BatchDomainCheckCommand';
import { TLDService } from './TLDService';
import { DomainResultService } from './DomainResultService';

/**
 * Simplified Domain Query Engine - orchestrates domain checking workflow
 * Delegates TLD and result management to specialized services
 */
export class DomainQueryEngine {
  private queryStrategy: IQueryStrategy | null = null;
  private tldService: TLDService;
  private resultService: DomainResultService;

  constructor() {
    this.tldService = new TLDService();
    this.resultService = new DomainResultService();
  }

  /**
   * Set the query strategy to use for domain checking
   */
  setQueryStrategy(strategy: IQueryStrategy): void {
    this.queryStrategy = strategy;
  }

  /**
   * Check multiple TLDs for a base domain
   */
  async checkMultipleTLDs(baseDomain: string, tlds?: string[]): Promise<IDomainResult[]> {
    if (!this.queryStrategy) {
      throw new Error('Query strategy must be set before checking domains');
    }

    // Initialize results
    const results = this.resultService.initializeDomainResults(baseDomain, tlds);
    const domains = results.map(r => r.domain);

    // Create and execute batch command
    const batchCommand = this.createBatchCheckCommand(domains);
    const batchResult = await batchCommand.execute();

    // Update results with batch results
    for (const [domain, result] of Object.entries(batchResult.results)) {
      this.resultService.updateResult(domain, result);
    }

    return this.resultService.getAllResults();
  }

  /**
   * Get all supported TLDs
   */
  getSupportedTLDs(): string[] {
    return this.tldService.getSupportedTLDs();
  }

  /**
   * Create a command for checking a single domain
   */
  createDomainCheckCommand(domain: string): ICommand<IDomainResult> {
    if (!this.queryStrategy) {
      throw new Error('Query strategy must be set before creating commands');
    }

    return new DomainCheckCommand(domain, this.queryStrategy);
  }

  /**
   * Create a batch command for checking multiple domains
   */
  createBatchCheckCommand(domains: string[]): ICommand<IBatchDomainCheckResult> {
    if (!this.queryStrategy) {
      throw new Error('Query strategy must be set before creating commands');
    }

    if (!domains || domains.length === 0) {
      throw new Error('Domains array cannot be empty');
    }

    return new BatchDomainCheckCommand(domains, this.queryStrategy);
  }

  /**
   * Get current results
   */
  getAllResults(): IDomainResult[] {
    return this.resultService.getAllResults();
  }

  /**
   * Get results summary
   */
  getResultsSummary() {
    return this.resultService.getResultsSummary();
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics() {
    return this.resultService.getPerformanceAnalytics();
  }

  /**
   * Check if processing is complete
   */
  isComplete(): boolean {
    return this.resultService.isComplete();
  }

  /**
   * Reset the engine
   */
  reset(): void {
    this.resultService.reset();
  }
}