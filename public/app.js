"use strict";
/**
 * Domain Availability Checker - Frontend Client
 * TypeScript browser-compatible application that communicates with the Node.js API
 */
// Enhanced TLD list with more popular extensions
const SUPPORTED_TLDS = [
    '.com', '.net', '.org', '.ai', '.dev', '.io', '.co',
    '.app', '.tech', '.online', '.store', '.shop', '.site',
    '.blog', '.news', '.info', '.biz', '.me', '.tv'
];
class DomainCheckerClient {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3001/api';
        this.currentResults = [];
        this.failedDomains = [];
        this.retryAttempts = new Map();
        this.maxRetryAttempts = 3;
        // Initialize analytics
        this.analytics = new window.AnalyticsManager();
        this.initializeElements();
        this.setupEventListeners();
        this.checkApiHealth();
    }
    initializeElements() {
        // Form elements
        this.domainForm = document.getElementById('domain-form');
        this.domainInput = document.getElementById('domain-input');
        this.checkButton = document.getElementById('check-button');
        this.bulkCheckButton = document.getElementById('bulk-check-button');
        this.validationError = document.getElementById('validation-error');
        // Results elements
        this.resultsSection = document.getElementById('results-section');
        this.progressIndicator = document.getElementById('progress-indicator');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.resultsGrid = document.getElementById('results-grid');
        this.errorMessage = document.getElementById('error-message');
        this.retryButton = document.getElementById('retry-button');
        // API status indicator
        this.createApiStatusIndicator();
    }
    createApiStatusIndicator() {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'api-status';
        statusDiv.className = 'api-status checking';
        statusDiv.innerHTML = `
      <span class="status-dot"></span>
      <span class="status-text">Connecting to API...</span>
    `;
        const header = document.querySelector('.header');
        if (header) {
            header.appendChild(statusDiv);
        }
        this.apiStatus = statusDiv;
    }
    setupEventListeners() {
        // Form submission
        this.domainForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
        // Retry button
        this.retryButton.addEventListener('click', () => {
            this.handleRetry();
        });
        // Real-time validation
        this.domainInput.addEventListener('input', () => {
            this.hideValidationError();
        });
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        // Focus management
        this.domainInput.addEventListener('focus', () => {
            this.domainInput.select();
        });
        // New feature buttons
        this.setupNewFeatureListeners();
    }
    setupNewFeatureListeners() {
        // Bulk check functionality
        this.bulkCheckButton?.addEventListener('click', () => {
            this.toggleBulkMode();
        });
        // Show/hide filters and analytics
        const showFiltersBtn = document.getElementById('show-filters');
        const showAnalyticsBtn = document.getElementById('show-analytics');
        const exportDataBtn = document.getElementById('export-data');
        showFiltersBtn?.addEventListener('click', () => {
            this.toggleFilters();
        });
        showAnalyticsBtn?.addEventListener('click', () => {
            this.toggleAnalytics();
        });
        exportDataBtn?.addEventListener('click', () => {
            this.exportAllData();
        });
    }
    toggleBulkMode() {
        const bulkArea = document.getElementById('bulk-input-area');
        if (bulkArea) {
            bulkArea.classList.toggle('hidden');
            this.bulkCheckButton.textContent = bulkArea.classList.contains('hidden') ? 'Bulk Check' : 'Single Check';
        }
    }
    toggleFilters() {
        const filtersPanel = document.getElementById('advanced-filters');
        const showBtn = document.getElementById('show-filters');
        if (filtersPanel) {
            filtersPanel.classList.toggle('hidden');
            showBtn.textContent = filtersPanel.classList.contains('hidden') ? '🔍 Show Filters' : '🔍 Hide Filters';
        }
    }
    toggleAnalytics() {
        const analyticsPanel = document.getElementById('analytics-panel');
        const showBtn = document.getElementById('show-analytics');
        if (analyticsPanel) {
            analyticsPanel.classList.toggle('hidden');
            showBtn.textContent = analyticsPanel.classList.contains('hidden') ? '📊 Show Analytics' : '📊 Hide Analytics';
            if (!analyticsPanel.classList.contains('hidden')) {
                this.updateAnalyticsDisplay();
            }
        }
    }
    updateAnalyticsDisplay() {
        if (!this.analytics)
            return;
        const metrics = this.analytics.getPerformanceSummary();
        const popularTlds = this.analytics.getPopularTlds(5);
        // Update metric displays
        const totalSearchesEl = document.getElementById('total-searches');
        const avgTimeEl = document.getElementById('avg-search-time');
        const successRateEl = document.getElementById('success-rate');
        const popularTldsEl = document.getElementById('popular-tlds-list');
        if (totalSearchesEl)
            totalSearchesEl.textContent = metrics.totalSearches.toString();
        if (avgTimeEl)
            avgTimeEl.textContent = `${Math.round(metrics.averageSearchTime)}ms`;
        if (successRateEl)
            successRateEl.textContent = `${Math.round(100 - metrics.errorRate)}%`;
        if (popularTldsEl) {
            popularTldsEl.innerHTML = popularTlds
                .map((item) => `<span class="tld-badge">${item.tld} (${item.count})</span>`)
                .join('');
        }
    }
    exportAllData() {
        const exportData = {
            analytics: this.analytics?.exportData() || null,
            currentResults: this.currentResults,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `domain-checker-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.showTemporaryMessage('Data exported successfully!', 'success');
    }
    handleKeyboardShortcuts(e) {
        // Enter key - submit form (if input is focused)
        if (e.key === 'Enter' && document.activeElement === this.domainInput) {
            e.preventDefault();
            this.handleSubmit();
        }
        // Escape key - clear input and results
        if (e.key === 'Escape') {
            this.clearResults();
            this.domainInput.value = '';
            this.domainInput.focus();
        }
        // Ctrl/Cmd + K - focus search input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.domainInput.focus();
        }
    }
    async checkApiHealth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            const health = await response.json();
            if (health.status === 'healthy') {
                this.updateApiStatus('connected', 'API Connected');
            }
            else {
                this.updateApiStatus('error', 'API Error');
            }
        }
        catch (error) {
            console.error('API health check failed:', error);
            this.updateApiStatus('error', 'API Offline');
        }
    }
    updateApiStatus(status, message) {
        this.apiStatus.className = `api-status ${status}`;
        const statusText = this.apiStatus.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = message;
        }
    }
    async handleSubmit() {
        const domain = this.domainInput.value.trim();
        if (!domain) {
            this.showValidationError('Please enter a domain name');
            return;
        }
        // Client-side validation first
        if (!this.isValidDomainFormat(domain)) {
            this.showValidationError('Please enter a valid domain name (letters, numbers, and hyphens only)');
            return;
        }
        this.hideValidationError();
        this.showProgress();
        try {
            // Validate with API
            const validationResponse = await fetch(`${this.apiBaseUrl}/validate-domain`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ domain })
            });
            const validation = await validationResponse.json();
            if (!validation.isValid) {
                this.hideProgress();
                this.showValidationError(validation.message || 'Invalid domain format');
                return;
            }
            // Check domain availability with expanded TLD list
            await this.checkDomainAvailability(domain);
        }
        catch (error) {
            console.error('Domain check failed:', error);
            this.hideProgress();
            this.showError('Failed to check domain availability. Please check your connection and try again.');
        }
    }
    async checkDomainAvailability(baseDomain) {
        try {
            this.updateProgress(10, 'Preparing domain check...');
            const request = {
                baseDomain,
                tlds: SUPPORTED_TLDS,
                options: {
                    concurrent: true,
                    timeout: 10000,
                    retries: 2
                }
            };
            this.updateProgress(20, 'Sending request to API...');
            const response = await fetch(`${this.apiBaseUrl}/check-domain`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request)
            });
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            this.updateProgress(50, 'Processing results...');
            const result = await response.json();
            this.updateProgress(100, 'Complete!');
            setTimeout(() => {
                this.hideProgress();
                this.displayResults(result);
                // Track analytics
                if (this.analytics) {
                    this.analytics.trackSearch(baseDomain, result.executionTime || 0, result.results || []);
                }
            }, 500);
        }
        catch (error) {
            console.error('API request failed:', error);
            this.hideProgress();
            this.showError('Failed to check domain availability. Please try again.');
        }
    }
    isValidDomainFormat(domain) {
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
        return domainRegex.test(domain) && domain.length <= 63;
    }
    showProgress() {
        this.resultsSection.classList.remove('hidden');
        this.progressIndicator.classList.remove('hidden');
        this.resultsGrid.innerHTML = '';
        this.errorMessage.classList.add('hidden');
        this.retryButton.classList.add('hidden');
    }
    updateProgress(percentage, text) {
        this.progressFill.style.width = percentage + '%';
        this.progressText.textContent = text;
    }
    hideProgress() {
        this.progressIndicator.classList.add('hidden');
    }
    displayResults(response) {
        this.currentResults = response.results || [];
        this.resultsGrid.innerHTML = '';
        if (this.currentResults.length === 0) {
            this.showError('No results received from the API');
            return;
        }
        // Display summary
        const summary = this.createSummary(response);
        this.resultsGrid.appendChild(summary);
        // Display individual results
        this.currentResults.forEach(result => {
            const resultCard = this.createResultCard(result);
            this.resultsGrid.appendChild(resultCard);
        });
        // Show retry button if there are errors
        const hasErrors = this.currentResults.some(r => r.status === 'error');
        if (hasErrors) {
            this.retryButton.classList.remove('hidden');
        }
        // Add export functionality
        this.addExportButton(response);
    }
    createSummary(response) {
        const summary = document.createElement('div');
        summary.className = 'results-summary';
        const available = this.currentResults.filter(r => r.status === 'available').length;
        const taken = this.currentResults.filter(r => r.status === 'taken').length;
        const errors = this.currentResults.filter(r => r.status === 'error').length;
        summary.innerHTML = `
      <h3>Summary for "${response.baseDomain || 'domain'}"</h3>
      <div class="summary-stats">
        <span class="stat available">✅ ${available} Available</span>
        <span class="stat taken">❌ ${taken} Taken</span>
        ${errors > 0 ? `<span class="stat error">⚠️ ${errors} Errors</span>` : ''}
      </div>
      <div class="summary-time">
        Completed in ${response.executionTime || 0}ms
      </div>
    `;
        return summary;
    }
    createResultCard(result) {
        const resultCard = document.createElement('div');
        resultCard.className = `result-card ${result.status}`;
        const statusIcon = this.getStatusIcon(result.status);
        const statusText = this.getStatusText(result.status);
        const statusClass = result.status;
        // Build pricing information HTML
        let pricingHtml = '';
        if (result.status === 'available' && result.pricing) {
            const pricing = result.pricing;
            pricingHtml = `
        <div class="pricing-info">
          <div class="price-main">
            <span class="price-label">First Year:</span>
            <span class="price-value ${pricing.isPremium ? 'premium' : ''}">${pricing.firstYearPrice}</span>
          </div>
          <div class="price-renewal">
            <span class="price-label">Renewal:</span>
            <span class="price-value">${pricing.renewalPrice}/year</span>
          </div>
          <div class="registrar-info">
            <span class="registrar-label">Best Price:</span>
            <a href="${pricing.registrarUrl}" target="_blank" class="registrar-link">${pricing.registrar}</a>
          </div>
          ${pricing.isPremium ? '<div class="premium-badge">Premium TLD</div>' : ''}
          ${pricing.notes ? `<div class="pricing-notes">${pricing.notes}</div>` : ''}
        </div>
      `;
        }
        // Copy button for available domains
        const copyButton = result.status === 'available' ?
            `<button class="copy-button" onclick="window.domainChecker.copyToClipboard('${result.domain}')" title="Copy domain name">
        📋 Copy
      </button>` : '';
        resultCard.innerHTML = `
      <div class="domain-name">
        ${result.domain}
        ${copyButton}
      </div>
      <div class="status ${statusClass}">
        <span class="status-icon">${statusIcon}</span>
        <span class="status-text">${statusText}</span>
      </div>
      <div class="details">
        <span class="method">${result.checkMethod || 'API'}</span>
        <span class="time">${result.executionTime || 0}ms</span>
      </div>
      ${pricingHtml}
      ${result.error ? `<div class="error-details">${result.error}</div>` : ''}
    `;
        return resultCard;
    }
    getStatusIcon(status) {
        switch (status) {
            case 'available': return '✅';
            case 'taken': return '❌';
            case 'error': return '⚠️';
            case 'checking': return '🔄';
            default: return '❓';
        }
    }
    getStatusText(status) {
        switch (status) {
            case 'available': return 'Available';
            case 'taken': return 'Taken';
            case 'error': return 'Error';
            case 'checking': return 'Checking';
            default: return 'Unknown';
        }
    }
    // New feature: Copy to clipboard
    async copyToClipboard(domain) {
        try {
            await navigator.clipboard.writeText(domain);
            this.showTemporaryMessage(`Copied "${domain}" to clipboard!`, 'success');
        }
        catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback for older browsers
            this.fallbackCopyToClipboard(domain);
        }
    }
    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            this.showTemporaryMessage(`Copied "${text}" to clipboard!`, 'success');
        }
        catch (error) {
            console.error('Fallback copy failed:', error);
            this.showTemporaryMessage('Copy failed. Please select and copy manually.', 'error');
        }
        document.body.removeChild(textArea);
    }
    // New feature: Export results
    addExportButton(response) {
        const exportButton = document.createElement('button');
        exportButton.className = 'export-button';
        exportButton.innerHTML = '📥 Export Results';
        exportButton.onclick = () => this.exportResults(response);
        const summary = this.resultsGrid.querySelector('.results-summary');
        if (summary) {
            summary.appendChild(exportButton);
        }
    }
    exportResults(response) {
        const exportData = {
            searchTerm: response.baseDomain,
            timestamp: new Date().toISOString(),
            summary: response.summary,
            results: this.currentResults.map(result => ({
                domain: result.domain,
                status: result.status,
                checkMethod: result.checkMethod,
                executionTime: result.executionTime,
                pricing: result.pricing,
                error: result.error
            }))
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `domain-check-${response.baseDomain}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.showTemporaryMessage('Results exported successfully!', 'success');
    }
    showTemporaryMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `temporary-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
      background-color: ${type === 'success' ? '#28a745' : '#dc3545'};
    `;
        document.body.appendChild(messageDiv);
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (document.body.contains(messageDiv)) {
                    document.body.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }
    clearResults() {
        this.resultsSection.classList.add('hidden');
        this.currentResults = [];
        this.failedDomains = [];
        this.retryAttempts.clear();
    }
    showValidationError(message) {
        this.validationError.textContent = message;
        this.validationError.classList.remove('hidden');
    }
    hideValidationError() {
        this.validationError.classList.add('hidden');
    }
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.classList.remove('hidden');
    }
    hideError() {
        this.errorMessage.classList.add('hidden');
    }
    handleRetry() {
        const domain = this.domainInput.value.trim();
        if (domain) {
            this.handleSubmit();
        }
    }
}
// Add CSS animations for temporary messages
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .copy-button {
    margin-left: 10px;
    padding: 4px 8px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: background-color 0.2s;
  }

  .copy-button:hover {
    background-color: #0056b3;
  }

  .export-button {
    margin-top: 10px;
    padding: 8px 16px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }

  .export-button:hover {
    background-color: #218838;
  }

  .domain-name {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
`;
document.head.appendChild(style);
// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.domainChecker = new DomainCheckerClient();
    console.log('Domain Availability Checker Client (TypeScript) initialized successfully');
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                console.log('SW registered: ', registration);
            })
                .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
        });
    }
});
