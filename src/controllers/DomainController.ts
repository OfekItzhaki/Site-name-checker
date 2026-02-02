import type { IQueryRequest, IQueryResponse } from '../models';
import { DomainApplicationService } from '../application/DomainApplicationService';
import { CheckDomainAvailabilityCommand } from '../application/commands/CheckDomainAvailabilityCommand';
import { ValidateDomainCommand } from '../application/commands/ValidateDomainCommand';
import { ApplicationStateManager } from '../patterns/state/ApplicationStateManager';
import { ApplicationStateType } from '../patterns/state/IApplicationState';
import { EventBus } from '../patterns/observer/EventBus';
import type { IEventBus } from '../patterns/observer/IEventBus';

/**
 * Simplified Domain Controller - delegates business logic to application layer
 * Focuses on orchestration and state management only
 */
export class DomainController {
  private applicationService: DomainApplicationService;
  private stateManager: ApplicationStateManager;
  private eventBus: IEventBus;

  constructor() {
    this.applicationService = new DomainApplicationService();
    this.stateManager = new ApplicationStateManager();
    this.eventBus = new EventBus();
    this.setupEventListeners();
  }

  /**
   * Check domain availability using CQRS pattern
   */
  async checkDomainAvailability(request: IQueryRequest): Promise<IQueryResponse> {
    const requestId = this.generateRequestId();
    
    try {
      // Transition to validating state
      this.stateManager.transitionTo(ApplicationStateType.VALIDATING);
      this.eventBus.emit('domain.validation.started', { requestId, baseDomain: request.baseDomain });

      // Create and send command via mediator
      const command = new CheckDomainAvailabilityCommand(
        request.baseDomain,
        request.tlds
      );

      const result = await this.applicationService.getMediator().send(command) as IQueryResponse;

      // Transition to appropriate state based on result
      if (result.success) {
        this.stateManager.transitionTo(ApplicationStateType.COMPLETED);
        this.eventBus.emit('domain.check.completed', { requestId, result });
      } else {
        this.stateManager.transitionTo(ApplicationStateType.ERROR);
        this.eventBus.emit('domain.check.failed', { requestId, errors: result.errors });
      }

      return result;
    } catch (error) {
      this.stateManager.transitionTo(ApplicationStateType.ERROR);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.eventBus.emit('domain.check.error', { requestId, error: errorMessage });
      
      return {
        success: false,
        queryId: requestId,
        results: [],
        errors: [errorMessage],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate domain input using CQRS pattern
   */
  async validateDomainInput(domain: string): Promise<boolean> {
    try {
      const command = new ValidateDomainCommand(domain);
      return await this.applicationService.getMediator().send(command);
    } catch (error) {
      console.error('Domain validation error:', error);
      return false;
    }
  }

  /**
   * Get current application state
   */
  getCurrentState() {
    return {
      currentState: this.stateManager.getCurrentState().getStateName(),
      uptime: this.stateManager.getUptime(),
      lastTransition: this.stateManager.getLastTransitionTime()
    };
  }

  /**
   * Setup event listeners for state management
   */
  private setupEventListeners(): void {
    this.eventBus.on('domain.validation.started', () => {
      console.log('Domain validation started');
    });

    this.eventBus.on('domain.check.completed', (data: any) => {
      console.log('Domain check completed:', data.result.results.length, 'results');
    });

    this.eventBus.on('domain.check.failed', (data: any) => {
      console.error('Domain check failed:', data.errors);
    });

    this.eventBus.on('domain.check.error', (data: any) => {
      console.error('Domain check error:', data.error);
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}