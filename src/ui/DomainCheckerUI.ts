import { DomainController } from '../controllers/DomainController';
import { AvailabilityStatus } from '../models/AvailabilityStatus';
import type { IDomainResult, IQueryResponse } from '../models';

/**
 * UI Controller for Domain Availability Checker
 * Handles user interactions and DOM manipulation with strict separation from business logic
 * Only contains presentation logic - all business logic is delegated to DomainController
 */
export class DomainCheckerUI {
  private domainController: DomainController;
  private domainForm!: HTMLFormElement;
  private domainInput!: HTMLInputElement;
  private checkButton!: HTMLButtonElement;
  private validationError!: HTMLElement;
  private resultsSection!: HTMLElement;
  private progressIndicator!: HTMLElement;
  private progressFill!: HTMLElement;
  private progressText!: HTMLElement;
  private resultsGrid!: HTMLElement;
  private errorMessage!: HTMLElement;
  private retryButton!: HTMLButtonElement;

  private currentResults: IDomainResult[] = [];
  private failedDomains: string[] = [];

  constructor() {
    this.domainController = new DomainController();
    this.initializeElements();
    this.setupEventListeners();
    this.setupControllerCallbacks();
  }

  /**
   * Initialize DOM elements with proper error handling
   */
  private initializeElements(): void {
    // Form elements
    this.domainForm = this.getElement('#domain-form') as HTMLFormElement;
    this.domainInput = this.getElement('#domain-input') as HTMLInputElement;
    this.checkButton = this.getElement('#check-button') as HTMLButtonElement;
    this.validationError = this.getElement('#validation-error');

    // Results elements
    this.resultsSection = this.getElement('#results-section');
    this.progressIndicator = this.getElement('#progress-indicator');
    this.progressFill = this.getElement('#progress-fill');
    this.progressText = this.getElement('#progress-text');
    this.resultsGrid = this.getElement('#results-grid');
    this.errorMessage = this.getElement('#error-message');
    this.retryButton = this.getElement('#retry-button') as HTMLButtonElement;
  }

  /**
   * Get DOM element with error handling
   */
  private getElement(selector: string): HTMLElement {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    return element;
  }

  /**
   * Set up UI event listeners
   */
  private setupEventListeners(): void {
    // Form submission
    this.domainForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleDomainCheck();
    });

    // Input validation on typing
    this.domainInput.addEventListener('input', () => {
      this.clearValidationError();
    });

    // Retry button
    this.retryButton.addEventListener('click', () => {
      this.handleRetry();
    });

    // Enter key support
    this.domainInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleDomainCheck();
      }
    });
  }

  /**
   * Set up callbacks from domain controller
   */
  private setupControllerCallbacks(): void {
    // State change events
    this.domainController.onStateChange((event) => {
      this.handleStateChange(event.state, event);
    });

    // Progress events
    this.domainController.onProgress((event) => {
      this.handleProgress(event);
    });

    // Error events
    this.domainController.onError((event) => {
      this.handleControllerError(event);
    });
  }

  /**
   * Handle domain availability check
   */
  private async handleDomainCheck(): Promise<void> {
    const domainInput = this.domainInput.value.trim();
    
    if (!domainInput) {
      this.showValidationError('Please enter a domain name');
      return;
    }

    // Clear previous results
    this.clearResults();
    this.clearValidationError();
    
    // Generate domains for all supported TLDs
    const tlds = ['.com', '.net', '.org', '.ai', '.dev', '.io', '.co'];
    const domains = tlds.map(tld => domainInput + tld);

    try {
      // Set loading state
      this.setLoadingState(true);
      this.showResults();
      this.showProgress('Checking domains...', 0);

      // Create placeholder results
      this.createPlaceholderResults(domains);

      // Check domains using controller
      const response = await this.domainController.checkDomains(domains);
      
      // Process results
      this.processQueryResponse(response);
      
    } catch (error) {
      this.handleError('An unexpected error occurred. Please try again.');
      console.error('Domain check error:', error);
    } finally {
      this.setLoadingState(false);
      this.hideProgress();
    }
  }

  /**
   * Handle retry for failed domains
   */
  private async handleRetry(): Promise<void> {
    if (this.failedDomains.length === 0) {
      return;
    }

    try {
      this.setLoadingState(true);
      this.showProgress('Retrying failed domains...', 0);
      
      // Update failed domains to checking state
      this.failedDomains.forEach(domain => {
        this.updateDomainResult(domain, AvailabilityStatus.ERROR, 'Retrying...');
      });

      const response = await this.domainController.checkDomains(this.failedDomains);
      this.processQueryResponse(response);
      
    } catch (error) {
      this.handleError('Retry failed. Please try again.');
      console.error('Retry error:', error);
    } finally {
      this.setLoadingState(false);
      this.hideProgress();
    }
  }

  /**
   * Process query response from controller
   */
  private processQueryResponse(response: IQueryResponse): void {
    // Update successful results
    response.results.forEach(result => {
      this.updateDomainResult(result.domain, result.status, this.getStatusText(result.status));
      
      // Update current results
      const existingIndex = this.currentResults.findIndex(r => r.domain === result.domain);
      if (existingIndex >= 0) {
        this.currentResults[existingIndex] = result;
      } else {
        this.currentResults.push(result);
      }
    });

    // Handle errors
    this.failedDomains = [];
    if (response.errors.length > 0) {
      response.errors.forEach(error => {
        this.updateDomainResult(error.domain, AvailabilityStatus.ERROR, 'Check failed');
        this.failedDomains.push(error.domain);
      });
      
      this.showRetryButton();
    } else {
      this.hideRetryButton();
    }

    // Show summary if there were errors
    if (response.errors.length > 0) {
      const errorCount = response.errors.length;
      const successCount = response.results.length;
      this.showError(`${successCount} domains checked successfully, ${errorCount} failed. Use retry button to check failed domains.`);
    }
  }

  /**
   * Create placeholder results while checking
   */
  private createPlaceholderResults(domains: string[]): void {
    this.resultsGrid.innerHTML = '';
    
    domains.forEach(domain => {
      const resultElement = this.createResultElement(domain, AvailabilityStatus.ERROR, 'Checking...');
      resultElement.classList.add('checking');
      this.resultsGrid.appendChild(resultElement);
    });
  }

  /**
   * Update individual domain result
   */
  private updateDomainResult(domain: string, status: AvailabilityStatus, statusText: string): void {
    const existingElement = this.resultsGrid.querySelector(`[data-domain="${domain}"]`) as HTMLElement;
    
    if (existingElement) {
      // Update existing element
      existingElement.className = `result-item ${this.getStatusClass(status)}`;
      
      const statusElement = existingElement.querySelector('.status') as HTMLElement;
      if (statusElement) {
        statusElement.textContent = statusText;
        statusElement.className = `status ${this.getStatusClass(status)}`;
      }
    } else {
      // Create new element
      const resultElement = this.createResultElement(domain, status, statusText);
      this.resultsGrid.appendChild(resultElement);
    }
  }

  /**
   * Create result element for a domain
   */
  private createResultElement(domain: string, status: AvailabilityStatus, statusText: string): HTMLElement {
    const resultItem = document.createElement('div');
    resultItem.className = `result-item ${this.getStatusClass(status)}`;
    resultItem.setAttribute('data-domain', domain);
    
    resultItem.innerHTML = `
      <span class="domain-name">${domain}</span>
      <span class="status ${this.getStatusClass(status)}">${statusText}</span>
    `;
    
    return resultItem;
  }

  /**
   * Get CSS class for status
   */
  private getStatusClass(status: AvailabilityStatus): string {
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return 'available';
      case AvailabilityStatus.TAKEN:
        return 'taken';
      case AvailabilityStatus.ERROR:
        return 'error';
      default:
        return 'checking';
    }
  }

  /**
   * Get display text for status
   */
  private getStatusText(status: AvailabilityStatus): string {
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return 'Available';
      case AvailabilityStatus.TAKEN:
        return 'Taken';
      case AvailabilityStatus.ERROR:
        return 'Error';
      default:
        return 'Checking...';
    }
  }

  /**
   * Handle state changes from controller
   */
  private handleStateChange(state: string, event: any): void {
    switch (state) {
      case 'validating':
        this.showProgress('Validating input...', 10);
        break;
      case 'checking':
        this.showProgress('Checking domains...', 30);
        break;
      case 'completed':
        this.showProgress('Complete', 100);
        break;
      case 'error':
        this.hideProgress();
        if (event.error) {
          this.handleError(event.error.message || 'An error occurred');
        }
        break;
    }
  }

  /**
   * Handle progress updates
   */
  private handleProgress(event: any): void {
    if (event.progress && typeof event.progress.completed === 'number' && typeof event.progress.total === 'number') {
      const percentage = (event.progress.completed / event.progress.total) * 100;
      this.showProgress(`Checking domains... (${event.progress.completed}/${event.progress.total})`, percentage);
    }
  }

  /**
   * Handle controller errors
   */
  private handleControllerError(event: any): void {
    const message = event.error?.message || 'An unexpected error occurred';
    this.handleError(message);
  }

  /**
   * Show validation error
   */
  private showValidationError(message: string): void {
    this.validationError.textContent = message;
    this.validationError.classList.remove('hidden');
  }

  /**
   * Clear validation error
   */
  private clearValidationError(): void {
    this.validationError.classList.add('hidden');
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.errorMessage.textContent = message;
    this.errorMessage.classList.remove('hidden');
  }

  /**
   * Handle general errors
   */
  private handleError(message: string): void {
    this.showError(message);
    this.setLoadingState(false);
    this.hideProgress();
  }

  /**
   * Show progress indicator
   */
  private showProgress(text: string, percentage: number): void {
    this.progressText.textContent = text;
    this.progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    this.progressIndicator.classList.remove('hidden');
  }

  /**
   * Hide progress indicator
   */
  private hideProgress(): void {
    this.progressIndicator.classList.add('hidden');
  }

  /**
   * Show results section
   */
  private showResults(): void {
    this.resultsSection.classList.remove('hidden');
  }

  /**
   * Clear all results
   */
  private clearResults(): void {
    this.resultsGrid.innerHTML = '';
    this.errorMessage.classList.add('hidden');
    this.currentResults = [];
    this.failedDomains = [];
    this.hideRetryButton();
  }

  /**
   * Show retry button
   */
  private showRetryButton(): void {
    this.retryButton.classList.remove('hidden');
  }

  /**
   * Hide retry button
   */
  private hideRetryButton(): void {
    this.retryButton.classList.add('hidden');
  }

  /**
   * Set loading state for UI elements
   */
  private setLoadingState(loading: boolean): void {
    this.checkButton.disabled = loading;
    this.domainInput.disabled = loading;
    this.retryButton.disabled = loading;
    
    if (loading) {
      this.checkButton.textContent = 'Checking...';
      this.domainForm.classList.add('loading');
    } else {
      this.checkButton.textContent = 'Check Availability';
      this.domainForm.classList.remove('loading');
    }
  }

  /**
   * Get current results for external access
   */
  public getCurrentResults(): IDomainResult[] {
    return [...this.currentResults];
  }

  /**
   * Reset the UI to initial state
   */
  public reset(): void {
    this.domainInput.value = '';
    this.clearValidationError();
    this.clearResults();
    this.resultsSection.classList.add('hidden');
    this.setLoadingState(false);
    this.domainController.reset();
  }

  /**
   * Dispose of resources and clean up
   */
  public dispose(): void {
    this.domainController.dispose();
  }
}