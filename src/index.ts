/**
 * Domain Availability Checker
 * Main entry point for the application
 */

// Export all models and interfaces
export * from './models';

// Export controller interfaces
export * from './controllers/IDomainController';

// Export pattern interfaces
export * from './patterns';

// Main application interface (to be implemented)
export interface IDomainAvailabilityChecker {
  /**
   * Initialize the application
   * @param containerId - ID of the HTML container element
   */
  initialize(containerId: string): Promise<void>;

  /**
   * Get the domain controller instance
   * @returns Domain controller
   */
  getController(): import('./controllers/IDomainController').IDomainController;

  /**
   * Destroy the application and clean up resources
   */
  destroy(): void;
}

// Version information
export const VERSION = '1.0.0';

// Application metadata
export const APP_INFO = {
  name: 'Domain Availability Checker',
  version: VERSION,
  description: 'A client-side web application that provides real-time domain availability checking across multiple TLDs',
  author: 'Domain Checker Team',
  license: 'MIT'
} as const;