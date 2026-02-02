"use strict";
/**
 * Performance Analytics for Domain Checker
 * Tracks user interactions and performance metrics
 */
class AnalyticsManager {
    constructor() {
        this.events = [];
        this.maxEvents = 100;
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
    trackSearch(domain, executionTime, results) {
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
    trackInteraction(action, data) {
        this.addEvent('user_interaction', { action, ...data });
    }
    /**
     * Track error events
     */
    trackError(error, context) {
        this.addEvent('error', { error, context });
    }
    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        return { ...this.metrics };
    }
    /**
     * Get popular TLDs
     */
    getPopularTlds(limit = 5) {
        return Array.from(this.metrics.popularTlds.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([tld, count]) => ({ tld, count }));
    }
    /**
     * Export analytics data
     */
    exportData() {
        return JSON.stringify({
            metrics: this.metrics,
            events: this.events.slice(-50), // Last 50 events
            exportedAt: new Date().toISOString()
        }, null, 2);
    }
    addEvent(event, data) {
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
    updateSearchMetrics(executionTime, results) {
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
    window.AnalyticsManager = AnalyticsManager;
}
