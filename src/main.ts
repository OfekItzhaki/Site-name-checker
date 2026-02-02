import { DomainCheckerUI } from './ui/DomainCheckerUI';

/**
 * Main application entry point
 * Initializes the Domain Availability Checker UI when DOM is ready
 */
class DomainAvailabilityChecker {
  private ui: DomainCheckerUI | null = null;

  /**
   * Initialize the application
   */
  public init(): void {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeUI());
    } else {
      this.initializeUI();
    }
  }

  /**
   * Initialize the UI components
   */
  private initializeUI(): void {
    try {
      this.ui = new DomainCheckerUI();
      console.log('Domain Availability Checker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Domain Availability Checker:', error);
      this.showFallbackError();
    }
  }

  /**
   * Show fallback error message if UI initialization fails
   */
  private showFallbackError(): void {
    const appContainer = document.getElementById('app');
    if (appContainer) {
      appContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #e74c3c;">
          <h2>Application Error</h2>
          <p>Failed to initialize the Domain Availability Checker.</p>
          <p>Please refresh the page and try again.</p>
        </div>
      `;
    }
  }

  /**
   * Dispose of application resources
   */
  public dispose(): void {
    if (this.ui) {
      this.ui.dispose();
      this.ui = null;
    }
  }
}

// Initialize the application
const app = new DomainAvailabilityChecker();
app.init();

// Handle page unload
window.addEventListener('beforeunload', () => {
  app.dispose();
});

// Export for potential external use
export { DomainAvailabilityChecker };