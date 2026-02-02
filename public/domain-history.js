"use strict";
/**
 * Domain Search History Manager
 * Manages session-based domain search history (no persistence)
 */
class DomainHistoryManager {
    constructor() {
        this.history = [];
        this.maxHistorySize = 20;
    }
    /**
     * Add a search to history
     */
    addSearch(domain, results) {
        const entry = {
            domain: domain.toLowerCase(),
            timestamp: new Date(),
            results: {
                available: results.filter((r) => r.status === 'available').length,
                taken: results.filter((r) => r.status === 'taken').length,
                errors: results.filter((r) => r.status === 'error').length
            }
        };
        // Remove duplicate if exists
        this.history = this.history.filter(h => h.domain !== domain);
        // Add to beginning
        this.history.unshift(entry);
        // Limit size
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(0, this.maxHistorySize);
        }
        this.updateHistoryUI();
    }
    /**
     * Get search history
     */
    getHistory() {
        return [...this.history];
    }
    /**
     * Clear all history
     */
    clearHistory() {
        this.history = [];
        this.updateHistoryUI();
    }
    /**
     * Get popular searches (most frequent)
     */
    getPopularSearches(limit = 5) {
        const domainCounts = new Map();
        this.history.forEach(entry => {
            const count = domainCounts.get(entry.domain) || 0;
            domainCounts.set(entry.domain, count + 1);
        });
        return Array.from(domainCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([domain]) => domain);
    }
    /**
     * Update history UI
     */
    updateHistoryUI() {
        const historyContainer = document.getElementById('search-history');
        if (!historyContainer)
            return;
        if (this.history.length === 0) {
            historyContainer.innerHTML = '<p class="no-history">No recent searches</p>';
            return;
        }
        const historyHTML = this.history.slice(0, 5).map(entry => `
      <div class="history-item" data-domain="${entry.domain}">
        <div class="history-domain">${entry.domain}</div>
        <div class="history-meta">
          <span class="history-time">${this.formatTime(entry.timestamp)}</span>
          <span class="history-results">
            ${entry.results.available} available, ${entry.results.taken} taken
          </span>
        </div>
      </div>
    `).join('');
        historyContainer.innerHTML = `
      <div class="history-header">
        <h3>Recent Searches</h3>
        <button class="clear-history-btn" onclick="domainHistory.clearHistory()">Clear</button>
      </div>
      <div class="history-list">
        ${historyHTML}
      </div>
    `;
        // Add click handlers
        historyContainer.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const domain = item.getAttribute('data-domain');
                if (domain) {
                    const domainInput = document.getElementById('domain-input');
                    if (domainInput) {
                        domainInput.value = domain;
                        domainInput.focus();
                    }
                }
            });
        });
    }
    formatTime(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        if (diffMins < 1)
            return 'Just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        return date.toLocaleDateString();
    }
}
// Export for use in main app
if (typeof window !== 'undefined') {
    window.DomainHistoryManager = DomainHistoryManager;
}
