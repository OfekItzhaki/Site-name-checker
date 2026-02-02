/**
 * Performance Analytics for Domain Checker
 * Tracks user interactions and performance metrics
 */

interface AnalyticsEvent {
  event: string;
  timestamp: Date;
  data?: any;
}

interface PerformanceMetrics {
  searchCount: number;
  averageSearchTime: number;
  popularTlds: Map<string, number>;
  errorRate: number;
  totalSearches: number;
  successfulSearches: number;
}

class AnalyticsManager {
  private events: AnalyticsEvent[] = [];
  private metrics: PerformanceMetrics;
  private maxEvents = 100;

  constructor() {
    this.metrics = {
      searchCount: 0,
      averageSearchTime: 0,
      popularTlds: new Map(),
      errorRate: 0,
      totalSearches: 0,
      successfulSearches: 0
    };
  }

  /**
   * Track a search event
   */
  trackSearch(domain: string, executionTime: number, results: any[]): void {
    this.addEvent('domain_search', {
      domain,
      executionTime,
      resultCount: results.length,
      availableCount: results.filter(r => r.status === 'available').length
    });

    this.updateSearchMetrics(executionTime, results);
  }

  /**
   * Track user interaction
   */
  trackInteraction(action: string, data?: any): void {
    this.addEvent('user_interaction', { action, ...data });
  }

  /**
   * Track error events
   */
  trackError(error: string, context?: any): void {
    this.addEvent('error', { error, context });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get popular TLDs
   */
  getPopularTlds(limit: number = 5): Array<{tld: string, count: number}> {
    return Array.from(this.metrics.popularTlds.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tld, count]) => ({ tld, count }));
  }

  /**
   * Export analytics data
   */
  exportData(): string {
    return JSON.stringify({
      metrics: this.metrics,
      events: this.events.slice(-50), // Last 50 events
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  private addEvent(event: string, data?: any): void {
    this.events.push({
      event,
      timestamp: new Date(),
      data
    });

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  private updateSearchMetrics(executionTime: number, results: any[]): void {
    this.metrics.totalSearches++;
    
    const hasErrors = results.some(r => r.status === 'error');
    if (!hasErrors) {
      this.metrics.successfulSearches++;
    }

    // Update average search time
    this.metrics.averageSearchTime = 
      (this.metrics.averageSearchTime * (this.metrics.searchCount) + executionTime) / 
      (this.metrics.searchCount + 1);
    
    this.metrics.searchCount++;

    // Track popular TLDs
    results.forEach(result => {
      if (result.tld) {
        const count = this.metrics.popularTlds.get(result.tld) || 0;
        this.metrics.popularTlds.set(result.tld, count + 1);
      }
    });

    // Update error rate
    this.metrics.errorRate = 
      ((this.metrics.totalSearches - this.metrics.successfulSearches) / 
       this.metrics.totalSearches) * 100;
  }
}

// Export for use in main app
if (typeof window !== 'undefined') {
  (window as any).AnalyticsManager = AnalyticsManager;
}