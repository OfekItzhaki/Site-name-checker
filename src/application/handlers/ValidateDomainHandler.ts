import type { ICommandHandler } from '../../patterns/mediator';
import type { ValidateDomainCommand } from '../commands/ValidateDomainCommand';
import { InputValidator } from '../../validators/InputValidator';

/**
 * Handler for domain validation command
 * Contains validation business logic
 */
export class ValidateDomainHandler implements ICommandHandler<ValidateDomainCommand, boolean> {
  private validator: InputValidator;

  constructor() {
    this.validator = new InputValidator();
  }

  /**
   * Handle domain validation command
   */
  async handle(command: ValidateDomainCommand): Promise<boolean> {
    const result = this.validator.validateDomainName(command.domain);
    return result.isValid;
  }
}